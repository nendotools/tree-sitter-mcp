/**
 * Dead Code Analyzer - Identifies potentially unused code and dependencies
 */

import { BaseAnalyzer } from './base-analyzer.js'
import type { TreeNode, AnalysisResult } from '../../../types/index.js'

/**
 * Analyzes dead code including unused exports, orphaned files, and unused dependencies
 */
export class DeadCodeAnalyzer extends BaseAnalyzer {
  async analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void> {
    const fileNodes = this.getFileNodes(nodes)

    if (fileNodes.length === 0) {
      result.metrics.deadCode = {
        orphanedFiles: 0,
        unusedExports: 0,
        unusedDependencies: 0,
      }
      return
    }

    const orphanedFiles = this.findOrphanedFiles(fileNodes, nodes)
    const unusedExports = this.findUnusedExports(fileNodes, nodes)
    const unusedDependencies = this.findUnusedDependencies(fileNodes)

    result.metrics.deadCode = {
      orphanedFiles: orphanedFiles.length,
      unusedExports: unusedExports.length,
      unusedDependencies: unusedDependencies.length,
    }

    this.addDeadCodeFindings(orphanedFiles, unusedExports, unusedDependencies, result)
  }

  /**
   * Finds files that are never imported or used
   */
  private findOrphanedFiles(fileNodes: TreeNode[], _allNodes: TreeNode[]): string[] {
    const orphanedFiles: string[] = []
    const importedFiles = new Set<string>()
    const entryPoints = new Set<string>()

    for (const fileNode of fileNodes) {
      const fileName = this.getFileNameWithoutExtension(fileNode.path)
      if (['main', 'index', 'app', 'server', 'client', 'cli'].includes(fileName.toLowerCase())
        || fileNode.path.includes('test')
        || fileNode.path.includes('spec')
        || fileNode.path.includes('.config.')
        || fileNode.path.endsWith('.d.ts')
        || fileNode.path.includes('bin/')
        || fileNode.path.includes('scripts/')
        || this.isPackageJsonBinEntry(fileNode.path, fileNodes)) {
        entryPoints.add(fileNode.path)
      }
    }

    for (const fileNode of fileNodes) {
      if (!fileNode.content) continue

      const importMatches = fileNode.content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g)
      if (importMatches) {
        for (const match of importMatches) {
          const importPathMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/)
          if (importPathMatch?.[1]) {
            const resolvedPath = this.resolveImportPath(importPathMatch[1], fileNode.path, fileNodes)
            if (resolvedPath) {
              importedFiles.add(resolvedPath)
            }
          }
        }
      }

      const requireMatches = fileNode.content.match(/require\(['"`]([^'"`]+)['"`]\)/g)
      if (requireMatches) {
        for (const match of requireMatches) {
          const requirePathMatch = match.match(/require\(['"`]([^'"`]+)['"`]\)/)
          if (requirePathMatch?.[1]) {
            const resolvedPath = this.resolveImportPath(requirePathMatch[1], fileNode.path, fileNodes)
            if (resolvedPath) {
              importedFiles.add(resolvedPath)
            }
          }
        }
      }

      const dynamicImportMatches = fileNode.content.match(/import\(['"`]([^'"`]+)['"`]\)/g)
      if (dynamicImportMatches) {
        for (const match of dynamicImportMatches) {
          const dynamicPathMatch = match.match(/import\(['"`]([^'"`]+)['"`]\)/)
          if (dynamicPathMatch?.[1]) {
            const resolvedPath = this.resolveImportPath(dynamicPathMatch[1], fileNode.path, fileNodes)
            if (resolvedPath) {
              importedFiles.add(resolvedPath)
            }
          }
        }
      }
    }

    for (const fileNode of fileNodes) {
      if (!entryPoints.has(fileNode.path) && !importedFiles.has(fileNode.path)) {
        // Skip build output directories and generated files
        if (!this.isBuildOutputOrGenerated(fileNode.path)) {
          orphanedFiles.push(fileNode.path)
        }
      }
    }

    return orphanedFiles
  }

  /**
   * Finds exported functions/variables that are never used
   */
  private findUnusedExports(fileNodes: TreeNode[], _allNodes: TreeNode[]): Array<{
    file: string
    export: string
    type: string
  }> {
    const unusedExports: Array<{ file: string, export: string, type: string }> = []
    const exportUsageMap = new Map<string, Set<string>>()

    for (const fileNode of fileNodes) {
      if (!fileNode.content) continue

      // Skip build output directories and generated files
      if (this.isBuildOutputOrGenerated(fileNode.path)) {
        continue
      }

      const exports = new Set<string>()

      const namedExportMatches = fileNode.content.match(/export\s+(?:const|let|var|function|class|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)
      if (namedExportMatches) {
        for (const match of namedExportMatches) {
          const nameMatch = match.match(/export\s+(?:const|let|var|function|class|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)
          if (nameMatch?.[1]) {
            exports.add(nameMatch[1])
          }
        }
      }

      const exportStatementMatches = fileNode.content.match(/export\s*{\s*([^}]+)\s*}/g)
      if (exportStatementMatches) {
        for (const match of exportStatementMatches) {
          const namesMatch = match.match(/export\s*{\s*([^}]+)\s*}/)
          if (namesMatch?.[1]) {
            const names = namesMatch[1].split(',').map(n => n.trim().split(' as ')[0]?.trim() || '')
            names.forEach(name => exports.add(name))
          }
        }
      }

      exportUsageMap.set(fileNode.path, exports)
    }

    for (const fileNode of fileNodes) {
      if (!fileNode.content) continue

      // Skip build output directories and generated files
      if (this.isBuildOutputOrGenerated(fileNode.path)) {
        continue
      }

      const importMatches = fileNode.content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"`]([^'"`]+)['"`]/g)
      if (importMatches) {
        for (const match of importMatches) {
          const importMatch = match.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"`]([^'"`]+)['"`]/)
          if (importMatch?.[1] && importMatch?.[2]) {
            const importedNames = importMatch[1].split(',').map(n => n.trim().split(' as ')[1]?.trim() || n.trim())
            const fromPath = this.resolveImportPath(importMatch[2], fileNode.path, fileNodes)

            if (fromPath) {
              const exports = exportUsageMap.get(fromPath)
              if (exports) {
                importedNames.forEach(name => exports.delete(name))
              }
            }
          }
        }
      }
    }

    for (const [filePath, remainingExports] of exportUsageMap) {
      for (const exportName of remainingExports) {
        const fileNode = fileNodes.find(f => f.path === filePath)
        if (fileNode?.content && fileNode.content.includes(exportName)) {
          const regex = new RegExp(`\\b${this.escapeRegExp(exportName)}\\b`, 'g')
          const matches = fileNode.content.match(regex)
          if (matches && matches.length > 1) {
            continue
          }
        }

        unusedExports.push({
          file: filePath,
          export: exportName,
          type: 'unknown',
        })
      }
    }

    return unusedExports
  }

  /**
   * Finds dependencies in package.json that might not be used
   */
  private findUnusedDependencies(fileNodes: TreeNode[]): string[] {
    const unusedDependencies: string[] = []

    const packageJsonFile = fileNodes.find(f => f.path.endsWith('package.json'))
    if (!packageJsonFile?.content) {
      return unusedDependencies
    }

    try {
      const packageJson = JSON.parse(packageJsonFile.content)
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      for (const depName of Object.keys(dependencies)) {
        let isUsed = false

        for (const fileNode of fileNodes) {
          if (!fileNode.content) continue

          const importRegex = new RegExp(`['"\`]${this.escapeRegExp(depName)}['"\`]`, 'g')
          if (importRegex.test(fileNode.content)) {
            isUsed = true
            break
          }
        }

        if (!isUsed) {
          unusedDependencies.push(depName)
        }
      }
    }
    catch {
      // Ignore JSON parsing errors for package.json
    }

    return unusedDependencies
  }

  /**
   * Resolves import path to actual file path
   */
  private resolveImportPath(
    importPath: string,
    currentFile: string,
    fileNodes: TreeNode[],
  ): string | null {
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null
    }

    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'))
    let resolved: string

    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const parts = currentDir.split('/')
      const importParts = importPath.split('/')

      for (const part of importParts) {
        if (part === '..') {
          parts.pop()
        }
        else if (part !== '.') {
          parts.push(part)
        }
      }

      resolved = parts.join('/')
    }
    else {
      resolved = importPath
    }

    const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '/index.js', '/index.ts']

    for (const ext of extensions) {
      const candidate = resolved + ext
      if (fileNodes.some(node => node.path === candidate)) {
        return candidate
      }
    }

    return null
  }

  /**
   * Checks if a file is a package.json bin entry
   */
  private isPackageJsonBinEntry(filePath: string, fileNodes: TreeNode[]): boolean {
    const packageJsonFile = fileNodes.find(node =>
      node.path.endsWith('package.json') && !node.path.includes('node_modules'),
    )

    if (!packageJsonFile?.content) return false

    try {
      const packageJson = JSON.parse(packageJsonFile.content)
      if (packageJson.bin) {
        if (typeof packageJson.bin === 'string') {
          return filePath.endsWith(packageJson.bin) || filePath.includes(packageJson.bin)
        }
        if (typeof packageJson.bin === 'object') {
          return Object.values(packageJson.bin).some((binPath: any) =>
            filePath.endsWith(binPath) || filePath.includes(binPath),
          )
        }
      }
    }
    catch {
      // Ignore JSON parse errors
    }

    return false
  }

  /**
   * Checks if a file path represents build output or generated files that should be ignored
   */
  private isBuildOutputOrGenerated(filePath: string): boolean {
    const buildOutputPatterns = [
      // JavaScript/TypeScript build outputs
      '.output/',
      'dist/',
      'build/',
      '.next/',
      '.nuxt/',
      '_nuxt/',
      '.vite/',
      '.vercel/',
      '.netlify/',

      // Package manager outputs
      'node_modules/',
      '.pnpm/',
      '.yarn/',

      // Generated files
      '.generated/',
      '.cache/',
      '.temp/',
      '.tmp/',
      'coverage/',

      // Common generated file extensions
      '.map',
      '.tsbuildinfo',

      // Generated API/documentation files
      'api-docs/bruno.json',
      'api-docs/environments/',

      // Environment and config files that are typically not imported
      '.env',
      '.env.local',
      '.env.production',
      '.env.development',

      // Framework-specific files that are auto-imported or used conventionally
      'components.json', // Nuxt/Vue component definitions
      'nuxt.config.',
      'tailwind.config.',
      'vite.config.',
      'webpack.config.',
      'postcss.config.',
      'eslint.config.',

      // Package manager files
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',

      // IDE/Editor files
      '.vscode/',
      '.idea/',
      '.claude/',

      // Git files
      '.git/',

      // OS files
      '.DS_Store',
      'Thumbs.db',
    ]

    return buildOutputPatterns.some((pattern) => {
      if (pattern.endsWith('/')) {
        return filePath.includes(pattern)
      }
      else {
        return filePath.endsWith(pattern) || filePath.includes(`/${pattern}`)
      }
    })
  }

  /**
   * Adds dead code findings to the result
   */
  private addDeadCodeFindings(
    orphanedFiles: string[],
    unusedExports: Array<{ file: string, export: string, type: string }>,
    unusedDependencies: string[],
    result: AnalysisResult,
  ): void {
    for (const file of orphanedFiles) {
      this.addFinding(result, {
        type: 'deadcode',
        category: 'orphaned_file',
        severity: 'warning',
        location: file,
        description: 'File appears to be unused (not imported anywhere)',
        context: 'Consider removing unused files or ensuring they are properly referenced',
      })
    }

    for (const { file, export: exportName } of unusedExports) {
      this.addFinding(result, {
        type: 'deadcode',
        category: 'unused_export',
        severity: 'info',
        location: file,
        description: `Exported symbol '${exportName}' appears to be unused`,
        context: 'Consider removing unused exports to reduce bundle size',
      })
    }

    for (const dep of unusedDependencies) {
      this.addFinding(result, {
        type: 'deadcode',
        category: 'unused_dependency',
        severity: 'info',
        location: 'package.json',
        description: `Dependency '${dep}' appears to be unused`,
        context: 'Consider removing unused dependencies to reduce bundle size and security surface',
      })
    }
  }
}