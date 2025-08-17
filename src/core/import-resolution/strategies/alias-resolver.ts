/**
 * Resolver for aliased imports (@/, ~/, #/, custom aliases)
 */

import type { ImportResolver, ImportResolutionContext, ResolutionResult } from '../types.js'
import { PathValidator } from '../validation/path-validator.js'

export class AliasResolver implements ImportResolver {
  getPriority(): number {
    return 90
  }

  canResolve(importPath: string, context: ImportResolutionContext): boolean {
    if (importPath.startsWith('@/') || importPath.startsWith('~/') || importPath.startsWith('#/')) {
      return true
    }

    if (context.frameworkConfig?.aliases) {
      return Object.keys(context.frameworkConfig.aliases).some(alias =>
        importPath.startsWith(alias),
      )
    }

    return !importPath.startsWith('./')
      && !importPath.startsWith('../')
      && !this.isExternalPackage(importPath)
      && importPath.includes('/')
  }

  /**
   * Resolves aliased import paths to actual file paths
   * Handles @/, ~/, #/, and custom framework aliases
   */
  resolve(importPath: string, context: ImportResolutionContext): ResolutionResult {
    const { availableFiles, frameworkConfig } = context
    const validator = new PathValidator(availableFiles)
    const steps: string[] = []

    try {
      let resolvedPath: string

      if (frameworkConfig?.aliases) {
        const customResolved = this.tryCustomAliases(importPath, frameworkConfig.aliases, steps)
        resolvedPath = customResolved || this.resolveCommonAliases(importPath, steps)
      }
      else {
        resolvedPath = this.resolveCommonAliases(importPath, steps)
      }

      if (importPath.startsWith('~/')) {
        return this.handleTildeAlias(importPath, validator, steps)
      }

      const validation = validator.validatePath(resolvedPath)
      return {
        resolvedPath: validation.normalizedPath || null,
        strategy: 'alias',
        exists: validation.isValid,
        metadata: {
          originalPath: importPath,
          steps: [
            ...steps,
            validation.isValid ? 'File found' : `File not found: ${validation.error}`,
          ],
          failureReason: validation.isValid ? undefined : validation.error,
        },
      }
    }
    catch (error) {
      return {
        resolvedPath: null,
        strategy: 'alias',
        exists: false,
        metadata: {
          originalPath: importPath,
          steps,
          failureReason: `Error resolving alias import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      }
    }
  }

  /**
   * Handle special ~/ alias pattern with dual-path validation
   * Tries both src and root locations
   */
  private handleTildeAlias(importPath: string, validator: PathValidator, steps: string[]): ResolutionResult {
    const srcCandidate = `client/src/${importPath.slice(2)}`
    const rootCandidate = `client/${importPath.slice(2)}`

    const srcValidation = validator.validatePath(srcCandidate)
    if (srcValidation.isValid) {
      return {
        resolvedPath: srcValidation.normalizedPath!,
        strategy: 'alias',
        exists: true,
        metadata: {
          originalPath: importPath,
          steps: [...steps, `Found at src location: ${srcCandidate}`],
        },
      }
    }

    const rootValidation = validator.validatePath(rootCandidate)
    if (rootValidation.isValid) {
      return {
        resolvedPath: rootValidation.normalizedPath!,
        strategy: 'alias',
        exists: true,
        metadata: {
          originalPath: importPath,
          steps: [...steps, `Found at root location: ${rootCandidate}`],
        },
      }
    }

    return {
      resolvedPath: null,
      strategy: 'alias',
      exists: false,
      metadata: {
        originalPath: importPath,
        steps: [...steps, `Neither ${srcCandidate} nor ${rootCandidate} found`],
        failureReason: 'File not found in either src or root location',
      },
    }
  }

  /**
   * Attempts to resolve import using custom aliases from framework configuration
   */
  private tryCustomAliases(importPath: string, aliases: Record<string, string>, steps: string[]): string | null {
    for (const [alias, target] of Object.entries(aliases)) {
      if (importPath.startsWith(alias)) {
        const resolved = importPath.replace(alias, target)
        steps.push(`Custom alias ${alias} -> ${target}`)
        steps.push(`Resolved to: ${resolved}`)
        return resolved
      }
    }
    return null
  }

  /**
   * Resolves common alias patterns (@/, ~/, #/) and absolute-style imports
   */
  private resolveCommonAliases(importPath: string, steps: string[]): string {
    if (importPath.startsWith('@/')) {
      const resolved = `client/src/${importPath.slice(2)}`
      steps.push(`Common alias @/ -> client/src/`)
      steps.push(`Resolved to: ${resolved}`)
      return resolved
    }

    if (importPath.startsWith('~/')) {
      const srcCandidate = `client/src/${importPath.slice(2)}`
      const rootCandidate = `client/${importPath.slice(2)}`
      steps.push(`Common alias ~/ -> try client/src/ then client/`)
      steps.push(`Resolved to: ${srcCandidate} (will try ${rootCandidate} if not found)`)
      return srcCandidate
    }

    if (importPath.startsWith('#/')) {
      const resolved = `client/src/${importPath.slice(2)}`
      steps.push(`Common alias #/ -> client/src/`)
      steps.push(`Resolved to: ${resolved}`)
      return resolved
    }

    if (importPath.includes('/') && !importPath.startsWith('./') && !importPath.startsWith('../')) {
      const resolved = `client/src/${importPath}`
      steps.push(`Treating as absolute import from client/src/`)
      steps.push(`Resolved to: ${resolved}`)
      return resolved
    }

    steps.push(`No alias pattern matched, using as-is: ${importPath}`)
    return importPath
  }

  /**
   * Determines if an import path refers to an external package
   * External packages are either single words or scoped packages
   */
  private isExternalPackage(importPath: string): boolean {
    return !importPath.includes('/') || (importPath.startsWith('@') && importPath.split('/').length === 2)
  }
}