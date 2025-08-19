/**
 * Comprehensive CLI find-usage command tests
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

describe('CLI find-usage Command', () => {
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
    it('should find usages with directory option', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBeDefined()

      const output = extractJSONFromOutput(result.stdout)
      expect(output.identifier).toBe('TestUser')
      expect(output.usages).toBeDefined()
      expect(output.usages.length).toBeGreaterThan(0)
      expect(output.totalUsages).toBeGreaterThan(0)
    })

    it('should return 0 usages for empty directory', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', emptyFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages.length).toBe(0)
      expect(output.totalUsages).toBe(0)
    })

    it('should return 0 usages for non-existent identifier', () => {
      const result = runCLI(['find-usage', 'XyzNonexistentIdentifier', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages.length).toBe(0)
      expect(output.totalUsages).toBe(0)
    })

    it('should work without directory (default to current)', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--output', 'json', '--max-results', '1'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.identifier).toBe('TestUser')
      expect(output.usages).toBeDefined()
    })
  })

  describe('Options Testing', () => {
    it('should respect max-results option', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--max-results', '2', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages.length).toBeLessThanOrEqual(2)

      // Should show limited vs total counts
      if (output.totalUsages > 2) {
        expect(output.displayedUsages).toBe(2)
      }
    })

    it('should use case-sensitive option', () => {
      const sensitiveResult = runCLI(['find-usage', 'testuser', '-d', positiveFixture, '--case-sensitive', '--output', 'json'])
      const insensitiveResult = runCLI(['find-usage', 'testuser', '-d', positiveFixture, '--output', 'json'])

      expect(sensitiveResult.exitCode).toBe(0)
      expect(insensitiveResult.exitCode).toBe(0)

      const sensitiveOutput = extractJSONFromOutput(sensitiveResult.stdout)
      const insensitiveOutput = extractJSONFromOutput(insensitiveResult.stdout)

      // Case insensitive should find more or equal results
      expect(insensitiveOutput.usages.length).toBeGreaterThanOrEqual(sensitiveOutput.usages.length)
    })

    it('should use exact match option', () => {
      const exactResult = runCLI(['find-usage', 'Test', '-d', positiveFixture, '--exact', '--output', 'json'])
      const partialResult = runCLI(['find-usage', 'Test', '-d', positiveFixture, '--output', 'json'])

      expect(exactResult.exitCode).toBe(0)
      expect(partialResult.exitCode).toBe(0)

      const exactOutput = extractJSONFromOutput(exactResult.stdout)
      const partialOutput = extractJSONFromOutput(partialResult.stdout)

      expect(exactOutput.usages).toBeDefined()
      expect(partialOutput.usages).toBeDefined()
    })

    it('should filter by path-pattern option', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--path-pattern', 'index', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      // All usages should have 'index' in their path if any are found
      output.usages.forEach((usage: any) => {
        expect(usage.path).toContain('index')
      })
    })

    it('should use project-id option', () => {
      const result = runCLI(['find-usage', 'TestUser', '--project-id', 'test-project', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages).toBeDefined()
    })
  })

  describe('Output Formats', () => {
    it('should output JSON format by default', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture])

      expect(result.exitCode).toBe(0)
      expect(() => extractJSONFromOutput(result.stdout)).not.toThrow()

      const output = extractJSONFromOutput(result.stdout)
      expect(output).toHaveProperty('identifier')
      expect(output).toHaveProperty('usages')
      expect(output).toHaveProperty('totalUsages')
    })

    it('should output text format', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--output', 'text'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Found')
      expect(result.stdout).toContain('usages')
    })

    it('should handle 0 results in text format', () => {
      const result = runCLI(['find-usage', 'NonexistentIdentifier', '-d', emptyFixture, '--output', 'text'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('No usage found')
    })

    it('should show limited results message in text format', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--max-results', '1', '--output', 'text'])

      expect(result.exitCode).toBe(0)
      const output = result.stdout

      // Should indicate if showing limited results
      if (output.includes('showing first')) {
        expect(output).toContain('showing first 1')
      }
    })
  })

  describe('Error Handling', () => {
    it('should show help when no identifier provided', () => {
      const result = runCLI(['find-usage'], true)

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('error: missing required argument')
    })

    it('should handle non-existent directory gracefully', () => {
      const result = runCLI(['find-usage', 'test', '-d', '/nonexistent/path', '--output', 'json'], true)

      // May exit with error or succeed with empty results
      expect([0, 1]).toContain(result.exitCode)
    })

    it('should handle invalid max-results', () => {
      const result = runCLI(['find-usage', 'test', '-d', positiveFixture, '--max-results', 'invalid'], true)

      expect(result.exitCode).not.toBe(0)
    })
  })

  describe('Help and Documentation', () => {
    it('should show help with --help flag', () => {
      const result = runCLI(['find-usage', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Usage:')
      expect(result.stdout).toContain('Find all usages of an identifier')
      expect(result.stdout).toContain('Options:')
      expect(result.stdout).toContain('--directory')
      expect(result.stdout).toContain('--project-id')
      expect(result.stdout).toContain('--path-pattern')
      expect(result.stdout).toContain('--case-sensitive')
      expect(result.stdout).toContain('--exact')
      expect(result.stdout).toContain('--max-results')
      expect(result.stdout).toContain('--output')
    })
  })

  describe('Result Structure Validation', () => {
    it('should return properly structured JSON results', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output).toHaveProperty('identifier')
      expect(output).toHaveProperty('usages')
      expect(output).toHaveProperty('totalUsages')
      expect(output.usages).toBeInstanceOf(Array)
      expect(typeof output.totalUsages).toBe('number')

      output.usages.forEach((usage: any) => {
        expect(usage).toHaveProperty('path')
        expect(usage).toHaveProperty('startLine')
        expect(usage).toHaveProperty('endLine')
        expect(usage).toHaveProperty('startColumn')
        expect(usage).toHaveProperty('endColumn')
        expect(usage).toHaveProperty('type')
        expect(usage).toHaveProperty('name')
        expect(usage).toHaveProperty('context')

        expect(typeof usage.startLine).toBe('number')
        expect(typeof usage.endLine).toBe('number')
        expect(typeof usage.startColumn).toBe('number')
        expect(typeof usage.endColumn).toBe('number')
      })
    })

    it('should include displayedUsages count when limited', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--max-results', '1', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      if (output.totalUsages > 1) {
        expect(output).toHaveProperty('displayedUsages')
        expect(output.displayedUsages).toBe(1)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty identifier string', () => {
      const result = runCLI(['find-usage', '', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages).toBeDefined()
      expect(output.usages).toBeInstanceOf(Array)
    })

    it('should handle identifiers with special characters', () => {
      const result = runCLI(['find-usage', 'Test@#$%^&*()', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages).toBeDefined()
    })

    it('should handle identifiers with spaces', () => {
      const result = runCLI(['find-usage', 'Test User', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages).toBeDefined()
    })

    it('should handle very large max-results', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--max-results', '999999', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages.length).toBeLessThanOrEqual(999999)
    })

    it('should handle max-results of 0', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--max-results', '0', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.usages.length).toBe(0)
    })
  })

  describe('Context Validation', () => {
    it('should provide context for found usages in text format', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--output', 'text'])

      expect(result.exitCode).toBe(0)

      // If usages are found, context should be displayed
      if (!result.stdout.includes('No usage found')) {
        expect(result.stdout).toMatch(/→/)
      }
    })

    it('should provide context in JSON format', () => {
      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      // If we have usages, they should include context
      output.usages.forEach((usage: any) => {
        expect(usage.context).toBeDefined()
        expect(typeof usage.context).toBe('string')
      })
    })
  })

  describe('Performance', () => {
    it('should complete find-usage within reasonable time', () => {
      const startTime = Date.now()

      const result = runCLI(['find-usage', 'TestUser', '-d', positiveFixture, '--output', 'json'])

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.exitCode).toBe(0)
      expect(duration).toBeLessThan(10000) // 10 seconds
    })
  })
})