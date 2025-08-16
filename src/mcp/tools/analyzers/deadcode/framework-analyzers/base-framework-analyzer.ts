/**
 * Base class for framework-specific dead code analysis
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { FrameworkConfig, FrameworkUsageContext } from '../types.js'

export abstract class BaseFrameworkAnalyzer {
  protected readonly config: FrameworkConfig

  constructor(config: FrameworkConfig) {
    this.config = config
  }

  /**
   * Detects if this framework is being used in the project
   */
  isFrameworkDetected(fileNodes: TreeNode[]): boolean {
    return this.config.indicators.some(indicator =>
      fileNodes.some(node =>
        node.path.endsWith(indicator)
        || node.path.includes(`/${indicator}`),
      ),
    )
  }

  /**
   * Gets framework usage context for the project
   */
  getUsageContext(): FrameworkUsageContext {
    return {
      framework: this.config.name,
      buildTool: this.config.buildTool,
      routingSystem: this.config.routingSystem,
      conventionDirs: this.config.conventionDirs,
    }
  }

  /**
   * Detects framework-specific entry points
   */
  detectFrameworkEntryPoints(fileNodes: TreeNode[]): Set<string> {
    const entryPoints = new Set<string>()

    for (const pattern of this.config.entryPatterns) {
      for (const fileNode of fileNodes) {
        if (this.matchesEntryPattern(fileNode.path, pattern)) {
          entryPoints.add(fileNode.path)
        }
      }
    }

    return entryPoints
  }

  /**
   * Analyzes framework-specific file usage patterns
   */
  abstract detectUsage(fileNodes: TreeNode[], context: FrameworkUsageContext): Set<string>

  /**
   * Checks if a file path matches a framework entry pattern
   */
  protected matchesEntryPattern(filePath: string, pattern: string): boolean {
    // Handle exact matches
    if (filePath.endsWith(pattern)) {
      return true
    }

    // Handle directory patterns
    if (pattern.includes('/')) {
      return filePath.includes(`/${pattern}`) || filePath.includes(pattern)
    }

    // Handle file name patterns with extensions
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte']
    return extensions.some(ext =>
      filePath.endsWith(`${pattern}${ext}`)
      || filePath.includes(`/${pattern}${ext}`),
    )
  }

  /**
   * Checks if a file is in a framework convention directory
   */
  protected isInConventionDirectory(filePath: string): boolean {
    return this.config.conventionDirs.some(dir =>
      filePath.includes(`/${dir}/`)
      || filePath.startsWith(`${dir}/`),
    )
  }

  /**
   * Extracts dynamic imports from content
   */
  protected extractDynamicImports(content: string): string[] {
    const imports: string[] = []

    // Dynamic imports: import('./component')
    const dynamicImportRegex = /import\(['"`]([^'"`]+)['"`]\)/g
    let match = dynamicImportRegex.exec(content)
    while (match) {
      if (match[1]) {
        imports.push(match[1])
      }
      match = dynamicImportRegex.exec(content)
    }

    // Lazy imports: lazy(() => import('./component'))
    const lazyImportRegex = /lazy\(\s*\(\)\s*=>\s*import\(['"`]([^'"`]+)['"`]\)/g
    match = lazyImportRegex.exec(content)
    while (match) {
      if (match[1]) {
        imports.push(match[1])
      }
      match = lazyImportRegex.exec(content)
    }

    return imports
  }

  /**
   * Resolves import path to actual file path
   */
  protected resolveImportPath(importPath: string, currentFile: string): string | null {
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

    return resolved
  }
}