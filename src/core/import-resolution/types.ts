/**
 * Types for the unified import resolution system
 */

import type { TreeNode } from '../../types/index.js'

export interface ImportResolutionContext {
  /** Current file path requesting the import */
  currentFile: string
  /** All available files in the project */
  availableFiles: TreeNode[]
  /** Project root directory */
  projectRoot?: string
  /** Framework-specific configuration */
  frameworkConfig?: FrameworkConfig
}

export interface FrameworkConfig {
  /** Framework name (react, nextjs, vue, etc.) */
  name: string
  /** Common alias mappings (@/ -> src/, etc.) */
  aliases?: Record<string, string>
  /** Framework-specific conventions */
  conventions?: {
    /** Entry point patterns */
    entryPatterns?: string[]
    /** Convention directories */
    conventionDirs?: string[]
    /** File extensions to try */
    extensions?: string[]
  }
}

export interface ResolutionResult {
  /** Resolved absolute file path */
  resolvedPath: string | null
  /** Resolution strategy used */
  strategy: ResolutionStrategy
  /** Whether the file exists */
  exists: boolean
  /** Additional context about the resolution */
  metadata?: {
    /** Original import path */
    originalPath: string
    /** Intermediate steps taken */
    steps?: string[]
    /** Reason for failure (if any) */
    failureReason?: string
  }
}

export type ResolutionStrategy
  = | 'relative'
    | 'alias'
    | 'absolute'
    | 'framework'
    | 'external'

export interface ImportResolver {
  /** Resolve an import path to an absolute file path */
  resolve(importPath: string, context: ImportResolutionContext): ResolutionResult

  /** Check if this resolver can handle the given import path */
  canResolve(importPath: string, context: ImportResolutionContext): boolean

  /** Get the priority of this resolver (higher = checked first) */
  getPriority(): number
}

export interface PathValidationResult {
  /** Whether the path is valid */
  isValid: boolean
  /** Normalized path if valid */
  normalizedPath?: string
  /** Validation error if invalid */
  error?: string
}