/**
 * Structured error types for MCP tool responses
 *
 * Provides consistent JSON error responses for AI consumption
 */

/**
 * Error categories for different types of failures
 */
export enum ErrorCategory {
  /** Project-related errors (not found, already exists, etc.) */
  PROJECT = 'project',
  /** File system errors (path not found, permission denied, etc.) */
  FILESYSTEM = 'filesystem',
  /** Language parsing errors (unsupported language, syntax errors, etc.) */
  PARSING = 'parsing',
  /** Search-related errors (invalid query, no results, etc.) */
  SEARCH = 'search',
  /** Configuration or parameter validation errors */
  VALIDATION = 'validation',
  /** Internal system errors (memory, unexpected failures) */
  SYSTEM = 'system',
}

/**
 * Structured error object for consistent AI-friendly responses
 */
export interface McpError {
  /** Error category for programmatic handling */
  category: ErrorCategory
  /** Human-readable error message */
  message: string
  /** Optional error code for specific error types */
  code?: string
  /** Optional context information */
  context?: Record<string, unknown>
}

/**
 * Custom error class for MCP operations
 */
export class McpOperationError extends Error {
  public readonly category: ErrorCategory
  public readonly code?: string
  public readonly context?: Record<string, unknown>

  constructor(category: ErrorCategory, message: string, code?: string, context?: Record<string, unknown>) {
    super(message)
    this.name = 'McpOperationError'
    this.category = category
    this.code = code
    this.context = context
  }

  /**
   * Convert to structured error object for JSON responses
   */
  toJson(): McpError {
    return {
      category: this.category,
      message: this.message,
      ...(this.code && { code: this.code }),
      ...(this.context && { context: this.context }),
    }
  }
}

/**
 * Common error factory functions for consistent error creation
 */
export const ErrorFactory = {
  projectNotFound: (projectId: string): McpOperationError =>
    new McpOperationError(
      ErrorCategory.PROJECT,
      `Project "${projectId}" not found`,
      'PROJECT_NOT_FOUND',
      { projectId },
    ),

  projectAlreadyExists: (projectId: string): McpOperationError =>
    new McpOperationError(
      ErrorCategory.PROJECT,
      `Project "${projectId}" already exists`,
      'PROJECT_EXISTS',
      { projectId },
    ),

  directoryNotFound: (directory: string): McpOperationError =>
    new McpOperationError(
      ErrorCategory.FILESYSTEM,
      `Directory not found: ${directory}`,
      'DIRECTORY_NOT_FOUND',
      { directory },
    ),

  fileNotFound: (filePath: string): McpOperationError =>
    new McpOperationError(
      ErrorCategory.FILESYSTEM,
      `File not found: ${filePath}`,
      'FILE_NOT_FOUND',
      { filePath },
    ),

  invalidQuery: (query: string): McpOperationError =>
    new McpOperationError(
      ErrorCategory.SEARCH,
      `Invalid search query: ${query}`,
      'INVALID_QUERY',
      { query },
    ),

  unsupportedLanguage: (language: string): McpOperationError =>
    new McpOperationError(
      ErrorCategory.PARSING,
      `Unsupported language: ${language}`,
      'UNSUPPORTED_LANGUAGE',
      { language },
    ),

  validationError: (field: string, value: unknown): McpOperationError =>
    new McpOperationError(
      ErrorCategory.VALIDATION,
      `Invalid value for ${field}`,
      'VALIDATION_ERROR',
      { field, value },
    ),

  systemError: (operation: string, cause?: string): McpOperationError =>
    new McpOperationError(
      ErrorCategory.SYSTEM,
      `System error during ${operation}${cause ? `: ${cause}` : ''}`,
      'SYSTEM_ERROR',
      { operation, cause },
    ),
}

/**
 * Utility function to format any error as structured MCP error
 */
export function formatError(error: unknown): McpError {
  if (error instanceof McpOperationError) {
    return error.toJson()
  }

  if (error instanceof Error) {
    return {
      category: ErrorCategory.SYSTEM,
      message: error.message,
      code: 'UNEXPECTED_ERROR',
    }
  }

  return {
    category: ErrorCategory.SYSTEM,
    message: String(error),
    code: 'UNKNOWN_ERROR',
  }
}