/**
 * Simplified error handling - replaces 873 lines of error handling bloat
 */

import type { JsonObject } from '../types/core.js'

export class TreeSitterError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: JsonObject,
  ) {
    super(message)
    this.name = 'TreeSitterError'
  }
}

export function handleError(error: unknown, context?: string): TreeSitterError {
  if (error instanceof TreeSitterError) return error

  const message = error instanceof Error ? error.message : String(error)
  return new TreeSitterError(
    context ? `${context}: ${message}` : message,
    'UNKNOWN_ERROR',
    { originalError: String(error) },
  )
}

// 3 basic error types instead of dozens
export const ERROR_CODES = {
  PARSE_ERROR: 'PARSE_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  SEARCH_ERROR: 'SEARCH_ERROR',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

export function createError(code: ErrorCode, message: string, context?: JsonObject): TreeSitterError {
  return new TreeSitterError(message, code, context)
}

export function isTreeSitterError(error: unknown): error is TreeSitterError {
  return error instanceof TreeSitterError
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T> {
  try {
    return await operation()
  }
  catch (error) {
    throw handleError(error, context)
  }
}