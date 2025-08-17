/**
 * JavaScript/TypeScript specific dead code analysis
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { LanguageEntryPoints, UsageAnalysisResult, ImportInfo } from '../types.js'
import { BaseLanguageAnalyzer } from './base-language-analyzer.js'
import { shouldSkipLargeFile, getFileSizeLimit, logLargeFileSkip } from '../../../../../utils/file-size-utils.js'

const JAVASCRIPT_ENTRY_POINTS: LanguageEntryPoints = {
  patterns: ['index', 'main', 'app', 'server', 'cli', 'entry'],
  contentChecks: ['require.main === module', 'process.argv', 'import.meta.main'],
  packageFields: ['main', 'module', 'browser', 'bin', 'exports', 'types'],
  configFiles: ['vite.config.js', 'vite.config.ts', 'webpack.config.js', 'webpack.config.ts', 'tsconfig.json'],
}

export class JavaScriptAnalyzer extends BaseLanguageAnalyzer {
  constructor() {
    super('javascript', JAVASCRIPT_ENTRY_POINTS)
  }

  analyzeUsage(fileNodes: TreeNode[]): UsageAnalysisResult {
    const usedFiles = new Set<string>()
    const entryPoints = this.detectEntryPoints(fileNodes)
    const importMap = new Map<string, string[]>()
    const exports = new Map<string, string[]>()

    // Filter to only JS/TS files to avoid processing all files
    const jsFiles = fileNodes.filter(node => this.isLanguageFile(node.path) && node.content)

    for (const fileNode of jsFiles) {
      if (!fileNode.content) continue

      // Skip very large files to prevent timeout
      const maxSize = getFileSizeLimit('deadcode')
      if (shouldSkipLargeFile(fileNode.content, maxSize)) {
        logLargeFileSkip(fileNode.path, fileNode.content.length, maxSize)
        continue
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

      // Extract exports
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
    return /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filePath)
  }

  protected getFileExtensions(): string[] {
    return ['', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '/index.js', '/index.ts']
  }

  private extractImports(content: string, filePath: string, fileNodes: TreeNode[]): ImportInfo[] {
    const imports: ImportInfo[] = []

    // ES6 named imports: import { foo, bar } from './module'
    const namedImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"`]([^'"`]+)['"`]/g
    let match = namedImportRegex.exec(content)
    while (match) {
      const importNames = match[1]?.split(',').map(name => name.trim().split(' as ')[0]?.trim() || '') || []
      const sourcePath = this.resolveImportPath(match[2] || '', filePath, fileNodes)
      if (sourcePath) {
        imports.push({
          source: sourcePath,
          imports: importNames,
          type: 'named',
          filePath,
        })
      }
      match = namedImportRegex.exec(content)
    }

    // ES6 default imports: import foo from './module'
    const defaultImportRegex = /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"`]([^'"`]+)['"`]/g
    match = defaultImportRegex.exec(content)
    while (match) {
      const sourcePath = this.resolveImportPath(match[2] || '', filePath, fileNodes)
      if (sourcePath) {
        imports.push({
          source: sourcePath,
          imports: [match[1] || ''],
          type: 'default',
          filePath,
        })
      }
      match = defaultImportRegex.exec(content)
    }

    // ES6 namespace imports: import * as foo from './module'
    const namespaceImportRegex = /import\s+\*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"`]([^'"`]+)['"`]/g
    match = namespaceImportRegex.exec(content)
    while (match) {
      const sourcePath = this.resolveImportPath(match[2] || '', filePath, fileNodes)
      if (sourcePath) {
        imports.push({
          source: sourcePath,
          imports: [match[1] || ''],
          type: 'namespace',
          filePath,
        })
      }
      match = namespaceImportRegex.exec(content)
    }

    // Dynamic imports: import('./module')
    const dynamicImportRegex = /import\(['"`]([^'"`]+)['"`]\)/g
    match = dynamicImportRegex.exec(content)
    while (match) {
      const sourcePath = this.resolveImportPath(match[1] || '', filePath, fileNodes)
      if (sourcePath) {
        imports.push({
          source: sourcePath,
          imports: [],
          type: 'dynamic',
          filePath,
        })
      }
      match = dynamicImportRegex.exec(content)
    }

    // CommonJS require
    const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g
    match = requireRegex.exec(content)
    while (match) {
      const sourcePath = this.resolveImportPath(match[1] || '', filePath, fileNodes)
      if (sourcePath) {
        imports.push({
          source: sourcePath,
          imports: [],
          type: 'default',
          filePath,
        })
      }
      match = requireRegex.exec(content)
    }

    return imports
  }

  private extractExports(content: string): string[] {
    const exports: string[] = []

    // Named exports: export const foo = ...
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    let match = namedExportRegex.exec(content)
    while (match) {
      if (match[1]) {
        exports.push(match[1])
      }
      match = namedExportRegex.exec(content)
    }

    // Export statements: export { foo, bar }
    const exportStatementRegex = /export\s*{\s*([^}]+)\s*}/g
    match = exportStatementRegex.exec(content)
    while (match) {
      if (match[1]) {
        const names = match[1].split(',').map(name => name.trim().split(' as ')[0]?.trim() || '')
        exports.push(...names.filter(Boolean))
      }
      match = exportStatementRegex.exec(content)
    }

    // Default export
    if (/export\s+default\s/.test(content)) {
      exports.push('default')
    }

    return exports
  }
}