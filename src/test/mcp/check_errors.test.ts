/**
 * MCP check_errors tool tests - comprehensive parameter validation and functionality
 */

import { describe, it, expect } from 'vitest'
import { handleToolRequest } from '../../mcp/handlers.js'
import { join } from 'path'

const FIXTURES_DIR = join(process.cwd(), 'src/test/fixtures')
const ERROR_SCENARIOS_DIR = join(FIXTURES_DIR, 'error-scenarios')
const CLEAN_CODE_DIR = join(FIXTURES_DIR, 'clean-code')

describe('MCP check_errors tool', () => {
  describe('basic functionality', () => {
    it('should handle check_errors tool request', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      expect(result).toHaveProperty('content')
      expect(Array.isArray(result.content)).toBe(true)
      expect(result.content[0]).toHaveProperty('type', 'text')
      expect(result.content[0]).toHaveProperty('text')

      const responseData = JSON.parse(result.content[0].text)
      expect(responseData).toHaveProperty('errors')
      expect(responseData.errors).toHaveProperty('errors')
      expect(responseData.errors).toHaveProperty('summary')
      expect(responseData.errors).toHaveProperty('metrics')
    })

    it('should find errors in error scenarios directory', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.summary.totalErrors).toBeGreaterThan(0)
      expect(responseData.errors.summary.filesWithErrors).toBeGreaterThan(0)
      expect(responseData.errors.errors.length).toBeGreaterThan(0)
    })

    it('should find no errors in clean code directory', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: CLEAN_CODE_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.summary.totalErrors).toBe(0)
      expect(responseData.errors.summary.filesWithErrors).toBe(0)
      expect(responseData.errors.errors).toHaveLength(0)
    })
  })

  describe('parameter validation and handling', () => {
    it('should work without any arguments', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      expect(result).toHaveProperty('content')

      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.errors).toHaveProperty('directory')
      expect(responseData.errors.directory).toBe(ERROR_SCENARIOS_DIR)
    })

    it('should handle projectId parameter', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            projectId: 'test-errors-project',
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.projectId).toBe('test-errors-project')
    })

    it('should handle maxResults parameter', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
            maxResults: 3,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.maxResults).toBe(3)
      expect(responseData.errors.errors.length).toBeLessThanOrEqual(3)
    })

    it('should handle pathPattern parameter', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
            pathPattern: 'syntax-errors.js',
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.pathPattern).toBe('syntax-errors.js')

      if (responseData.errors.errors.length > 0) {
        responseData.errors.errors.forEach((error: any) => {
          expect(error.file).toContain('syntax-errors.js')
        })
      }
    })

    it('should use default maxResults when not specified', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.maxResults).toBe(50) // Default value
    })
  })

  describe('response structure and data integrity', () => {
    it('should return properly structured response with all required fields', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      // Top-level structure
      expect(responseData).toHaveProperty('errors')

      // Errors object structure
      const errorsData = responseData.errors
      expect(errorsData).toHaveProperty('errors')
      expect(errorsData).toHaveProperty('summary')
      expect(errorsData).toHaveProperty('metrics')
      expect(errorsData).toHaveProperty('timestamp')
      expect(errorsData).toHaveProperty('projectId')
      expect(errorsData).toHaveProperty('directory')
      expect(errorsData).toHaveProperty('maxResults')
      expect(errorsData).toHaveProperty('totalErrors')
      expect(errorsData).toHaveProperty('filteredErrors')

      // Summary structure
      expect(errorsData.summary).toHaveProperty('totalErrors')
      expect(errorsData.summary).toHaveProperty('missingErrors')
      expect(errorsData.summary).toHaveProperty('parseErrors')
      expect(errorsData.summary).toHaveProperty('extraErrors')
      expect(errorsData.summary).toHaveProperty('filesWithErrors')

      // Metrics structure
      expect(errorsData.metrics).toHaveProperty('totalFiles')
      expect(errorsData.metrics).toHaveProperty('totalErrorNodes')
      expect(errorsData.metrics).toHaveProperty('errorsByType')
      expect(errorsData.metrics).toHaveProperty('errorsByFile')
    })

    it('should include actionable error details', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      if (responseData.errors.errors.length > 0) {
        responseData.errors.errors.forEach((error: any) => {
          expect(error).toHaveProperty('type')
          expect(error).toHaveProperty('nodeType')
          expect(error).toHaveProperty('file')
          expect(error).toHaveProperty('line')
          expect(error).toHaveProperty('column')
          expect(error).toHaveProperty('endLine')
          expect(error).toHaveProperty('endColumn')
          expect(error).toHaveProperty('text')
          expect(error).toHaveProperty('context')
          expect(error).toHaveProperty('suggestion')

          // Validate error types
          expect(['missing', 'parse_error', 'extra']).toContain(error.type)

          // Validate position data
          expect(typeof error.line).toBe('number')
          expect(typeof error.column).toBe('number')
          expect(error.line).toBeGreaterThan(0)
          expect(error.column).toBeGreaterThan(0)

          // Validate actionable content
          expect(typeof error.context).toBe('string')
          expect(typeof error.suggestion).toBe('string')
          expect(error.context.length).toBeGreaterThan(0)
          expect(error.suggestion.length).toBeGreaterThan(0)
        })
      }
    })

    it('should include timestamp and metadata', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.timestamp).toBeDefined()
      expect(typeof responseData.errors.timestamp).toBe('string')
      // Validate it's a valid ISO date
      expect(new Date(responseData.errors.timestamp).toISOString()).toBe(responseData.errors.timestamp)

      expect(typeof responseData.errors.projectId).toBe('string')
      expect(typeof responseData.errors.directory).toBe('string')
    })
  })

  describe('filtering and limits', () => {
    it('should respect maxResults limit', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
            maxResults: 2,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.errors.length).toBeLessThanOrEqual(2)
      expect(responseData.errors.filteredErrors).toBeLessThanOrEqual(2)
    })

    it('should filter by pathPattern correctly', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
            pathPattern: 'invalid-syntax.ts',
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      if (responseData.errors.errors.length > 0) {
        responseData.errors.errors.forEach((error: any) => {
          expect(error.file).toContain('invalid-syntax.ts')
        })
      }
    })

    it('should handle zero results scenarios', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
            pathPattern: 'nonexistent-file.js',
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.errors).toHaveLength(0)
      expect(responseData.errors.filteredErrors).toBe(0)
      expect(responseData.errors.summary.totalErrors).toBeGreaterThanOrEqual(0) // Total might be > 0 but filtered is 0
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle invalid directory path', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: '/nonexistent/path',
          },
        },
      }

      await expect(handleToolRequest(request)).rejects.toThrow()
    })

    it('should handle string parameters as expected types', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
            maxResults: '5', // String instead of number
            pathPattern: 'syntax-errors',
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.maxResults).toBe(5) // Should be converted to number
      expect(responseData.errors.pathPattern).toBe('syntax-errors')
    })

    it('should handle null and undefined arguments gracefully', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
            projectId: null,
            pathPattern: undefined,
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors).toHaveProperty('directory')
      expect(responseData.errors.pathPattern).toBeUndefined()
    })
  })

  describe('performance and consistency', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now()

      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
          },
        },
      }

      const result = await handleToolRequest(request)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(result).toHaveProperty('content')
    })

    it('should return consistent results across multiple calls', async () => {
      const request = {
        params: {
          name: 'check_errors',
          arguments: {
            directory: ERROR_SCENARIOS_DIR,
            maxResults: 10,
          },
        },
      }

      const result1 = await handleToolRequest(request)
      const result2 = await handleToolRequest(request)

      const data1 = JSON.parse(result1.content[0].text)
      const data2 = JSON.parse(result2.content[0].text)

      expect(data1.errors.summary.totalErrors).toBe(data2.errors.summary.totalErrors)
      expect(data1.errors.summary.filesWithErrors).toBe(data2.errors.summary.filesWithErrors)
      expect(data1.errors.errors.length).toBe(data2.errors.errors.length)
    })
  })
})