/**
 * Unified Import Resolution System
 *
 * This module provides a centralized, reusable solution for resolving import paths
 * across all analyzers, replacing 6+ duplicate implementations.
 */

export { ImportResolver } from './import-resolver.js'
export { PathValidator } from './validation/path-validator.js'

// Strategy exports for advanced usage
export { RelativeResolver } from './strategies/relative-resolver.js'
export { AliasResolver } from './strategies/alias-resolver.js'
export { AbsoluteResolver } from './strategies/absolute-resolver.js'
export { FrameworkResolver } from './strategies/framework-resolver.js'

// Type exports
export type {
  ImportResolutionContext,
  FrameworkConfig,
  ResolutionResult,
  ResolutionStrategy,
  ImportResolver as IImportResolver,
  PathValidationResult,
} from './types.js'