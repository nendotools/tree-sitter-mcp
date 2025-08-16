/**
 * Python specific dead code analysis
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { LanguageEntryPoints, UsageAnalysisResult, ImportInfo } from '../types.js'
import { BaseLanguageAnalyzer } from './base-language-analyzer.js'
import { shouldSkipLargeFile, getFileSizeLimit, logLargeFileSkip } from '../../../../../utils/file-size-utils.js'

const PYTHON_ENTRY_POINTS: LanguageEntryPoints = {
  patterns: ['__main__', 'main', 'app', 'manage', 'run', 'cli'],
  contentChecks: ['if __name__ == "__main__":', 'def main()', 'sys.argv', 'click.command', 'argparse.ArgumentParser'],
  packageFields: ['scripts', 'entry-points'],
  configFiles: ['pyproject.toml', 'setup.py', 'setup.cfg', 'requirements.txt'],
}

export class PythonAnalyzer extends BaseLanguageAnalyzer {
  constructor() {
    super('python', PYTHON_ENTRY_POINTS)
  }

  analyzeUsage(fileNodes: TreeNode[]): UsageAnalysisResult {
    const usedFiles = new Set<string>()
    const entryPoints = this.detectEntryPoints(fileNodes)
    const importMap = new Map<string, string[]>()
    const exports = new Map<string, string[]>()

    // Filter to only Python files to avoid processing all files
    const pythonFiles = fileNodes.filter(node => this.isLanguageFile(node.path) && node.content)
    console.log(`  🐍 PythonAnalyzer processing ${pythonFiles.length} Python files`)

    for (const fileNode of pythonFiles) {
      if (!fileNode.content) continue

      // Skip very large files to prevent timeout
      const maxSize = getFileSizeLimit('deadcode')
      if (shouldSkipLargeFile(fileNode.content, maxSize)) {
        logLargeFileSkip(fileNode.path, fileNode.content.length, maxSize)
        continue
      }

      // Python __init__.py files are always entry points
      if (fileNode.path.endsWith('__init__.py')) {
        entryPoints.add(fileNode.path)
      }

      // Extract imports
      const imports = this.extractImports(fileNode.content, fileNode.path, fileNodes)
      const importPaths = imports.map(imp => imp.source).filter(Boolean)
      if (importPaths.length > 0) {
        importMap.set(fileNode.path, importPaths)
      }

      // Mark imported files as used
      imports.forEach((imp) => {
        if (imp.source) {
          usedFiles.add(imp.source)
        }
      })

      // Extract exports (functions and classes defined at module level)
      const fileExports = this.extractExports(fileNode.content)
      if (fileExports.length > 0) {
        exports.set(fileNode.path, fileExports)
      }
    }

    // Mark entry points as used
    entryPoints.forEach(entry => usedFiles.add(entry))

    return {
      usedFiles,
      entryPoints,
      importMap,
      exports,
    }
  }

  protected isLanguageFile(filePath: string): boolean {
    return filePath.endsWith('.py')
  }

  protected getFileExtensions(): string[] {
    return ['', '.py', '/__init__.py']
  }

  private extractImports(content: string, filePath: string, fileNodes: TreeNode[]): ImportInfo[] {
    const imports: ImportInfo[] = []

    // Standard imports: import module
    const standardImportRegex = /^import\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gm
    let match = standardImportRegex.exec(content)
    while (match) {
      const modulePath = this.pythonModuleToPath(match[1] || '', filePath, fileNodes)
      if (modulePath) {
        imports.push({
          source: modulePath,
          imports: [match[1] || ''],
          type: 'default',
          filePath,
        })
      }
      match = standardImportRegex.exec(content)
    }

    // From imports: from module import item1, item2
    const fromImportRegex = /^from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import\s+([^#\n]+)/gm
    match = fromImportRegex.exec(content)
    while (match) {
      const modulePath = this.pythonModuleToPath(match[1] || '', filePath, fileNodes)
      if (modulePath) {
        const importNames = (match[2] || '').split(',').map(name => name.trim().split(' as ')[0]?.trim() || '')
        imports.push({
          source: modulePath,
          imports: importNames,
          type: 'named',
          filePath,
        })
      }
      match = fromImportRegex.exec(content)
    }

    // Relative imports: from .module import item
    const relativeImportRegex = /^from\s+(\.+[a-zA-Z_][a-zA-Z0-9_.]*)\s+import\s+([^#\n]+)/gm
    match = relativeImportRegex.exec(content)
    while (match) {
      const modulePath = this.pythonRelativeModuleToPath(match[1] || '', filePath, fileNodes)
      if (modulePath) {
        const importNames = (match[2] || '').split(',').map(name => name.trim().split(' as ')[0]?.trim() || '')
        imports.push({
          source: modulePath,
          imports: importNames,
          type: 'named',
          filePath,
        })
      }
      match = relativeImportRegex.exec(content)
    }

    return imports
  }

  private extractExports(content: string): string[] {
    const exports: string[] = []

    // Function definitions
    const functionRegex = /^def\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm
    let match = functionRegex.exec(content)
    while (match) {
      if (match[1] && !match[1].startsWith('_')) {
        exports.push(match[1])
      }
      match = functionRegex.exec(content)
    }

    // Class definitions
    const classRegex = /^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm
    match = classRegex.exec(content)
    while (match) {
      if (match[1] && !match[1].startsWith('_')) {
        exports.push(match[1])
      }
      match = classRegex.exec(content)
    }

    // Variable assignments at module level (basic detection)
    const variableRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm
    match = variableRegex.exec(content)
    while (match) {
      if (match[1] && !match[1].startsWith('_') && match[1] === match[1].toUpperCase()) {
        // Only include CONSTANT_STYLE variables
        exports.push(match[1])
      }
      match = variableRegex.exec(content)
    }

    return exports
  }

  private pythonModuleToPath(moduleName: string, currentFile: string, fileNodes: TreeNode[]): string | null {
    // For relative imports within the same project
    if (moduleName.startsWith('.')) {
      return this.pythonRelativeModuleToPath(moduleName, currentFile, fileNodes)
    }

    // Convert module.submodule to module/submodule.py
    const modulePath = moduleName.replace(/\./g, '/')
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'))

    // Try different possibilities
    const candidates = [
      `${currentDir}/${modulePath}.py`,
      `${currentDir}/${modulePath}/__init__.py`,
      `${modulePath}.py`,
      `${modulePath}/__init__.py`,
    ]

    for (const candidate of candidates) {
      if (fileNodes.some(node => node.path === candidate)) {
        return candidate
      }
    }

    return null
  }

  private pythonRelativeModuleToPath(moduleName: string, currentFile: string, fileNodes: TreeNode[]): string | null {
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'))
    const parts = currentDir.split('/')

    // Count leading dots
    let dotCount = 0
    while (dotCount < moduleName.length && moduleName[dotCount] === '.') {
      dotCount++
    }

    // Go up directories based on dot count
    for (let i = 0; i < dotCount - 1; i++) {
      parts.pop()
    }

    // Add module path
    const moduleNameWithoutDots = moduleName.substring(dotCount)
    if (moduleNameWithoutDots) {
      const modulePath = moduleNameWithoutDots.replace(/\./g, '/')
      parts.push(modulePath)
    }

    const basePath = parts.join('/')
    const candidates = [
      `${basePath}.py`,
      `${basePath}/__init__.py`,
    ]

    for (const candidate of candidates) {
      if (fileNodes.some(node => node.path === candidate)) {
        return candidate
      }
    }

    return null
  }
}