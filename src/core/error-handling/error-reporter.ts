/**
 * Centralized error reporting and monitoring system
 */

import { getLogger } from '../../utils/logger.js'
import { McpOperationError, ErrorCategory } from '../../types/error-types.js'

/**
 * Error context for enhanced reporting
 */
export interface ErrorContext {
  /** Operation being performed when error occurred */
  operation: string
  /** User/session identifier (if available) */
  userId?: string
  /** Request/session identifier */
  requestId?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Stack trace (for debugging) */
  stack?: string
  /** Timestamp of error */
  timestamp?: Date
}

/**
 * Error metrics for monitoring
 */
export interface ErrorMetrics {
  /** Total error count */
  totalErrors: number
  /** Errors by category */
  errorsByCategory: Record<ErrorCategory, number>
  /** Errors by code */
  errorsByCode: Record<string, number>
  /** Recent error rate (errors per minute) */
  recentErrorRate: number
}

/**
 * Centralized error reporter with monitoring and telemetry
 */
export class ErrorReporter {
  private static instance: ErrorReporter
  private errorCounts: Map<string, number> = new Map()
  private categoryECounts: Map<ErrorCategory, number> = new Map()
  private recentErrors: Array<{ timestamp: Date, code: string }> = []
  private logger = getLogger()

  private constructor() {
    // Initialize error counts
    this.resetMetrics()
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter()
    }
    return ErrorReporter.instance
  }

  /**
   * Report an error with full context and monitoring
   */
  reportError(
    error: McpOperationError | Error,
    context: Partial<ErrorContext> = {},
  ): void {
    const enhancedContext: ErrorContext = {
      operation: context.operation || 'unknown-operation',
      timestamp: new Date(),
      stack: error.stack,
      ...context,
    }

    // Log error with full context
    this.logError(error, enhancedContext)

    // Update metrics
    this.updateMetrics(error, enhancedContext)

    // Send to monitoring (if configured)
    this.sendToMonitoring(error, enhancedContext)

    // Check for error patterns and alerts
    this.checkErrorPatterns(error, enhancedContext)
  }

  /**
   * Log error with structured format
   */
  private logError(error: Error, context: ErrorContext): void {
    const errorData = {
      message: error.message,
      name: error.name,
      ...(error instanceof McpOperationError && {
        category: error.category,
        code: error.code,
        mcpContext: error.context,
      }),
      context,
    }

    this.logger.error('MCP Operation Error', errorData)
  }

  /**
   * Update error metrics for monitoring
   */
  private updateMetrics(error: Error, context: ErrorContext): void {
    const code = error instanceof McpOperationError ? error.code : 'UNKNOWN_ERROR'
    const category = error instanceof McpOperationError ? error.category : 'system'

    // Update error counts
    if (code) {
      this.errorCounts.set(code, (this.errorCounts.get(code) || 0) + 1)
    }
    this.categoryECounts.set(category as ErrorCategory, (this.categoryECounts.get(category as ErrorCategory) || 0) + 1)

    // Track recent errors for rate calculation
    this.recentErrors.push({ timestamp: context.timestamp!, code: code || 'UNKNOWN' })

    // Clean up old entries (keep last 100)
    if (this.recentErrors.length > 100) {
      this.recentErrors = this.recentErrors.slice(-100)
    }
  }

  /**
   * Send error to external monitoring service
   */
  private sendToMonitoring(error: Error, _context: ErrorContext): void {
    // This would integrate with monitoring services like:
    // - Sentry
    // - DataDog
    // - New Relic
    // - Custom telemetry endpoint

    // For now, we'll just log that monitoring would happen
    this.logger.debug('Error reported to monitoring', {
      errorType: error.name,
      operation: _context.operation,
      timestamp: _context.timestamp,
    })
  }

  /**
   * Check for error patterns and trigger alerts
   */
  private checkErrorPatterns(error: Error, _context: ErrorContext): void {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    // Count recent errors
    const recentErrorCount = this.recentErrors.filter(
      e => e.timestamp > fiveMinutesAgo,
    ).length

    // Alert on high error rate
    if (recentErrorCount > 10) {
      this.logger.warn('High error rate detected', {
        recentErrorCount,
        timeWindow: '5 minutes',
        latestError: error.message,
      })
    }

    // Alert on specific error patterns
    if (error instanceof McpOperationError) {
      const codeCount = this.errorCounts.get(error.code || '') || 0
      if (codeCount > 5) {
        this.logger.warn('Repeated error pattern detected', {
          errorCode: error.code,
          count: codeCount,
          message: error.message,
        })
      }
    }
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)

    const recentErrorsCount = this.recentErrors.filter(
      e => e.timestamp > oneMinuteAgo,
    ).length

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByCategory: Object.fromEntries(this.categoryECounts) as Record<ErrorCategory, number>,
      errorsByCode: Object.fromEntries(this.errorCounts),
      recentErrorRate: recentErrorsCount,
    }
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.errorCounts.clear()
    this.categoryECounts.clear()
    this.recentErrors = []
  }

  /**
   * Get error statistics for debugging
   */
  getErrorStats(): {
    topErrors: Array<{ code: string, count: number }>
    errorsByCategory: Array<{ category: ErrorCategory, count: number }>
  } {
    const topErrors = Array.from(this.errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const errorsByCategory = Array.from(this.categoryECounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    return { topErrors, errorsByCategory }
  }
}