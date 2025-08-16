/**
 * Project initialization error handling utilities
 * @deprecated Use unified error handling from core/error-handling
 */

import { withErrorHandling as unifiedWithErrorHandling } from '../../../core/error-handling/index.js'

/**
 * Handle project initialization errors with proper logging and re-throwing
 * @deprecated Use UnifiedErrorHandler directly
 */
export function handleInitializationError(error: unknown): never {
  throw error
}

/**
 * Execute function with error handling
 * @deprecated Use withErrorHandling from unified error handling
 */
export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  return unifiedWithErrorHandling(fn, {
    operation: 'project-initialization',
    tool: 'initialize-project',
  })
}