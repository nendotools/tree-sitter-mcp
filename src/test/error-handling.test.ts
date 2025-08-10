/**
 * Error handling tests for MCP tools
 */

import { describe, it, expect } from 'vitest'
import { ErrorFactory, ErrorCategory, McpOperationError, formatError } from '../types/error-types.js'

describe('Error Handling', () => {
  describe('ErrorFactory', () => {
    it('should create project not found error', () => {
      const error = ErrorFactory.projectNotFound('test-project')
      expect(error).toBeInstanceOf(McpOperationError)
      expect(error.category).toBe(ErrorCategory.PROJECT)
      expect(error.message).toBe('Project "test-project" not found')
      expect(error.code).toBe('PROJECT_NOT_FOUND')
      expect(error.context).toEqual({ projectId: 'test-project' })
    })

    it('should create validation error', () => {
      const error = ErrorFactory.validationError('projectId', null)
      expect(error).toBeInstanceOf(McpOperationError)
      expect(error.category).toBe(ErrorCategory.VALIDATION)
      expect(error.message).toBe('Invalid value for projectId')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.context).toEqual({ field: 'projectId', value: null })
    })

    it('should create directory not found error', () => {
      const error = ErrorFactory.directoryNotFound('/nonexistent')
      expect(error).toBeInstanceOf(McpOperationError)
      expect(error.category).toBe(ErrorCategory.FILESYSTEM)
      expect(error.message).toBe('Directory not found: /nonexistent')
      expect(error.code).toBe('DIRECTORY_NOT_FOUND')
      expect(error.context).toEqual({ directory: '/nonexistent' })
    })

    it('should create invalid query error', () => {
      const error = ErrorFactory.invalidQuery('')
      expect(error).toBeInstanceOf(McpOperationError)
      expect(error.category).toBe(ErrorCategory.SEARCH)
      expect(error.message).toBe('Invalid search query: ')
      expect(error.code).toBe('INVALID_QUERY')
      expect(error.context).toEqual({ query: '' })
    })

    it('should create system error', () => {
      const error = ErrorFactory.systemError('parsing', 'memory exhausted')
      expect(error).toBeInstanceOf(McpOperationError)
      expect(error.category).toBe(ErrorCategory.SYSTEM)
      expect(error.message).toBe('System error during parsing: memory exhausted')
      expect(error.code).toBe('SYSTEM_ERROR')
      expect(error.context).toEqual({ operation: 'parsing', cause: 'memory exhausted' })
    })
  })

  describe('McpOperationError', () => {
    it('should convert to JSON format', () => {
      const error = new McpOperationError(
        ErrorCategory.PROJECT,
        'Test error message',
        'TEST_CODE',
        { key: 'value' },
      )

      const json = error.toJson()
      expect(json).toEqual({
        category: ErrorCategory.PROJECT,
        message: 'Test error message',
        code: 'TEST_CODE',
        context: { key: 'value' },
      })
    })

    it('should handle optional code and context', () => {
      const error = new McpOperationError(ErrorCategory.VALIDATION, 'Simple error')
      const json = error.toJson()

      expect(json).toEqual({
        category: ErrorCategory.VALIDATION,
        message: 'Simple error',
      })
      expect(json).not.toHaveProperty('code')
      expect(json).not.toHaveProperty('context')
    })
  })

  describe('formatError utility', () => {
    it('should format McpOperationError correctly', () => {
      const originalError = ErrorFactory.projectNotFound('test')
      const formatted = formatError(originalError)

      expect(formatted).toEqual({
        category: ErrorCategory.PROJECT,
        message: 'Project "test" not found',
        code: 'PROJECT_NOT_FOUND',
        context: { projectId: 'test' },
      })
    })

    it('should format regular Error objects', () => {
      const regularError = new Error('Regular error message')
      const formatted = formatError(regularError)

      expect(formatted).toEqual({
        category: ErrorCategory.SYSTEM,
        message: 'Regular error message',
        code: 'UNEXPECTED_ERROR',
      })
    })

    it('should format non-Error values', () => {
      const formatted = formatError('string error')

      expect(formatted).toEqual({
        category: ErrorCategory.SYSTEM,
        message: 'string error',
        code: 'UNKNOWN_ERROR',
      })
    })

    it('should format null/undefined values', () => {
      const formattedNull = formatError(null)
      const formattedUndefined = formatError(undefined)

      expect(formattedNull.message).toBe('null')
      expect(formattedUndefined.message).toBe('undefined')
      expect(formattedNull.category).toBe(ErrorCategory.SYSTEM)
      expect(formattedUndefined.category).toBe(ErrorCategory.SYSTEM)
    })
  })

  describe('Error Categories', () => {
    it('should have all expected categories', () => {
      expect(ErrorCategory.PROJECT).toBe('project')
      expect(ErrorCategory.FILESYSTEM).toBe('filesystem')
      expect(ErrorCategory.PARSING).toBe('parsing')
      expect(ErrorCategory.SEARCH).toBe('search')
      expect(ErrorCategory.VALIDATION).toBe('validation')
      expect(ErrorCategory.SYSTEM).toBe('system')
    })
  })
})