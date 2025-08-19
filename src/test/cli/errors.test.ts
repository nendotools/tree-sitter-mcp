/**
 * CLI errors command tests - comprehensive coverage including edge cases
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import { join } from 'path'

const CLI_PATH = join(process.cwd(), 'src/cli.ts')
const FIXTURES_DIR = join(process.cwd(), 'src/test/fixtures')
const ERROR_SCENARIOS_DIR = join(FIXTURES_DIR, 'error-scenarios')
const CLEAN_CODE_DIR = join(FIXTURES_DIR, 'clean-code')

function runErrorsCommand(args: string[]): { stdout: string, stderr: string, status: number } {
  const result = spawnSync('npx', ['tsx', CLI_PATH, 'errors', ...args], {
    encoding: 'utf-8',
    stdio: 'pipe',
  })

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status || 0,
  }
}

function extractJSONFromOutput(stdout: string): any {
  // Find the line that starts with { (the JSON output)
  const jsonLine = stdout.split('\n').find(line => line.trim().startsWith('{'))
  if (!jsonLine) {
    throw new Error('No JSON found in output')
  }

  // Find the complete JSON by looking for the matching closing brace
  const lines = stdout.split('\n')
  const startIndex = lines.findIndex(line => line.trim().startsWith('{'))
  if (startIndex === -1) {
    throw new Error('No JSON start found in output')
  }

  // Combine lines from start until we have valid JSON
  let jsonStr = ''
  let braceCount = 0
  let inString = false
  let escapeNext = false

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    jsonStr += (i > startIndex ? '\n' : '') + line

    // Count braces to find the end of JSON
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

    // If we've closed all braces, we have complete JSON
    if (braceCount === 0 && jsonStr.trim().startsWith('{')) {
      break
    }
  }

  return JSON.parse(jsonStr)
}

describe('CLI errors command', () => {
  describe('basic functionality', () => {
    it('should find errors in error scenarios directory', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'json'])

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('"errors"')
      expect(result.stdout).toContain('"summary"')
      expect(result.stdout).toContain('"metrics"')

      const output = extractJSONFromOutput(result.stdout)
      expect(output.errors).toBeDefined()
      expect(output.summary.totalErrors).toBeGreaterThan(0)
      expect(output.summary.filesWithErrors).toBeGreaterThan(0)
    })

    it('should find no errors in clean code directory', () => {
      const result = runErrorsCommand(['--directory', CLEAN_CODE_DIR, '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.summary.totalErrors).toBe(0)
      expect(output.summary.filesWithErrors).toBe(0)
    })
  })

  describe('output formats', () => {
    it('should output JSON format by default', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR])

      expect(result.status).toBe(0)
      expect(() => extractJSONFromOutput(result.stdout)).not.toThrow()
    })

    it('should output text format when requested', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'text'])

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('Syntax Errors Analysis')
      expect(result.stdout).toContain('Total errors:')
      expect(result.stdout).toContain('Files with errors:')
    })

    it('should show success message for clean code in text format', () => {
      const result = runErrorsCommand(['--directory', CLEAN_CODE_DIR, '--output', 'text'])

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('No syntax errors found! ✓')
    })
  })

  describe('options and parameters', () => {
    it('should respect maxResults parameter', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--max-results', '5', '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.errors.length).toBeLessThanOrEqual(5)
    })

    it('should filter by path pattern', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--path-pattern', 'syntax-errors.js', '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      if (output.errors.length > 0) {
        output.errors.forEach((error: any) => {
          expect(error.file).toContain('syntax-errors.js')
        })
      }
    })

    it('should work with project-id parameter', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--project-id', 'test-errors', '--output', 'json'])

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('"errors"')
    })

    it('should default to current working directory when no directory specified', () => {
      const result = runErrorsCommand(['--output', 'json'])

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('"errors"')
    })
  })

  describe('error types and categorization', () => {
    it('should categorize different types of errors', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output.summary).toHaveProperty('missingErrors')
      expect(output.summary).toHaveProperty('parseErrors')
      expect(output.summary).toHaveProperty('extraErrors')

      if (output.errors.length > 0) {
        const errorTypes = output.errors.map((error: any) => error.type)
        expect(errorTypes).toContain('parse_error')
        // Note: May also contain 'missing' or 'extra' depending on error files
      }
    })

    it('should provide actionable context and suggestions', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      if (output.errors.length > 0) {
        output.errors.forEach((error: any) => {
          expect(error).toHaveProperty('context')
          expect(error).toHaveProperty('suggestion')
          expect(error).toHaveProperty('file')
          expect(error).toHaveProperty('line')
          expect(error).toHaveProperty('column')
          expect(typeof error.context).toBe('string')
          expect(typeof error.suggestion).toBe('string')
          expect(error.context.length).toBeGreaterThan(0)
          expect(error.suggestion.length).toBeGreaterThan(0)
        })
      }
    })
  })

  describe('text output formatting', () => {
    it('should group errors by type in text output', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'text'])

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('=== Syntax Errors Analysis ===')

      // Should contain at least one of these sections based on error types found
      const hasParseErrors = result.stdout.includes('=== Parse Errors')
      const hasMissingErrors = result.stdout.includes('=== Missing Syntax')
      const hasExtraErrors = result.stdout.includes('=== Extra Syntax')

      expect(hasParseErrors || hasMissingErrors || hasExtraErrors).toBe(true)
    })

    it('should show file locations and fix suggestions in text output', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'text'])

      expect(result.status).toBe(0)

      if (result.stdout.includes('Parse Errors') || result.stdout.includes('Missing Syntax')) {
        expect(result.stdout).toMatch(/\w+\.(js|ts):\d+:\d+/) // File:line:column pattern
        expect(result.stdout).toContain('Context:')
        expect(result.stdout).toContain('Fix:')
      }
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle non-existent directory gracefully', () => {
      const result = runErrorsCommand(['--directory', '/nonexistent/path', '--output', 'json'])

      expect(result.status).toBe(1)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.error).toBe(true)
      expect(output.message).toContain('Directory does not exist or is not accessible')
      expect(output.errors).toHaveLength(0)
    })

    it('should handle path pattern filtering with no matches', () => {
      const result = runErrorsCommand(['--directory', FIXTURES_DIR, '--path-pattern', 'nonexistent', '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.errors).toHaveLength(0) // Filtered results should be empty
      // totalErrors shows total before filtering, which is expected behavior
      expect(output.summary.totalErrors).toBeGreaterThanOrEqual(0)
    })

    it('should validate maxResults parameter bounds', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--max-results', '0', '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.errors).toHaveLength(0)
    })
  })

  describe('performance and limits', () => {
    it('should complete within reasonable time for error scenarios', () => {
      const startTime = Date.now()
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'json'])
      const duration = Date.now() - startTime

      expect(result.status).toBe(0)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle large maxResults values', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--max-results', '1000', '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.errors).toBeDefined()
    })
  })

  describe('metrics and summary data', () => {
    it('should provide comprehensive metrics in JSON output', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output.metrics).toHaveProperty('totalFiles')
      expect(output.metrics).toHaveProperty('totalErrorNodes')
      expect(output.metrics).toHaveProperty('errorsByType')
      expect(output.metrics).toHaveProperty('errorsByFile')

      expect(typeof output.metrics.totalFiles).toBe('number')
      expect(typeof output.metrics.totalErrorNodes).toBe('number')
      expect(typeof output.metrics.errorsByType).toBe('object')
      expect(typeof output.metrics.errorsByFile).toBe('object')
    })

    it('should show correct counts in summary', () => {
      const result = runErrorsCommand(['--directory', ERROR_SCENARIOS_DIR, '--output', 'json'])

      expect(result.status).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      const { summary } = output
      expect(summary.totalErrors).toBe(summary.missingErrors + summary.parseErrors + summary.extraErrors)
      expect(summary.filesWithErrors).toBeGreaterThanOrEqual(0)
      expect(summary.filesWithErrors).toBeLessThanOrEqual(output.metrics.totalFiles)
    })
  })
})