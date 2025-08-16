/**
 * Unified error handling middleware for all MCP operations
 */

import { getLogger } from '../../utils/logger.js'
import { ErrorReporter } from './error-reporter.js'
import { EnhancedErrorFactory } from './enhanced-error-factory.js'
import { McpOperationError, ErrorCategory } from '../../types/error-types.js'
import { ERROR_CODES } from './error-codes.js'

/**
 * Operation context for error handling
 */
export interface OperationContext {
  /** Name of the operation being performed */
  operation: string
  /** Tool or service performing the operation */
  tool: string
  /** Request identifier for tracing */
  requestId?: string
  /** Additional context metadata */
  metadata?: Record<string, unknown>
}

/**
 * Unified error handler with standardized reporting and recovery
 */
export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler
  private errorReporter: ErrorReporter
  private logger = getLogger()

  private constructor() {
    this.errorReporter = ErrorReporter.getInstance()
  }

  static getInstance(): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler()
    }
    return UnifiedErrorHandler.instance
  }

  /**
   * Handle any error with full context and standardized reporting
   */
  handleError(
    error: unknown,
    context: OperationContext,
    options: {
      /** Whether to re-throw the error after handling */
      rethrow?: boolean
      /** Custom error transformation */
      transform?: (error: unknown) => McpOperationError
    } = {},
  ): McpOperationError {
    const { rethrow = true, transform } = options

    // Transform to standardized error
    const standardizedError = this.standardizeError(error, context, transform)

    // Report error with full context
    this.errorReporter.reportError(standardizedError, {
      operation: context.operation,
      requestId: context.requestId,
      metadata: {
        tool: context.tool,
        ...context.metadata,
      },
    })

    // Log error for immediate debugging
    this.logger.debug('Error handled by unified handler', {
      operation: context.operation,
      tool: context.tool,
      errorCode: standardizedError.code,
      errorMessage: standardizedError.message,
    })

    if (rethrow) {
      throw standardizedError
    }

    return standardizedError
  }

  /**
   * Execute operation with unified error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: OperationContext,
    options: {
      /** Timeout in milliseconds */
      timeoutMs?: number
      /** Custom error transformation */
      transform?: (error: unknown) => McpOperationError
      /** Retry configuration */
      retry?: {
        attempts: number
        delayMs: number
        retryableErrors?: string[]
      }
    } = {},
  ): Promise<T> {
    const { timeoutMs, transform, retry } = options
    let lastError: unknown

    // Set up timeout if specified
    const timeoutPromise = timeoutMs
      ? new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(EnhancedErrorFactory.system.operationTimeout(context.operation, timeoutMs))
        }, timeoutMs)
      })
      : null

    // Retry logic
    const maxAttempts = retry?.attempts || 1
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const operationPromise = operation()
        const result = timeoutPromise
          ? await Promise.race([operationPromise, timeoutPromise])
          : await operationPromise

        return result
      }
      catch (error) {
        lastError = error

        // Check if error is retryable
        if (attempt < maxAttempts && this.isRetryableError(error, retry?.retryableErrors)) {
          this.logger.debug('Retrying operation after error', {
            operation: context.operation,
            attempt,
            maxAttempts,
            error: error instanceof Error ? error.message : String(error),
          })

          // Wait before retry
          if (retry?.delayMs) {
            await new Promise(resolve => setTimeout(resolve, retry.delayMs))
          }
          continue
        }

        // Handle and re-throw error
        throw this.handleError(error, context, { transform })
      }
    }

    // This should never be reached, but TypeScript requires it
    throw this.handleError(lastError, context, { transform })
  }

  /**
   * Execute synchronous operation with unified error handling
   */
  withErrorHandlingSync<T>(
    operation: () => T,
    context: OperationContext,
    options: {
      /** Custom error transformation */
      transform?: (error: unknown) => McpOperationError
    } = {},
  ): T {
    try {
      return operation()
    }
    catch (error) {
      throw this.handleError(error, context, options)
    }
  }

  /**
   * Standardize any error to McpOperationError
   */
  private standardizeError(
    error: unknown,
    context: OperationContext,
    customTransform?: (error: unknown) => McpOperationError,
  ): McpOperationError {
    // Use custom transform if provided
    if (customTransform) {
      return customTransform(error)
    }

    // Already a standardized error
    if (error instanceof McpOperationError) {
      return error
    }

    // Standard Error objects
    if (error instanceof Error) {
      return this.transformStandardError(error, context)
    }

    // String errors
    if (typeof error === 'string') {
      return new McpOperationError(
        ErrorCategory.SYSTEM,
        `Error in ${context.operation}: ${error}`,
        ERROR_CODES.SYSTEM_ERROR,
        { operation: context.operation, tool: context.tool },
      )
    }

    // Unknown error types
    return new McpOperationError(
      ErrorCategory.SYSTEM,
      `Unknown error in ${context.operation}: ${String(error)}`,
      ERROR_CODES.SYSTEM_ERROR,
      { operation: context.operation, tool: context.tool, originalError: error },
    )
  }

  /**
   * Transform standard Error objects to McpOperationError
   */
  private transformStandardError(error: Error, context: OperationContext): McpOperationError {
    // Map common error types
    const errorMappings: Record<string, () => McpOperationError> = {
      ENOENT: () => EnhancedErrorFactory.filesystem.fileNotFound(
        context.metadata?.filePath as string || 'unknown',
        context.operation,
      ),
      EACCES: () => EnhancedErrorFactory.filesystem.accessDenied(
        context.metadata?.path as string || 'unknown',
        context.operation,
      ),
      EMFILE: () => EnhancedErrorFactory.system.internalError(
        context.operation,
        'Too many open files',
      ),
      ENOMEM: () => EnhancedErrorFactory.system.memoryExhausted(
        context.operation,
        0,
        0,
      ),
      SyntaxError: () => EnhancedErrorFactory.parsing.syntaxError(
        context.metadata?.filePath as string || 'unknown',
        0,
        0,
        error.message,
      ),
      TimeoutError: () => EnhancedErrorFactory.system.operationTimeout(
        context.operation,
        context.metadata?.timeoutMs as number || 0,
      ),
    }

    // Check for specific error codes/names
    const errorCode = (error as any).code || error.name
    const mappingFn = errorMappings[errorCode]
    if (mappingFn) {
      return mappingFn()
    }

    // Default transformation
    return new McpOperationError(
      ErrorCategory.SYSTEM,
      `Error in ${context.operation}: ${error.message}`,
      ERROR_CODES.SYSTEM_ERROR,
      {
        operation: context.operation,
        tool: context.tool,
        originalErrorName: error.name,
        originalErrorMessage: error.message,
      },
    )
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown, retryableErrors?: string[]): boolean {
    if (!retryableErrors) {
      // Default retryable errors
      retryableErrors = [
        ERROR_CODES.OPERATION_TIMEOUT,
        ERROR_CODES.NETWORK_ERROR,
        ERROR_CODES.CONNECTION_FAILED,
        ERROR_CODES.RESOURCE_UNAVAILABLE,
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
      ]
    }

    if (error instanceof McpOperationError) {
      return retryableErrors.includes(error.code || '')
    }

    if (error instanceof Error) {
      const errorCode = (error as any).code || error.name
      return retryableErrors.includes(errorCode)
    }

    return false
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats() {
    return this.errorReporter.getErrorStats()
  }

  /**
   * Get current error metrics
   */
  getErrorMetrics() {
    return this.errorReporter.getMetrics()
  }
}