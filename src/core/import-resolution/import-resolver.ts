/**
 * Unified import resolution system
 *
 * Coordinates multiple resolution strategies to resolve import paths to actual file paths.
 * This replaces the 6+ duplicated import resolution implementations across analyzers.
 */

import type {
  ImportResolver as IImportResolver,
  ImportResolutionContext,
  ResolutionResult,
  FrameworkConfig,
} from './types.js'
import type { TreeNode } from '../../types/index.js'

import { RelativeResolver } from './strategies/relative-resolver.js'
import { AliasResolver } from './strategies/alias-resolver.js'
import { AbsoluteResolver } from './strategies/absolute-resolver.js'
import { FrameworkResolver } from './strategies/framework-resolver.js'

/**
 * Main import resolver that coordinates all resolution strategies
 */
export class ImportResolver {
  private resolvers: IImportResolver[] = []
  private context: ImportResolutionContext | null = null

  constructor() {
    // Register resolvers in priority order (higher priority = checked first)
    this.resolvers = [
      new RelativeResolver(), // Priority 100
      new AliasResolver(), // Priority 90
      new FrameworkResolver(), // Priority 80
      new AbsoluteResolver(), // Priority 50
    ].sort((a, b) => b.getPriority() - a.getPriority())
  }

  /**
   * Initialize the resolver with project context
   */
  initialize(availableFiles: TreeNode[], projectRoot?: string, frameworkConfig?: FrameworkConfig): void {
    this.context = {
      currentFile: '', // Will be set per resolution
      availableFiles,
      projectRoot,
      frameworkConfig,
    }
  }

  /**
   * Resolve a single import path from a specific file
   */
  resolveImport(importPath: string, currentFile: string): ResolutionResult {
    if (!this.context) {
      throw new Error('ImportResolver not initialized. Call initialize() first.')
    }

    const context: ImportResolutionContext = {
      ...this.context,
      currentFile,
    }

    // Try each resolver in priority order
    for (const resolver of this.resolvers) {
      if (resolver.canResolve(importPath, context)) {
        const result = resolver.resolve(importPath, context)

        // If resolution was successful, return it
        if (result.exists) {
          return result
        }

        // If this resolver claims it can handle it but failed,
        // continue to next resolver as fallback
      }
    }

    // No resolver could handle this import
    return {
      resolvedPath: null,
      strategy: 'external',
      exists: false,
      metadata: {
        originalPath: importPath,
        failureReason: 'No resolver could handle this import path (likely external package)',
      },
    }
  }

  /**
   * Resolve multiple imports from a file's AST import data
   */
  resolveImportsFromAST(fileNode: TreeNode): string[] {
    if (!fileNode.imports) {
      return []
    }

    const resolvedImports: string[] = []

    for (const importPath of fileNode.imports) {
      const result = this.resolveImport(importPath, fileNode.path)

      if (result.exists && result.resolvedPath) {
        resolvedImports.push(result.resolvedPath)
      }
      // Skip external imports (node_modules, etc.)
    }

    return resolvedImports
  }

  /**
   * Batch resolve multiple import paths from the same file
   */
  resolveBatch(imports: string[], currentFile: string): ResolutionResult[] {
    return imports.map(importPath => this.resolveImport(importPath, currentFile))
  }

  /**
   * Get detailed resolution information for debugging
   */
  resolveWithDetails(importPath: string, currentFile: string): ResolutionResult & {
    attemptedResolvers: string[]
  } {
    if (!this.context) {
      throw new Error('ImportResolver not initialized. Call initialize() first.')
    }

    const context: ImportResolutionContext = {
      ...this.context,
      currentFile,
    }

    const attemptedResolvers: string[] = []
    let lastResult: ResolutionResult = {
      resolvedPath: null,
      strategy: 'external',
      exists: false,
      metadata: { originalPath: importPath },
    }

    // Try each resolver and collect attempt information
    for (const resolver of this.resolvers) {
      const resolverName = resolver.constructor.name
      attemptedResolvers.push(resolverName)

      if (resolver.canResolve(importPath, context)) {
        const result = resolver.resolve(importPath, context)
        lastResult = result

        if (result.exists) {
          return { ...result, attemptedResolvers }
        }
      }
    }

    return { ...lastResult, attemptedResolvers }
  }

  /**
   * Update the framework configuration
   */
  updateFrameworkConfig(frameworkConfig: FrameworkConfig): void {
    if (this.context) {
      this.context.frameworkConfig = frameworkConfig
    }
  }

  /**
   * Get current context (for debugging)
   */
  getContext(): ImportResolutionContext | null {
    return this.context
  }

  /**
   * Reset the resolver (clear context)
   */
  reset(): void {
    this.context = null
  }
}