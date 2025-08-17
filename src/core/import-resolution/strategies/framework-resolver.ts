/**
 * Framework-specific import resolver (React, Next.js, Vue, etc.)
 */

import type { ImportResolver, ImportResolutionContext, ResolutionResult, FrameworkConfig } from '../types.js'
import { PathValidator } from '../validation/path-validator.js'

export class FrameworkResolver implements ImportResolver {
  getPriority(): number {
    return 80 // High priority for framework-specific patterns
  }

  canResolve(importPath: string, context: ImportResolutionContext): boolean {
    return !!context.frameworkConfig && this.isFrameworkImport(importPath, context.frameworkConfig)
  }

  resolve(importPath: string, context: ImportResolutionContext): ResolutionResult {
    const { availableFiles, frameworkConfig } = context

    if (!frameworkConfig) {
      return {
        resolvedPath: null,
        strategy: 'framework',
        exists: false,
        metadata: {
          originalPath: importPath,
          failureReason: 'No framework configuration provided',
        },
      }
    }

    const validator = new PathValidator(availableFiles)
    const steps: string[] = [`Framework: ${frameworkConfig.name}`]

    try {
      const resolvedPath = this.resolveFrameworkImport(importPath, frameworkConfig, steps)

      if (!resolvedPath) {
        return {
          resolvedPath: null,
          strategy: 'framework',
          exists: false,
          metadata: {
            originalPath: importPath,
            steps,
            failureReason: 'No framework-specific resolution found',
          },
        }
      }

      const validation = validator.validatePath(resolvedPath)

      return {
        resolvedPath: validation.normalizedPath || null,
        strategy: 'framework',
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
        strategy: 'framework',
        exists: false,
        metadata: {
          originalPath: importPath,
          steps,
          failureReason: `Error in framework resolution: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      }
    }
  }

  /**
   * Check if this is a framework-specific import pattern
   */
  private isFrameworkImport(importPath: string, frameworkConfig: FrameworkConfig): boolean {
    const { name } = frameworkConfig

    switch (name) {
      case 'nextjs':
        return this.isNextJsImport(importPath)
      case 'react':
        return this.isReactImport(importPath)
      case 'vue':
        return this.isVueImport(importPath)
      default:
        // For unknown frameworks, check if import matches any convention patterns
        return this.matchesFrameworkConventions(importPath, frameworkConfig)
    }
  }

  /**
   * Resolve framework-specific import patterns
   */
  private resolveFrameworkImport(importPath: string, frameworkConfig: FrameworkConfig, steps: string[]): string | null {
    const { name } = frameworkConfig

    switch (name) {
      case 'nextjs':
        return this.resolveNextJsImport(importPath, steps)
      case 'react':
        return this.resolveReactImport(importPath, steps)
      case 'vue':
        return this.resolveVueImport(importPath, steps)
      default:
        return this.resolveGenericFrameworkImport(importPath, frameworkConfig, steps)
    }
  }

  /**
   * Next.js specific patterns
   */
  private isNextJsImport(importPath: string): boolean {
    return importPath.includes('pages/')
      || importPath.includes('app/')
      || importPath.includes('components/')
      || importPath.startsWith('public/')
  }

  private resolveNextJsImport(importPath: string, steps: string[]): string | null {
    // Next.js typically uses src/ or root-level directories
    const candidates = [
      `src/${importPath}`,
      importPath,
      `app/${importPath}`,
      `pages/${importPath}`,
    ]

    for (const candidate of candidates) {
      steps.push(`Trying Next.js pattern: ${candidate}`)
      // Return first candidate - validation happens in main resolve method
      return candidate
    }

    return null
  }

  /**
   * React specific patterns
   */
  private isReactImport(importPath: string): boolean {
    return importPath.includes('components/')
      || importPath.includes('hooks/')
      || importPath.includes('context/')
      || importPath.includes('utils/')
  }

  private resolveReactImport(importPath: string, steps: string[]): string | null {
    steps.push(`Trying React pattern: src/${importPath}`)
    return `src/${importPath}`
  }

  /**
   * Vue specific patterns
   */
  private isVueImport(importPath: string): boolean {
    return importPath.includes('components/')
      || importPath.includes('views/')
      || importPath.includes('composables/')
  }

  private resolveVueImport(importPath: string, steps: string[]): string | null {
    steps.push(`Trying Vue pattern: src/${importPath}`)
    return `src/${importPath}`
  }

  /**
   * Generic framework pattern matching
   */
  private matchesFrameworkConventions(importPath: string, frameworkConfig: FrameworkConfig): boolean {
    const { conventions } = frameworkConfig

    if (!conventions?.conventionDirs) {
      return false
    }

    return conventions.conventionDirs.some(dir => importPath.includes(`${dir}/`))
  }

  /**
   * Generic framework import resolution
   */
  private resolveGenericFrameworkImport(importPath: string, frameworkConfig: FrameworkConfig, steps: string[]): string | null {
    const { aliases } = frameworkConfig

    if (aliases) {
      for (const [alias, target] of Object.entries(aliases)) {
        if (importPath.startsWith(alias)) {
          const resolved = importPath.replace(alias, target)
          steps.push(`Framework alias ${alias} -> ${target}: ${resolved}`)
          return resolved
        }
      }
    }

    // Default to src/ prefix
    steps.push(`Using default src/ prefix: src/${importPath}`)
    return `src/${importPath}`
  }
}