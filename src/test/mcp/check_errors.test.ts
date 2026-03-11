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
      expect(responseData).toHaveProperty('summary')
      expect(responseData).toHaveProperty('projectId')
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

      expect(responseData.summary.totalErrors).toBeGreaterThan(0)
      expect(responseData.summary.filesWithErrors).toBeGreaterThan(0)
      expect(responseData.errors.length).toBeGreaterThan(0)
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

      expect(responseData.summary.totalErrors).toBe(0)
      expect(responseData.summary.filesWithErrors).toBe(0)
      expect(responseData.errors).toHaveLength(0)
    })
  })

  describe('parameter validation and handling', () => {
    it('should work with directory argument', async () => {
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
      expect(responseData).toHaveProperty('projectId')
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

      expect(responseData.projectId).toBe('test-errors-project')
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

      expect(responseData.errors.length).toBeLessThanOrEqual(3)
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

      if (responseData.errors.length > 0) {
        responseData.errors.forEach((error: any) => {
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

      expect(responseData.errors.length).toBeLessThanOrEqual(50)
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

      expect(responseData).toHaveProperty('errors')
      expect(responseData).toHaveProperty('summary')
      expect(responseData).toHaveProperty('projectId')
      expect(responseData).toHaveProperty('totalSourceErrors')
      expect(responseData).toHaveProperty('filteredErrors')

      expect(responseData.summary).toHaveProperty('totalErrors')
      expect(responseData.summary).toHaveProperty('missingErrors')
      expect(responseData.summary).toHaveProperty('parseErrors')
      expect(responseData.summary).toHaveProperty('extraErrors')
      expect(responseData.summary).toHaveProperty('filesWithErrors')
    })

    it('should include condensed error details', async () => {
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

      if (responseData.errors.length > 0) {
        responseData.errors.forEach((error: any) => {
          expect(error).toHaveProperty('type')
          expect(error).toHaveProperty('nodeType')
          expect(error).toHaveProperty('file')
          expect(error).toHaveProperty('line')
          expect(error).toHaveProperty('endLine')
          expect(error).toHaveProperty('text')
          expect(error).toHaveProperty('suggestion')

          expect(['missing', 'parse_error', 'extra']).toContain(error.type)

          expect(typeof error.line).toBe('number')
          expect(error.line).toBeGreaterThan(0)

          expect(typeof error.suggestion).toBe('string')
          expect(error.suggestion.length).toBeGreaterThan(0)
        })
      }
    })

    it('should include project metadata', async () => {
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

      expect(typeof responseData.projectId).toBe('string')
      expect(typeof responseData.totalSourceErrors).toBe('number')
      expect(typeof responseData.filteredErrors).toBe('number')
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

      expect(responseData.errors.length).toBeLessThanOrEqual(2)
      expect(responseData.filteredErrors).toBeLessThanOrEqual(2)
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

      if (responseData.errors.length > 0) {
        responseData.errors.forEach((error: any) => {
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

      expect(responseData.errors).toHaveLength(0)
      expect(responseData.filteredErrors).toBe(0)
      expect(responseData.summary.totalErrors).toBeGreaterThanOrEqual(0)
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
            maxResults: '5',
            pathPattern: 'syntax-errors',
          },
        },
      }

      const result = await handleToolRequest(request)
      const responseData = JSON.parse(result.content[0].text)

      expect(responseData.errors.length).toBeLessThanOrEqual(5)
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

      expect(responseData).toHaveProperty('projectId')
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

      expect(duration).toBeLessThan(5000)
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

      expect(data1.summary.totalErrors).toBe(data2.summary.totalErrors)
      expect(data1.summary.filesWithErrors).toBe(data2.summary.filesWithErrors)
      expect(data1.errors.length).toBe(data2.errors.length)
    })
  })
})
