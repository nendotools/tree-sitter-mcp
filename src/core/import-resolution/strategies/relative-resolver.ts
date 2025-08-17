/**
 * Resolver for relative imports (./file, ../directory/file)
 */

import type { ImportResolver, ImportResolutionContext, ResolutionResult } from '../types.js'
import { PathValidator } from '../validation/path-validator.js'

export class RelativeResolver implements ImportResolver {
  getPriority(): number {
    return 100 // High priority for relative imports
  }

  canResolve(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../')
  }

  resolve(importPath: string, context: ImportResolutionContext): ResolutionResult {
    const { currentFile, availableFiles } = context
    const validator = new PathValidator(availableFiles)

    try {
      const resolvedPath = this.resolveRelativePath(importPath, currentFile)
      const validation = validator.validatePath(resolvedPath)

      return {
        resolvedPath: validation.normalizedPath || null,
        strategy: 'relative',
        exists: validation.isValid,
        metadata: {
          originalPath: importPath,
          steps: [
            `Current file: ${currentFile}`,
            `Relative path: ${importPath}`,
            `Resolved to: ${resolvedPath}`,
            validation.isValid ? 'File found' : `File not found: ${validation.error}`,
          ],
          failureReason: validation.isValid ? undefined : validation.error,
        },
      }
    }
    catch (error) {
      return {
        resolvedPath: null,
        strategy: 'relative',
        exists: false,
        metadata: {
          originalPath: importPath,
          failureReason: `Error resolving relative import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      }
    }
  }

  /**
   * Resolves a relative import path to an absolute path
   */
  private resolveRelativePath(importPath: string, currentFile: string): string {
    const currentDir = this.getDirectory(currentFile)
    const pathParts = currentDir.split('/').filter(Boolean)
    const importParts = importPath.split('/').filter(Boolean)

    // Process each part of the import path
    for (const part of importParts) {
      if (part === '..') {
        if (pathParts.length > 0) {
          pathParts.pop()
        }
      }
      else if (part !== '.') {
        pathParts.push(part)
      }
    }

    return pathParts.join('/')
  }

  /**
   * Gets the directory portion of a file path
   */
  private getDirectory(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/')
    return lastSlash >= 0 ? filePath.substring(0, lastSlash) : ''
  }
}