/**
 * Integration tests for selective path ignores
 * Tests CLI and MCP ignore directories functionality
 * Optimized for CI/CD environments with shorter timeouts
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { spawnSync } from 'child_process'
import { handleToolRequest } from '../../mcp/handlers.js'
import type { JsonObject } from '../../types/core.js'

// CI/CD friendly timeout - 60 seconds per test max
const TEST_TIMEOUT = 60000

describe('Selective Path Ignores', () => {
  const fixturesDir = resolve(import.meta.dirname, '../fixtures')
  const ignoreTestFixture = resolve(fixturesDir, 'ignore-test')
  const cliPath = resolve(import.meta.dirname, '../../cli.ts')

  function runCLI(args: string[]): { stdout: string, stderr: string, exitCode: number } {
    const result = spawnSync('npx', ['tsx', cliPath, ...args], {
      encoding: 'utf8',
      stdio: 'pipe',
    })

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.status || 0,
    }
  }

  function extractJSONFromOutput(stdout: string): any {
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

  async function callMCPAnalyze(args: JsonObject) {
    return handleToolRequest({
      params: {
        name: 'analyze_code',
        arguments: args,
      },
    })
  }

  describe('CLI ignore directories', () => {
    it('should analyze without ignore directories', () => {
      const result = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output.findings).toBeDefined()
      expect(output.metrics).toBeDefined()
      expect(output.summary).toBeDefined()

      // Should find quality issues in problematic and legacy directories
      expect(output.findings.length).toBeGreaterThan(0)
    }, TEST_TIMEOUT)

    it('should analyze with ignore directories', () => {
      const result = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', 'problematic',
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output.findings).toBeDefined()
      expect(output.metrics).toBeDefined()
      expect(output.summary).toBeDefined()

      // Should not find issues in problematic directory when ignored
      const problematicFindings = output.findings.filter((f: any) => f.location && f.location.includes('problematic'))
      expect(problematicFindings.length).toBe(0)
    }, TEST_TIMEOUT)

    it('should analyze with multiple ignore directories', () => {
      const result = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', 'problematic', 'legacy',
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output.findings).toBeDefined()
      expect(output.metrics).toBeDefined()
      expect(output.summary).toBeDefined()

      // Should not find issues in any ignored directories
      output.findings.forEach((finding: any) => {
        if (finding.location) {
          expect(finding.location).not.toContain('problematic')
          expect(finding.location).not.toContain('legacy')
        }
      })
    }, TEST_TIMEOUT)

    it('should show help includes ignore-dirs option', () => {
      const result = runCLI(['analyze', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('--ignore-dirs')
      expect(result.stdout).toContain('Additional directories to ignore')
    }, 5000) // Help should be fast
  })

  describe('MCP ignore directories', () => {
    it('should analyze without ignore directories via MCP', async () => {
      const result = await callMCPAnalyze({
        directory: ignoreTestFixture,
        analysisTypes: ['quality'],
        maxResults: 10,
      })

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')

      const content = JSON.parse(result.content[0].text)
      expect(content.analysis).toBeDefined()
      expect(content.analysis.findings).toBeDefined()
      expect(content.analysis.metrics).toBeDefined()

      // Should find quality issues in problematic and legacy directories
      expect(content.analysis.findings.length).toBeGreaterThan(0)
    }, TEST_TIMEOUT)

    it('should analyze with ignore directories via MCP', async () => {
      const result = await callMCPAnalyze({
        directory: ignoreTestFixture,
        ignoreDirs: ['problematic'],
        analysisTypes: ['quality'],
        maxResults: 10,
      })

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')

      const content = JSON.parse(result.content[0].text)
      expect(content.analysis).toBeDefined()
      expect(content.analysis.findings).toBeDefined()
      expect(content.analysis.metrics).toBeDefined()

      // Should not find issues in problematic directory
      const problematicFindings = content.analysis.findings.filter((f: any) => f.location && f.location.includes('problematic'))
      expect(problematicFindings.length).toBe(0)
    }, TEST_TIMEOUT)

    it('should analyze with multiple ignore directories via MCP', async () => {
      const result = await callMCPAnalyze({
        directory: ignoreTestFixture,
        ignoreDirs: ['problematic', 'legacy'],
        analysisTypes: ['quality'],
        maxResults: 10,
      })

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')

      const content = JSON.parse(result.content[0].text)
      expect(content.analysis).toBeDefined()
      expect(content.analysis.findings).toBeDefined()
      expect(content.analysis.metrics).toBeDefined()

      // Should not find issues in any ignored directories
      content.analysis.findings.forEach((finding: any) => {
        if (finding.location) {
          expect(finding.location).not.toContain('problematic')
          expect(finding.location).not.toContain('legacy')
        }
      })
    }, TEST_TIMEOUT)

    it('should handle empty ignore directories array', async () => {
      const result = await callMCPAnalyze({
        directory: ignoreTestFixture,
        ignoreDirs: [],
        analysisTypes: ['quality'],
        maxResults: 10,
      })

      expect(result.content).toBeDefined()
      const content = JSON.parse(result.content[0].text)
      expect(content.analysis).toBeDefined()
      expect(content.analysis.findings.length).toBeGreaterThan(0)
    }, TEST_TIMEOUT)
  })

  describe('Ignore directories validation', () => {
    it('should validate ignore directories are actually applied', () => {
      // Test that ignore directories actually work by checking file count
      const withoutIgnore = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      expect(withoutIgnore.exitCode).toBe(0)
      extractJSONFromOutput(withoutIgnore.stdout)

      // Run with ignore directories
      const withIgnore = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', 'problematic', 'legacy',
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      if (withIgnore.exitCode !== 0) {
        console.log('Search stderr:', withIgnore.stderr)
        console.log('Search stdout:', withIgnore.stdout)
      }
      expect(withIgnore.exitCode).toBe(0)
      const withOutput = extractJSONFromOutput(withIgnore.stdout)

      expect(withOutput.findings).toBeDefined()
      expect(withOutput.metrics).toBeDefined()

      // The key test: verify that we're actually processing fewer files
      // This checks that the ignore logic is working at the file discovery level
      const withoutFileCount = parseInt(withoutIgnore.stdout.match(/Found (\d+) files to parse/)?.[1] || '0')
      const withIgnoreFileCount = parseInt(withIgnore.stdout.match(/Found (\d+) files to parse/)?.[1] || '0')

      // With ignore directories, we should process fewer files
      expect(withIgnoreFileCount).toBeLessThan(withoutFileCount)
      expect(withIgnoreFileCount).toBeGreaterThan(0) // But still find some files

      // Validate findings are actually reduced - files in ignored directories shouldn't appear
      const ignoredFindings = withOutput.findings.filter((f: any) =>
        f.location && (f.location.includes('problematic') || f.location.includes('legacy')),
      )
      expect(ignoredFindings.length).toBe(0)
    }, TEST_TIMEOUT * 2) // Double timeout for validation test that runs two analyses

    it('should validate ignore directories work with find-usage', () => {
      // Test find-usage with ignore directories
      const result = runCLI([
        'find-usage',
        'main',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', 'problematic', 'legacy',
        '--max-results', '10',
        '--output', 'json',
      ])

      if (result.exitCode !== 0) {
        console.log('Find usage stderr:', result.stderr)
        console.log('Find usage stdout:', result.stdout)
      }
      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output.usages).toBeDefined()

      // Key validation: check that we're processing files in the fixture directory
      const fileCount = parseInt(result.stdout.match(/Found (\d+) files to parse/)?.[1] || '0')
      expect(fileCount).toBeGreaterThan(0) // Should find some files
      expect(fileCount).toBeLessThan(10) // But should be a small number for our fixture

      // None of the usages should be in ignored directories
      if (output.usages && output.usages.length > 0) {
        output.usages.forEach((usage: any) => {
          expect(usage.path).not.toContain('problematic')
          expect(usage.path).not.toContain('legacy')
        })
      }
    }, TEST_TIMEOUT)

    it('should validate ignore directories work with errors check', () => {
      const result = runCLI([
        'errors',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', 'problematic', 'legacy',
        '--max-results', '50',
        '--output', 'json',
      ])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)

      expect(output.errors).toBeDefined()
      // None of the errors should be in ignored directories
      if (output.errors && output.errors.errors && output.errors.errors.length > 0) {
        output.errors.errors.forEach((error: any) => {
          expect(error.file).not.toContain('problematic')
          expect(error.file).not.toContain('legacy')
        })
      }
    }, TEST_TIMEOUT)
  })

  describe('Edge cases', () => {
    it('should handle non-existent ignore directories gracefully', () => {
      const result = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', 'non-existent-directory',
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
      expect(output.findings.length).toBeGreaterThan(0)
    })

    it('should handle ignore directories with special characters', () => {
      const result = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', '@special-chars#$%',
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()
      expect(output.findings.length).toBeGreaterThan(0)
    })

    it('should handle duplicate ignore directories', () => {
      const result = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', 'problematic', 'problematic',
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      expect(result.exitCode).toBe(0)
      const output = extractJSONFromOutput(result.stdout)
      expect(output.findings).toBeDefined()

      // Should still ignore problematic directory correctly
      const problematicFindings = output.findings.filter((f: any) => f.location && f.location.includes('problematic'))
      expect(problematicFindings.length).toBe(0)
    })
  })

  describe('Performance with ignore directories', () => {
    it('should complete faster with ignore directories due to fewer files', () => {
      const startTimeWithIgnore = Date.now()

      const withIgnore = runCLI([
        'analyze',
        '--directory', ignoreTestFixture,
        '--ignore-dirs', 'problematic', 'legacy',
        '--analysis-types', 'quality',
        '--max-results', '10',
        '--output', 'json',
      ])

      const durationWithIgnore = Date.now() - startTimeWithIgnore

      expect(withIgnore.exitCode).toBe(0)
      expect(durationWithIgnore).toBeLessThan(10000) // Should complete within 10 seconds (small fixture)

      const output = extractJSONFromOutput(withIgnore.stdout)
      expect(output.findings).toBeDefined()

      // Should only find issues in main src files, not in ignored directories
      output.findings.forEach((finding: any) => {
        if (finding.location) {
          expect(finding.location).not.toContain('problematic')
          expect(finding.location).not.toContain('legacy')
        }
      })
    })
  })
})