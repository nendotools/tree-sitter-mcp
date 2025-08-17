/**
 * Barrel Export Analyzer - Detects and analyzes barrel export patterns
 *
 * Barrel exports are common in component libraries (like shadcn) where:
 * - index.ts files re-export components from the same directory
 * - Components appear "used" due to barrel imports but aren't actually used by application code
 * - Need to distinguish between internal barrel dependencies vs external usage
 */

import type { TreeNode } from '../../../../types/index.js'

/**
 * Represents a barrel export group (barrel file + its exported components)
 */
export interface BarrelGroup {
  /** The barrel file (typically index.ts) */
  barrelFile: string
  /** Components exported by the barrel */
  exportedComponents: string[]
  /** Directory containing the barrel and components */
  directory: string
  /** Pattern that identifies this as a barrel (e.g., 'shadcn', 'generic') */
  pattern: string
  /** Whether this barrel group has external usage */
  hasExternalUsage: boolean
}

/**
 * Configuration for barrel detection patterns
 */
export interface BarrelDetectionConfig {
  /** File name patterns that indicate barrel files */
  barrelFileNames: string[]
  /** Directory patterns to look for barrel exports in */
  directoryPatterns: string[]
  /** Minimum number of exports to qualify as a barrel */
  minExports: number
  /** Whether to include subdirectories in barrel detection */
  includeSubdirectories: boolean
}

/**
 * Analyzes barrel export patterns and their usage
 */
export class BarrelExportAnalyzer {
  private config: BarrelDetectionConfig

  constructor(config?: Partial<BarrelDetectionConfig>) {
    this.config = {
      barrelFileNames: ['index.ts', 'index.js', 'index.tsx', 'index.jsx'],
      directoryPatterns: [
        'components/ui/', // UI component libraries (shadcn, etc.)
        'components/base/', // Base component libraries
        'lib/components/', // Library components
        'ui/', // Generic UI libraries
        'widgets/', // Widget libraries
        'hooks/', // Custom hooks
        'utils/', // Utility modules
      ],
      minExports: 1,
      includeSubdirectories: true,
      ...config,
    }
  }

  /**
   * Analyzes file nodes to identify barrel export groups
   */
  analyzeBarrelGroups(fileNodes: TreeNode[]): BarrelGroup[] {
    const barrelGroups: BarrelGroup[] = []
    const potentialBarrels = this.identifyPotentialBarrels(fileNodes)

    for (const barrel of potentialBarrels) {
      const group = this.analyzeBarrelGroup(barrel, fileNodes)
      if (group) {
        barrelGroups.push(group)
      }
    }

    return barrelGroups
  }

  /**
   * Determines which barrel groups have external usage beyond their internal dependencies
   */
  analyzeExternalUsage(
    barrelGroups: BarrelGroup[],
    fileNodes: TreeNode[],
    reachableFiles: Set<string>,
  ): void {
    for (const group of barrelGroups) {
      group.hasExternalUsage = this.hasExternalUsagePattern(group, fileNodes, reachableFiles)
    }
  }

  /**
   * Gets unused barrel groups (barrels + components with no external usage)
   */
  getUnusedBarrelGroups(barrelGroups: BarrelGroup[]): BarrelGroup[] {
    return barrelGroups.filter(group => !group.hasExternalUsage)
  }

  /**
   * Identifies potential barrel files based on naming and location patterns
   */
  private identifyPotentialBarrels(fileNodes: TreeNode[]): TreeNode[] {
    return fileNodes.filter((node) => {
      // Check if filename matches barrel patterns
      const fileName = this.getFileName(node.path)
      if (!this.config.barrelFileNames.includes(fileName)) {
        return false
      }

      // Check if located in a directory that commonly contains barrels
      return this.config.directoryPatterns.some(pattern =>
        node.path.includes(pattern),
      )
    })
  }

  /**
   * Analyzes a specific barrel file to create a BarrelGroup
   */
  private analyzeBarrelGroup(barrelNode: TreeNode, fileNodes: TreeNode[]): BarrelGroup | null {
    const directory = this.getDirectory(barrelNode.path)
    const exports = this.getBarrelExports(barrelNode)

    // For component library patterns, allow even empty exports and standalone barrels
    const isComponentLibraryPattern = this.isComponentLibraryPattern(directory)

    if (exports.length < this.config.minExports && !isComponentLibraryPattern) {
      return null
    }

    // Find components in the same directory that are exported by this barrel
    const exportedComponents = this.findExportedComponents(directory, exports, fileNodes)

    // For component library patterns, also consider standalone barrel files (index.ts only)
    if (exportedComponents.length === 0 && !isComponentLibraryPattern) {
      return null
    }

    return {
      barrelFile: barrelNode.path,
      exportedComponents,
      directory,
      pattern: this.detectPattern(barrelNode.path),
      hasExternalUsage: false, // Will be determined later
    }
  }

  /**
   * Extracts export statements from a barrel file
   */
  private getBarrelExports(barrelNode: TreeNode): string[] {
    const exports: string[] = []

    // Get exports from TreeNode.exports (populated by tree-sitter)
    if (barrelNode.exports) {
      exports.push(...barrelNode.exports)
    }

    // Also check imports that are re-exported (export { ... } from './file')
    if (barrelNode.imports) {
      // For barrel files, imports often indicate re-exports
      // We'll need to cross-reference with file content to be more accurate
      exports.push(...barrelNode.imports.filter(imp => imp.startsWith('./')))
    }

    return exports
  }

  /**
   * Finds component files in the same directory that are exported by the barrel
   */
  private findExportedComponents(directory: string, exports: string[], fileNodes: TreeNode[]): string[] {
    const components: string[] = []

    for (const node of fileNodes) {
      // Skip the barrel file itself
      if (this.getFileName(node.path) === 'index.ts'
        || this.getFileName(node.path) === 'index.js'
        || this.getFileName(node.path) === 'index.tsx'
        || this.getFileName(node.path) === 'index.jsx') {
        continue
      }

      // Check if file is in the same directory
      if (this.getDirectory(node.path) === directory) {
        // Simple heuristic: if barrel has exports and this is a component file in same dir
        if (exports.length > 0 && this.isComponentFile(node.path)) {
          components.push(node.path)
        }
      }
    }

    return components
  }

  /**
   * Checks if a barrel group has external usage (imports from outside its directory)
   */
  private hasExternalUsagePattern(
    group: BarrelGroup,
    fileNodes: TreeNode[],
    reachableFiles: Set<string>,
  ): boolean {
    // Check if the barrel file itself is imported from outside its directory
    const externalImporters = this.findExternalImporters(group.barrelFile, group.directory, fileNodes)

    if (externalImporters.length > 0) {
      // Verify that at least one external importer is reachable
      return externalImporters.some(importer => reachableFiles.has(importer))
    }

    // Also check if any of the components are directly imported from outside
    for (const component of group.exportedComponents) {
      const componentImporters = this.findExternalImporters(component, group.directory, fileNodes)
      if (componentImporters.some(importer => reachableFiles.has(importer))) {
        return true
      }
    }

    return false
  }

  /**
   * Finds files that import a given file from outside its directory
   */
  private findExternalImporters(targetFile: string, targetDirectory: string, fileNodes: TreeNode[]): string[] {
    const importers: string[] = []

    for (const node of fileNodes) {
      // Skip files in the same directory
      if (this.getDirectory(node.path) === targetDirectory) {
        continue
      }

      // Check if this file imports the target
      if (node.imports) {
        for (const importPath of node.imports) {
          // Resolve imports to absolute paths (handles aliases, relative paths, etc.)
          const resolvedImport = this.resolveImportPath(node.path, importPath, fileNodes)
          if (resolvedImport === targetFile) {
            importers.push(node.path)
            break
          }
        }
      }
    }

    return importers
  }

  /**
   * Resolves a relative import path to an absolute file path
   */
  private resolveImportPath(fromFile: string, importPath: string, fileNodes: TreeNode[]): string | null {
    let resolved: string

    // Handle alias imports (most common patterns)
    if (importPath.startsWith('@/')) {
      // @/ -> src/ (most common pattern)
      resolved = `client/src/${importPath.slice(2)}`
    }
    else if (importPath.startsWith('~/')) {
      // ~/ -> project root or src/ (Nuxt.js pattern)
      // Try src/ first, then project root
      const srcCandidate = `client/src/${importPath.slice(2)}`
      const rootCandidate = `client/${importPath.slice(2)}`

      if (this.findFileWithExtensions(srcCandidate, fileNodes)) {
        resolved = srcCandidate
      }
      else if (this.findFileWithExtensions(rootCandidate, fileNodes)) {
        resolved = rootCandidate
      }
      else {
        resolved = srcCandidate // Default to src/
      }
    }
    else if (importPath.startsWith('#/')) {
      // #/ -> src/ (package.json imports pattern)
      resolved = `client/src/${importPath.slice(2)}`
    }
    else if (importPath.includes('/') && !importPath.startsWith('./') && !importPath.startsWith('../')) {
      // Handle other custom aliases (try common patterns)
      // For paths like "components/ui/button", try resolving from src/
      resolved = `client/src/${importPath}`
    }
    else if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Handle relative imports
      const fromDir = this.getDirectory(fromFile)
      resolved = this.resolvePath(fromDir, importPath)
    }
    else {
      // External import (node_modules, etc.)
      return null
    }

    // Try finding the file with various extensions and index patterns
    return this.findFileWithExtensions(resolved, fileNodes)
  }

  /**
   * Tries to find a file with common extensions and index patterns
   */
  private findFileWithExtensions(basePath: string, fileNodes: TreeNode[]): string | null {
    // Try exact match first
    if (fileNodes.some(node => node.path === basePath)) {
      return basePath
    }

    // Try adding common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.mjs', '.cjs']
    for (const ext of extensions) {
      const candidate = basePath + ext
      if (fileNodes.some(node => node.path === candidate)) {
        return candidate
      }
    }

    // Try index files
    for (const ext of extensions) {
      const candidate = basePath + '/index' + ext
      if (fileNodes.some(node => node.path === candidate)) {
        return candidate
      }
    }

    return null
  }

  /**
   * Checks if a directory follows a component library pattern that should allow standalone barrels
   */
  private isComponentLibraryPattern(directory: string): boolean {
    return this.config.directoryPatterns.some(pattern =>
      directory.includes(pattern),
    )
  }

  /**
   * Detects what pattern this barrel follows (shadcn, component-library, ui-library, etc.)
   */
  private detectPattern(path: string): string {
    if (path.includes('/components/ui/')) return 'component-ui'
    if (path.includes('/components/base/')) return 'component-base'
    if (path.includes('/lib/components/')) return 'lib-components'
    if (path.includes('/components/')) return 'components'
    if (path.includes('/ui/')) return 'ui'
    if (path.includes('/widgets/')) return 'widgets'
    if (path.includes('/hooks/')) return 'hooks'
    if (path.includes('/utils/')) return 'utils'
    return 'generic'
  }

  /**
   * Checks if a file is likely a component file
   */
  private isComponentFile(path: string): boolean {
    const ext = this.getFileExtension(path)
    return ['.tsx', '.jsx', '.ts', '.js'].includes(ext)
      && !path.includes('.test.')
      && !path.includes('.spec.')
  }

  /**
   * Utility: Get file name from path
   */
  private getFileName(path: string): string {
    return path.split('/').pop() || ''
  }

  /**
   * Utility: Get directory from path
   */
  private getDirectory(path: string): string {
    const parts = path.split('/')
    return parts.slice(0, -1).join('/')
  }

  /**
   * Utility: Get file extension
   */
  private getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.')
    return lastDot > 0 ? path.substring(lastDot) : ''
  }

  /**
   * Utility: Resolve relative path
   */
  private resolvePath(fromDir: string, relativePath: string): string {
    const parts = fromDir.split('/').filter(Boolean)
    const pathParts = relativePath.split('/').filter(Boolean)

    for (const part of pathParts) {
      if (part === '..') {
        parts.pop()
      }
      else if (part !== '.') {
        parts.push(part)
      }
    }

    return parts.join('/')
  }
}