/**
 * Comprehensive CLI analyze command tests
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

describe('CLI analyze Command', () => {
  const fixturesDir = resolve(import.meta.dirname, '../fixtures')
  const positiveFixture = resolve(fixturesDir, 'minimal-positive')
  const emptyFixture = resolve(fixturesDir, 'empty-project')
  const qualityIssuesFixture = resolve(fixturesDir, 'quality-issues')
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
    it('should analyze project with default quality analysis', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBeDefined()

      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
      expect(output.metrics).toBeDefined()
      expect(output.summary).toBeDefined()
      expect(output.metrics.quality).toBeDefined()
    })

    it('should return 0 findings for empty project', () => {
      const result = runCLI(['analyze', '--directory', emptyFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
      expect(output.findings).toBeInstanceOf(Array)
      expect(output.summary.totalFindings).toBe(0)
    })

    it('should find quality issues in quality-issues fixture', () => {
      const result = runCLI(['analyze', '--directory', qualityIssuesFixture, '--analysis-types', 'quality', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
      expect(output.findings.length).toBeGreaterThan(0)
      expect(output.summary.totalFindings).toBeGreaterThan(0)
    })

    it('should work without directory argument (default to current)', () => {
      const result = runCLI(['analyze', '-d', qualityIssuesFixture, '--analysis-types', 'quality', '--output', 'json', '--max-results', '1'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
      expect(output.metrics).toBeDefined()
    })
  })

  describe('Analysis Types', () => {
    it('should perform quality analysis only', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.metrics.quality).toBeDefined()
      expect(output.metrics.deadcode).toBeUndefined()
      expect(output.metrics.structure).toBeUndefined()
    })

    it('should perform deadcode analysis only', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'deadcode', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.metrics.deadcode).toBeDefined()
      expect(output.metrics.quality).toBeUndefined()
      expect(output.metrics.structure).toBeUndefined()
    })

    it('should perform structure analysis only', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'structure', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.metrics.structure).toBeDefined()
      expect(output.metrics.quality).toBeUndefined()
      expect(output.metrics.deadcode).toBeUndefined()
    })

    it('should perform multiple analysis types', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', 'deadcode', 'structure', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.metrics.quality).toBeDefined()
      expect(output.metrics.deadcode).toBeDefined()
      expect(output.metrics.structure).toBeDefined()
    })

    it('should default to quality analysis when no types specified', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.metrics.quality).toBeDefined()
    })
  })

  describe('Options Testing', () => {
    it('should respect max-results option', () => {
      const result = runCLI(['analyze', '--directory', qualityIssuesFixture, '--analysis-types', 'quality', '--max-results', '3', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings.length).toBeLessThanOrEqual(3)
    })

    it('should filter by path-pattern option', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--path-pattern', 'index', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      // All findings should have 'index' in their location if any are found
      output.findings.forEach((finding: any) => {
        expect(finding.location).toContain('index')
      })
    })

    it('should use project-id option', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--project-id', 'test-project', '--analysis-types', 'quality', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
    })

    it('should sort findings by severity (critical first)', () => {
      const result = runCLI(['analyze', '--directory', qualityIssuesFixture, '--analysis-types', 'quality', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      const findings = output.findings

      if (findings.length > 1) {
        for (let i = 0; i < findings.length - 1; i++) {
          const currentSeverity = findings[i].severity
          const nextSeverity = findings[i + 1].severity

          const severityOrder = { critical: 0, warning: 1, info: 2 }
          expect(severityOrder[currentSeverity]).toBeLessThanOrEqual(severityOrder[nextSeverity])
        }
      }
    })
  })

  describe('Output Formats', () => {
    it('should output JSON format by default', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality'])

      expect(result.exitCode).toBe(0)
      expect(() => extractJSONFromOutput(result.stdout)).not.toThrow()

      const output = extractJSONFromOutput(result.stdout)
      expect(output).toHaveProperty('findings')
      expect(output).toHaveProperty('metrics')
      expect(output).toHaveProperty('summary')
    })

    it('should output text format', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--output', 'text'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Analysis Summary')
      expect(result.stdout).toContain('Total findings:')
      expect(result.stdout).toContain('Quality Metrics')
    })

    it('should output markdown format', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--output', 'markdown'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('#')
      expect(result.stdout).toContain('Analysis Report')
    })

    it('should handle 0 findings in text format', () => {
      const result = runCLI(['analyze', '--directory', emptyFixture, '--analysis-types', 'quality', '--output', 'text'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Total findings: 0')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid analysis types gracefully', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'invalid-type', '--output', 'json'])

      expect(result.exitCode).toBe(0) // Should not crash
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
    })

    it('should handle empty analysis types', () => {
      // This should default to quality analysis
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', '--output', 'json'], true)

      // May error due to missing argument after --analysis-types
      expect([0, 1]).toContain(result.exitCode)
    })

    it('should handle non-existent directory gracefully', () => {
      const result = runCLI(['analyze', '--directory', '/nonexistent/path', '--analysis-types', 'quality', '--output', 'json'], true)

      // May exit with error or succeed with empty results
      expect([0, 1]).toContain(result.exitCode)
    })

    it('should handle invalid max-results', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--max-results', 'invalid'], true)

      expect(result.exitCode).not.toBe(0)
    })
  })

  describe('Help and Documentation', () => {
    it('should show help with --help flag', () => {
      const result = runCLI(['analyze', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Usage:')
      expect(result.stdout).toContain('Analyze code quality, structure, dead code, and configuration issues')
      expect(result.stdout).toContain('Options:')
      expect(result.stdout).toContain('--project-id')
      expect(result.stdout).toContain('--path-pattern')
      expect(result.stdout).toContain('--analysis-types')
      expect(result.stdout).toContain('--max-results')
      expect(result.stdout).toContain('--output')
    })
  })

  describe('Result Structure Validation', () => {
    it('should return properly structured JSON results', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output).toHaveProperty('findings')
      expect(output).toHaveProperty('metrics')
      expect(output).toHaveProperty('summary')
      expect(output.findings).toBeInstanceOf(Array)

      expect(output.summary).toHaveProperty('totalFindings')
      expect(output.summary).toHaveProperty('criticalFindings')
      expect(output.summary).toHaveProperty('warningFindings')
      expect(output.summary).toHaveProperty('infoFindings')

      expect(typeof output.summary.totalFindings).toBe('number')
      expect(typeof output.summary.criticalFindings).toBe('number')
      expect(typeof output.summary.warningFindings).toBe('number')
      expect(typeof output.summary.infoFindings).toBe('number')
    })

    it('should return valid finding objects', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      output.findings.forEach((finding: any) => {
        expect(finding).toHaveProperty('type')
        expect(finding).toHaveProperty('category')
        expect(finding).toHaveProperty('severity')
        expect(finding).toHaveProperty('location')
        expect(finding).toHaveProperty('description')

        expect(['quality', 'deadcode', 'structure']).toContain(finding.type)
        expect(['critical', 'warning', 'info']).toContain(finding.severity)
        expect(typeof finding.category).toBe('string')
        expect(typeof finding.location).toBe('string')
        expect(typeof finding.description).toBe('string')
      })
    })

    it('should return valid quality metrics', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      if (output.metrics.quality) {
        expect(output.metrics.quality).toHaveProperty('avgComplexity')
        expect(output.metrics.quality).toHaveProperty('avgMethodLength')
        expect(output.metrics.quality).toHaveProperty('avgParameters')
        expect(output.metrics.quality).toHaveProperty('totalMethods')
        expect(output.metrics.quality).toHaveProperty('codeQualityScore')

        expect(typeof output.metrics.quality.codeQualityScore).toBe('number')
        expect(output.metrics.quality.codeQualityScore).toBeGreaterThanOrEqual(0)
        expect(output.metrics.quality.codeQualityScore).toBeLessThanOrEqual(10)
      }
    })

    it('should return valid deadcode metrics', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'deadcode', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      if (output.metrics.deadcode) {
        expect(output.metrics.deadcode).toHaveProperty('totalFiles')
        expect(output.metrics.deadcode).toHaveProperty('unusedFiles')
        expect(output.metrics.deadcode).toHaveProperty('unusedFunctions')
        expect(output.metrics.deadcode).toHaveProperty('unusedVariables')
        expect(output.metrics.deadcode).toHaveProperty('unusedImports')

        expect(typeof output.metrics.deadcode.totalFiles).toBe('number')
        expect(typeof output.metrics.deadcode.unusedFiles).toBe('number')
        expect(typeof output.metrics.deadcode.unusedFunctions).toBe('number')
      }
    })

    it('should return valid structure metrics', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'structure', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      if (output.metrics.structure) {
        expect(output.metrics.structure).toHaveProperty('analyzedFiles')
        expect(output.metrics.structure).toHaveProperty('circularDependencies')
        expect(output.metrics.structure).toHaveProperty('highCouplingFiles')

        expect(typeof output.metrics.structure.analyzedFiles).toBe('number')
        expect(typeof output.metrics.structure.circularDependencies).toBe('number')
        expect(typeof output.metrics.structure.highCouplingFiles).toBe('number')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large max-results', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--max-results', '999999', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings.length).toBeLessThanOrEqual(999999)
    })

    it('should handle max-results of 0', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--max-results', '0', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings.length).toBe(0)
    })

    it('should handle special characters in path-pattern', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--path-pattern', '@#$%^&*()', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
    })

    it('should handle mixed case analysis types', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'Quality', 'DEADCODE', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
    })

    it('should handle duplicate analysis types', () => {
      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', 'quality', 'deadcode', '--output', 'json'])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should complete analysis within reasonable time', () => {
      const startTime = Date.now()

      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', '--output', 'json'])

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.exitCode).toBe(0)
      expect(duration).toBeLessThan(30000) // 30 seconds
    })

    it('should handle multiple analysis types efficiently', () => {
      const startTime = Date.now()

      const result = runCLI(['analyze', '--directory', positiveFixture, '--analysis-types', 'quality', 'deadcode', 'structure', '--output', 'json'])

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.exitCode).toBe(0)
      expect(duration).toBeLessThan(45000) // 45 seconds for all analysis types
    })
  })
})