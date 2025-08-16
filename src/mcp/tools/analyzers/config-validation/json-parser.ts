/**
 * JSON parsing and validation utilities
 */

import type { ConfigValidationError } from './types.js'

/**
 * Parse JSON content and return validation errors
 */
export function parseJsonSafely(content: string, filePath: string): {
  data?: any
  errors: ConfigValidationError[]
} {
  const errors: ConfigValidationError[] = []

  try {
    const data = JSON.parse(content)
    return { data, errors }
  }
  catch (parseError: any) {
    errors.push({
      path: filePath,
      message: `Invalid JSON syntax: ${parseError.message}`,
      severity: 'error',
    })
    return { errors }
  }
}

/**
 * Check if content is valid JSON
 */
export function isValidJson(content: string): boolean {
  try {
    JSON.parse(content)
    return true
  }
  catch {
    return false
  }
}