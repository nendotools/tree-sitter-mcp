/**
 * Project status error handling utilities
 * @deprecated Use unified error handling from core/error-handling
 */

import { withErrorHandlingSync } from '../../../core/error-handling/index.js'

/**
 * Handle project status errors with proper logging and re-throwing
 * @deprecated Use UnifiedErrorHandler directly
 */
export function handleStatusError(error: unknown): never {
  throw error
}

/**
 * Execute function with error handling
 * @deprecated Use withErrorHandlingSync from unified error handling
 */
export function withErrorHandling<T>(fn: () => T): T {
  return withErrorHandlingSync(fn, {
    operation: 'project-status',
    tool: 'project-status',
  })
}