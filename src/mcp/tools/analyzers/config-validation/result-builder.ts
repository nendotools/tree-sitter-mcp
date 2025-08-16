/**
 * Configuration validation result builder utilities
 */

import type { ConfigValidationResult, ConfigValidationError } from './types.js'

/**
 * Create a validation result for empty content
 */
export function createEmptyContentResult(filePath: string): ConfigValidationResult {
  return {
    isValid: false,
    errors: [{
      path: filePath,
      message: 'Configuration file is empty',
      severity: 'error',
    }],
  }
}

/**
 * Create a validation result from errors
 */
export function createValidationResult(
  errors: ConfigValidationError[],
  schemaUsed?: string,
): ConfigValidationResult {
  return {
    isValid: errors.length === 0,
    errors,
    schemaUsed,
  }
}

/**
 * Create a successful validation result
 */
export function createSuccessResult(schemaUsed?: string): ConfigValidationResult {
  return {
    isValid: true,
    errors: [],
    schemaUsed,
  }
}

/**
 * Create an error result from exception
 */
export function createErrorResult(error: Error, filePath: string): ConfigValidationResult {
  return {
    isValid: false,
    errors: [{
      path: filePath,
      message: `Validation failed: ${error.message}`,
      severity: 'error',
    }],
  }
}

/**
 * Merge multiple validation error arrays
 */
export function mergeValidationErrors(...errorArrays: ConfigValidationError[][]): ConfigValidationError[] {
  return errorArrays.flat()
}