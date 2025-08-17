/**
 * Resolver for absolute imports that are internal to the project
 */

import type { ImportResolver, ImportResolutionContext, ResolutionResult } from '../types.js'
import { PathValidator } from '../validation/path-validator.js'

export class AbsoluteResolver implements ImportResolver {
  getPriority(): number {
    return 50 // Medium priority
  }

  canResolve(importPath: string): boolean {
    // Handle absolute paths that don't start with ./ or ../
    // and aren't obvious external packages
    return !importPath.startsWith('./')
      && !importPath.startsWith('../')
      && !this.isExternalPackage(importPath)
  }

  resolve(importPath: string, context: ImportResolutionContext): ResolutionResult {
    const { availableFiles } = context
    const validator = new PathValidator(availableFiles)
    const steps: string[] = []

    try {
      // Try the path as-is first
      let validation = validator.validatePath(importPath)
      steps.push(`Trying absolute path as-is: ${importPath}`)

      if (validation.isValid) {
        return {
          resolvedPath: validation.normalizedPath!,
          strategy: 'absolute',
          exists: true,
          metadata: {
            originalPath: importPath,
            steps: [...steps, 'File found'],
          },
        }
      }

      // If that fails, try common prefixes
      const prefixes = ['src/', 'lib/', 'app/', '']

      for (const prefix of prefixes) {
        const prefixedPath = prefix ? `${prefix}${importPath}` : importPath
        validation = validator.validatePath(prefixedPath)
        steps.push(`Trying with prefix '${prefix}': ${prefixedPath}`)

        if (validation.isValid) {
          return {
            resolvedPath: validation.normalizedPath!,
            strategy: 'absolute',
            exists: true,
            metadata: {
              originalPath: importPath,
              steps: [...steps, 'File found'],
            },
          }
        }
      }

      return {
        resolvedPath: null,
        strategy: 'absolute',
        exists: false,
        metadata: {
          originalPath: importPath,
          steps,
          failureReason: 'File not found with any common prefix',
        },
      }
    }
    catch (error) {
      return {
        resolvedPath: null,
        strategy: 'absolute',
        exists: false,
        metadata: {
          originalPath: importPath,
          steps,
          failureReason: `Error resolving absolute import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      }
    }
  }

  /**
   * Check if import path is an external package
   */
  private isExternalPackage(importPath: string): boolean {
    // Common patterns for external packages
    const externalPatterns = [
      // Node built-ins
      /^(fs|path|util|crypto|http|https|url|querystring|stream|events|os|child_process)$/,
      // Common package names (single word without /)
      /^[a-z][\w-]*$/,
      // Scoped packages (@org/package)
      /^@[\w-]+\/[\w-]+$/,
      // Packages with subpaths that are clearly external
      /^(react|vue|angular|lodash|moment|axios|express|next)\//,
    ]

    return externalPatterns.some(pattern => pattern.test(importPath))
  }
}