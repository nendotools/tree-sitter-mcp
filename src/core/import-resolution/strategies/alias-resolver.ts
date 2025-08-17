/**
 * Resolver for aliased imports (@/, ~/, #/, custom aliases)
 */

import type { ImportResolver, ImportResolutionContext, ResolutionResult } from '../types.js'
import { PathValidator } from '../validation/path-validator.js'

export class AliasResolver implements ImportResolver {
  getPriority(): number {
    return 90 // High priority, but after relative
  }

  canResolve(importPath: string, context: ImportResolutionContext): boolean {
    // Common alias patterns
    if (importPath.startsWith('@/') || importPath.startsWith('~/') || importPath.startsWith('#/')) {
      return true
    }

    // Custom aliases from framework config
    if (context.frameworkConfig?.aliases) {
      return Object.keys(context.frameworkConfig.aliases).some(alias =>
        importPath.startsWith(alias),
      )
    }

    // Absolute-style imports that might be aliases (components/ui/button)
    return !importPath.startsWith('./')
      && !importPath.startsWith('../')
      && !this.isExternalPackage(importPath)
      && importPath.includes('/')
  }

  resolve(importPath: string, context: ImportResolutionContext): ResolutionResult {
    const { availableFiles, frameworkConfig } = context
    const validator = new PathValidator(availableFiles)
    const steps: string[] = []

    try {
      let resolvedPath: string

      // Try custom aliases first
      if (frameworkConfig?.aliases) {
        const customResolved = this.tryCustomAliases(importPath, frameworkConfig.aliases, steps)
        if (customResolved) {
          resolvedPath = customResolved
        }
        else {
          resolvedPath = this.resolveCommonAliases(importPath, steps)
        }
      }
      else {
        resolvedPath = this.resolveCommonAliases(importPath, steps)
      }

      // Special handling for ~/ pattern - try both src and root like original
      if (importPath.startsWith('~/')) {
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

        // Default to src/ if neither found (matches original behavior)
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
   * Try resolving using custom aliases from framework config
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
   * Resolve common alias patterns (matching original TraversalDeadCodeDetector behavior)
   */
  private resolveCommonAliases(importPath: string, steps: string[]): string {
    if (importPath.startsWith('@/')) {
      // @/ -> client/src/ (most common pattern - matches original)
      const resolved = `client/src/${importPath.slice(2)}`
      steps.push(`Common alias @/ -> client/src/`)
      steps.push(`Resolved to: ${resolved}`)
      return resolved
    }

    if (importPath.startsWith('~/')) {
      // ~/ -> project root or src/ (Nuxt.js pattern - matches original)
      // Try src/ first, then project root
      const srcCandidate = `client/src/${importPath.slice(2)}`
      const rootCandidate = `client/${importPath.slice(2)}`

      // Return srcCandidate first - validation will determine which exists
      steps.push(`Common alias ~/ -> try client/src/ then client/`)
      steps.push(`Resolved to: ${srcCandidate} (will try ${rootCandidate} if not found)`)
      return srcCandidate
    }

    if (importPath.startsWith('#/')) {
      // #/ -> client/src/ (package.json imports pattern - matches original)
      const resolved = `client/src/${importPath.slice(2)}`
      steps.push(`Common alias #/ -> client/src/`)
      steps.push(`Resolved to: ${resolved}`)
      return resolved
    }

    // Handle other custom aliases (try common patterns - matches original)
    // For paths like "components/ui/button", try resolving from client/src/
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
   * Check if import path is an external package
   */
  private isExternalPackage(importPath: string): boolean {
    // External packages don't start with ./ or ../ and are either:
    // 1. Single word (lodash, react)
    // 2. Scoped (@types/node, @babel/core)
    return !importPath.includes('/') || (importPath.startsWith('@') && importPath.split('/').length === 2)
  }
}