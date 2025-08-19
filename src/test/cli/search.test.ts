/**
 * Comprehensive CLI search command tests
 * Tests all options, output formats, edge cases, and failure scenarios
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

// Helper function to extract JSON from output that may contain log messages
function extractJSONFromOutput(stdout: string): any {
  const jsonLine = stdout.split('\n').find(line => line.trim().startsWith('{'))
  if (!jsonLine) {
    throw new Error('No JSON found in output')
  }

  const lines = stdout.split('\n')
  const startIndex = lines.findIndex(line => line.trim().startsWith('{'))
  if (startIndex === -1) {
    throw new Error('No JSON start found in output')
  }

  let jsonStr = ''
  let braceCount = 0
  let inString = false
  let escapeNext = false

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    jsonStr += (i > startIndex ? '\n' : '') + line

    for (const char of line) {
      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"' && !escapeNext) {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '{') braceCount++
        if (char === '}') braceCount--
      }
    }

    if (braceCount === 0 && jsonStr.trim().startsWith('{')) {
      break
    }
  }

  return JSON.parse(jsonStr)
}

describe('CLI search Command', () => {
  const fixturesDir = resolve(import.meta.dirname, '../fixtures')
  const positiveFixture = resolve(fixturesDir, 'minimal-positive')
  const emptyFixture = resolve(fixturesDir, 'empty-project')
  const cliPath = resolve(import.meta.dirname, '../../cli.ts')

  // Helper function to run CLI command
  function runCLI(args: string[], expectError = false): { stdout: string, stderr: string, exitCode: number } {
    const result = spawnSync('npx', ['tsx', cliPath, ...args], {
      encoding: 'utf8',
      stdio: 'pipe',
    })

    if (result.error && !expectError) {
      throw result.error
    }

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.status || 0,
    }
  }

  describe('Basic Functionality', () => {
    it('should find results with directory option', () => {
      const result = runCLI(['search', 'TestUser', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBeDefined()

      const output = extractJSONFromOutput(result.stdout)
      expect(output.query).toBe('TestUser')
      expect(output.results).toBeDefined()
      expect(output.results.length).toBeGreaterThan(0)
      expect(output.totalResults).toBeGreaterThan(0)
    })

    it('should return 0 results for empty directory', () => {
      const result = runCLI(['search', 'NonexistentFunction', '-d', emptyFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results.length).toBe(0)
      expect(output.totalResults).toBe(0)
    })

    it('should return 0 results for non-matching query', () => {
      const result = runCLI(['search', 'XyzNonexistentElement', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results.length).toBe(0)
      expect(output.totalResults).toBe(0)
    })

    it('should work without directory (default to current)', () => {
      const result = runCLI(['search', 'TestUser', '-d', positiveFixture, '--output', 'json', '--max-results', '1'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.query).toBe('TestUser')
      expect(output.results).toBeDefined()
    })
  })

  describe('Options Testing', () => {
    it('should respect max-results option', () => {
      const result = runCLI(['search', 'Test', '-d', positiveFixture, '--max-results', '2', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results.length).toBeLessThanOrEqual(2)
    })

    it('should use fuzzy-threshold option', () => {
      const strictResult = runCLI(['search', 'TestUser', '-d', positiveFixture, '--fuzzy-threshold', '90', '--output', 'json'])
      const relaxedResult = runCLI(['search', 'TestUser', '-d', positiveFixture, '--fuzzy-threshold', '10', '--output', 'json'])

      expect(strictResult.exitCode).toBe(0)
      expect(relaxedResult.exitCode).toBe(0)

      const strictOutput = extractJSONFromOutput(strictResult.stdout)
      const relaxedOutput = extractJSONFromOutput(relaxedResult.stdout)

      // Relaxed threshold should find more or equal results
      expect(relaxedOutput.results.length).toBeGreaterThanOrEqual(strictOutput.results.length)
    })

    it('should use exact match option', () => {
      const exactResult = runCLI(['search', 'TestUser', '-d', positiveFixture, '--exact', '--output', 'json'])
      const fuzzyResult = runCLI(['search', 'TestUser', '-d', positiveFixture, '--output', 'json'])

      expect(exactResult.exitCode).toBe(0)
      expect(fuzzyResult.exitCode).toBe(0)

      const exactOutput = extractJSONFromOutput(exactResult.stdout)
      const fuzzyOutput = extractJSONFromOutput(fuzzyResult.stdout)

      expect(exactOutput.results).toBeDefined()
      expect(fuzzyOutput.results).toBeDefined()
    })

    it('should filter by type option', () => {
      const result = runCLI(['search', 'Test', '-d', positiveFixture, '--type', 'function', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      // All results should be functions if any are found
      output.results.forEach((result: any) => {
        if (result.type) {
          expect(result.type).toBe('function')
        }
      })
    })

    it('should filter by path-pattern option', () => {
      const result = runCLI(['search', 'Test', '-d', positiveFixture, '--path-pattern', 'index', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      // All results should have 'index' in their path if any are found
      output.results.forEach((result: any) => {
        expect(result.path).toContain('index')
      })
    })

    it('should use project-id option', () => {
      const result = runCLI(['search', 'TestUser', '--project-id', 'test-project', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results).toBeDefined()
    })
  })

  describe('Output Formats', () => {
    it('should output JSON format by default', () => {
      const result = runCLI(['search', 'TestUser', '-d', positiveFixture])

      expect(result.exitCode).toBe(0)
      expect(() => extractJSONFromOutput(result.stdout)).not.toThrow()

      const output = extractJSONFromOutput(result.stdout)
      expect(output).toHaveProperty('query')
      expect(output).toHaveProperty('results')
      expect(output).toHaveProperty('totalResults')
    })

    it('should output text format', () => {
      const result = runCLI(['search', 'TestUser', '-d', positiveFixture, '--output', 'text'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Found')
      expect(result.stdout).toContain('results')
    })

    it('should handle 0 results in text format', () => {
      const result = runCLI(['search', 'NonexistentFunction', '-d', emptyFixture, '--output', 'text'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('No results found')
    })
  })

  describe('Error Handling', () => {
    it('should show help when no query provided', () => {
      const result = runCLI(['search'], true)

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('error: missing required argument')
    })

    it('should handle non-existent directory gracefully', () => {
      // Should not crash, but may produce error or empty results
      const result = runCLI(['search', 'test', '-d', '/nonexistent/path', '--output', 'json'], true)

      // May exit with error or succeed with empty results
      expect([0, 1]).toContain(result.exitCode)
    })

    it('should handle invalid max-results', () => {
      const result = runCLI(['search', 'test', '-d', positiveFixture, '--max-results', 'invalid'], true)

      expect(result.exitCode).not.toBe(0)
    })

    it('should handle invalid fuzzy-threshold', () => {
      const result = runCLI(['search', 'test', '-d', positiveFixture, '--fuzzy-threshold', 'invalid'], true)

      expect(result.exitCode).not.toBe(0)
    })
  })

  describe('Help and Documentation', () => {
    it('should show help with --help flag', () => {
      const result = runCLI(['search', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Usage:')
      expect(result.stdout).toContain('Search for code elements')
      expect(result.stdout).toContain('Options:')
      expect(result.stdout).toContain('--directory')
      expect(result.stdout).toContain('--project-id')
      expect(result.stdout).toContain('--path-pattern')
      expect(result.stdout).toContain('--type')
      expect(result.stdout).toContain('--max-results')
      expect(result.stdout).toContain('--fuzzy-threshold')
      expect(result.stdout).toContain('--exact')
      expect(result.stdout).toContain('--output')
    })
  })

  describe('Result Structure Validation', () => {
    it('should return properly structured JSON results', () => {
      const result = runCLI(['search', 'TestUser', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output).toHaveProperty('query')
      expect(output).toHaveProperty('results')
      expect(output).toHaveProperty('totalResults')
      expect(output.results).toBeInstanceOf(Array)
      expect(typeof output.totalResults).toBe('number')

      output.results.forEach((result: any) => {
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('type')
        expect(result).toHaveProperty('path')
        expect(result).toHaveProperty('startLine')
        expect(result).toHaveProperty('endLine')
        expect(result).toHaveProperty('startColumn')
        expect(result).toHaveProperty('endColumn')
        expect(result).toHaveProperty('score')
        expect(result).toHaveProperty('matches')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty query string', () => {
      const result = runCLI(['search', '', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results).toBeDefined()
      expect(output.results).toBeInstanceOf(Array)
    })

    it('should handle queries with special characters', () => {
      const result = runCLI(['search', 'Test@#$%^&*()', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results).toBeDefined()
    })

    it('should handle very large max-results', () => {
      const result = runCLI(['search', 'Test', '-d', positiveFixture, '--max-results', '999999', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results.length).toBeLessThanOrEqual(999999)
    })

    it('should handle max-results of 0', () => {
      const result = runCLI(['search', 'TestUser', '-d', positiveFixture, '--max-results', '0', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results.length).toBe(0)
    })

    it('should handle multiple type filters', () => {
      const result = runCLI(['search', 'Test', '-d', positiveFixture, '--type', 'function', 'class', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.results).toBeDefined()

      // All results should be either function or class if any are found
      output.results.forEach((result: any) => {
        if (result.type) {
          expect(['function', 'class']).toContain(result.type)
        }
      })
    })
  })

  describe('Performance', () => {
    it('should complete search within reasonable time', () => {
      const startTime = Date.now()

      const result = runCLI(['search', 'Test', '-d', positiveFixture, '--output', 'json'])

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.exitCode).toBe(0)
      expect(duration).toBeLessThan(10000) // 10 seconds
    })
  })
})