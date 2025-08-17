/**
 * Unified error handling system - Main exports
 */

// Core error handling components
export { UnifiedErrorHandler } from './unified-error-handler.js'
export { ErrorReporter } from './error-reporter.js'
export { EnhancedErrorFactory } from './enhanced-error-factory.js'
export { ERROR_CODES } from './error-codes.js'

// Import classes for convenience functions
import { UnifiedErrorHandler } from './unified-error-handler.js'

// Types
export type { ErrorCode } from './error-codes.js'
export type { ErrorContext, ErrorMetrics } from './error-reporter.js'
export type { OperationContext } from './unified-error-handler.js'

// Re-export base error types
export {
  ErrorCategory,
  McpOperationError,
  ErrorFactory,
  type McpError,
} from '../../types/error-types.js'

/**
 * Convenience function to get the unified error handler instance
 */
export function getErrorHandler() {
  return UnifiedErrorHandler.getInstance()
}

/**
 * Quick error handling wrapper for async operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: { operation: string, tool: string },
  options?: {
    timeoutMs?: number
    retry?: { attempts: number, delayMs: number }
  },
): Promise<T> {
  const handler = getErrorHandler()
  return handler.withErrorHandling(operation, context, options)
}

/**
 * Quick error handling wrapper for sync operations
 */
export function withErrorHandlingSync<T>(
  operation: () => T,
  context: { operation: string, tool: string },
): T {
  const handler = getErrorHandler()
  return handler.withErrorHandlingSync(operation, context)
}