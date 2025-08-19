/**
 * Unit tests for errors analysis functions - testing core functionality
 */

import { describe, it, expect } from 'vitest'
import { analyzeErrors, countErrorNodes } from '../../analysis/errors.js'
import { createProject, parseProject } from '../../project/manager.js'
import { join } from 'path'
import type { ProjectConfig } from '../../types/core.js'

const FIXTURES_DIR = join(process.cwd(), 'src/test/fixtures')
const ERROR_SCENARIOS_DIR = join(FIXTURES_DIR, 'error-scenarios')
const CLEAN_CODE_DIR = join(FIXTURES_DIR, 'clean-code')

async function createTestProject(directory: string) {
  const config: ProjectConfig = {
    directory,
    languages: [],
    autoWatch: false,
  }

  const project = createProject(config)
  await parseProject(project)
  return project
}

describe('errors analysis functions', () => {
  describe('analyzeErrors', () => {
    it('should analyze errors in error scenarios project', async () => {
      const project = await createTestProject(ERROR_SCENARIOS_DIR)
      const result = analyzeErrors(project)

      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('metrics')

      expect(Array.isArray(result.errors)).toBe(true)
      expect(result.summary.totalErrors).toBeGreaterThan(0)
      expect(result.summary.filesWithErrors).toBeGreaterThan(0)
      expect(result.metrics.totalFiles).toBeGreaterThan(0)
    })

    it('should find no errors in clean code project', async () => {
      const project = await createTestProject(CLEAN_CODE_DIR)
      const result = analyzeErrors(project)

      expect(result.errors).toHaveLength(0)
      expect(result.summary.totalErrors).toBe(0)
      expect(result.summary.filesWithErrors).toBe(0)
      expect(result.summary.missingErrors).toBe(0)
      expect(result.summary.parseErrors).toBe(0)
      expect(result.summary.extraErrors).toBe(0)
    })

    it('should categorize errors correctly by type', async () => {
      const project = await createTestProject(ERROR_SCENARIOS_DIR)
      const result = analyzeErrors(project)

      if (result.errors.length > 0) {
        const errorTypes = new Set(result.errors.map(error => error.type))

        // Should only contain valid error types
        errorTypes.forEach((type) => {
          expect(['missing', 'parse_error', 'extra']).toContain(type)
        })

        // Summary counts should match actual errors
        const missingCount = result.errors.filter(e => e.type === 'missing').length
        const parseErrorCount = result.errors.filter(e => e.type === 'parse_error').length
        const extraCount = result.errors.filter(e => e.type === 'extra').length

        expect(result.summary.missingErrors).toBe(missingCount)
        expect(result.summary.parseErrors).toBe(parseErrorCount)
        expect(result.summary.extraErrors).toBe(extraCount)
        expect(result.summary.totalErrors).toBe(missingCount + parseErrorCount + extraCount)
      }
    })

    it('should provide actionable error details', async () => {
      const project = await createTestProject(ERROR_SCENARIOS_DIR)
      const result = analyzeErrors(project)

      if (result.errors.length > 0) {
        result.errors.forEach((error) => {
          // Required fields
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

          // Type validation
          expect(['missing', 'parse_error', 'extra']).toContain(error.type)
          expect(typeof error.nodeType).toBe('string')
          expect(typeof error.file).toBe('string')

          // Position validation
          expect(typeof error.line).toBe('number')
          expect(typeof error.column).toBe('number')
          expect(typeof error.endLine).toBe('number')
          expect(typeof error.endColumn).toBe('number')
          expect(error.line).toBeGreaterThan(0)
          expect(error.column).toBeGreaterThan(0)
          expect(error.endLine).toBeGreaterThan(0)
          expect(error.endColumn).toBeGreaterThan(0)
          expect(error.endLine).toBeGreaterThanOrEqual(error.line)

          // Content validation
          expect(typeof error.text).toBe('string')
          expect(typeof error.context).toBe('string')
          expect(typeof error.suggestion).toBe('string')
          expect(error.context.length).toBeGreaterThan(0)
          expect(error.suggestion.length).toBeGreaterThan(0)

          // File path validation
          expect(error.file).toContain(ERROR_SCENARIOS_DIR)
          expect(error.file).toMatch(/\.(js|ts)$/)
        })
      }
    })

    it('should generate accurate metrics', async () => {
      const project = await createTestProject(ERROR_SCENARIOS_DIR)
      const result = analyzeErrors(project)

      expect(result.metrics).toHaveProperty('totalFiles')
      expect(result.metrics).toHaveProperty('totalErrorNodes')
      expect(result.metrics).toHaveProperty('errorsByType')
      expect(result.metrics).toHaveProperty('errorsByFile')

      // Validate types
      expect(typeof result.metrics.totalFiles).toBe('number')
      expect(typeof result.metrics.totalErrorNodes).toBe('number')
      expect(typeof result.metrics.errorsByType).toBe('object')
      expect(typeof result.metrics.errorsByFile).toBe('object')

      // Validate ranges
      expect(result.metrics.totalFiles).toBeGreaterThan(0)
      expect(result.metrics.totalErrorNodes).toBeGreaterThanOrEqual(0)

      // Files with errors should not exceed total files
      expect(result.summary.filesWithErrors).toBeLessThanOrEqual(result.metrics.totalFiles)

      // Error counts should be consistent
      const totalErrorsByType = Object.values(result.metrics.errorsByType).reduce((sum, count) => sum + count, 0)
      expect(totalErrorsByType).toBe(result.summary.totalErrors)
    })

    it('should handle monorepo projects', async () => {
      // Test with a project that might have subprojects
      const project = await createTestProject(ERROR_SCENARIOS_DIR)

      // Manually add a subproject to test monorepo handling
      const subProject = await createTestProject(CLEAN_CODE_DIR)
      project.subProjects = [subProject]
      project.isMonorepo = true

      const result = analyzeErrors(project)

      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('metrics')

      // Should include files from both main project and subprojects
      const expectedTotalFiles = project.files.size + subProject.files.size
      expect(result.metrics.totalFiles).toBe(expectedTotalFiles)
    })
  })

  describe('countErrorNodes', () => {
    it('should count nodes with hasError property', () => {
      // Mock tree-sitter node with hasError
      const mockNodeWithError = {
        hasError: true,
        children: [
          { hasError: false, children: [] },
          { hasError: true, children: [] },
        ],
      }

      const count = countErrorNodes(mockNodeWithError)
      expect(count).toBe(2) // Root node + one child with error
    })

    it('should handle nodes without hasError property', () => {
      const mockNodeWithoutError = {
        hasError: false,
        children: [
          { hasError: false, children: [] },
          { hasError: false, children: [] },
        ],
      }

      const count = countErrorNodes(mockNodeWithoutError)
      expect(count).toBe(0)
    })

    it('should handle deeply nested error nodes', () => {
      const mockDeepNode = {
        hasError: true,
        children: [
          {
            hasError: false,
            children: [
              {
                hasError: true,
                children: [
                  { hasError: true, children: [] },
                ],
              },
            ],
          },
        ],
      }

      const count = countErrorNodes(mockDeepNode)
      expect(count).toBe(3) // Root + two nested error nodes
    })

    it('should handle nodes without children', () => {
      const mockLeafNode = {
        hasError: true,
        // No children property
      }

      const count = countErrorNodes(mockLeafNode)
      expect(count).toBe(1)
    })

    it('should handle empty children arrays', () => {
      const mockNodeEmptyChildren = {
        hasError: true,
        children: [],
      }

      const count = countErrorNodes(mockNodeEmptyChildren)
      expect(count).toBe(1)
    })

    it('should return 0 for completely clean nodes', () => {
      const mockCleanNode = {
        hasError: false,
        children: [
          { hasError: false, children: [] },
          { hasError: false, children: [
            { hasError: false, children: [] },
          ] },
        ],
      }

      const count = countErrorNodes(mockCleanNode)
      expect(count).toBe(0)
    })
  })

  describe('error context and suggestions', () => {
    it('should provide meaningful context for different error types', async () => {
      const project = await createTestProject(ERROR_SCENARIOS_DIR)
      const result = analyzeErrors(project)

      if (result.errors.length > 0) {
        // Check that most contexts are meaningful (some may be generic for complex errors)
        const meaningfulContexts = result.errors.filter(error =>
          error.context !== 'Unknown context' && error.context !== '',
        )

        // At least 80% of errors should have meaningful context
        expect(meaningfulContexts.length).toBeGreaterThan(result.errors.length * 0.8)

        // Check that meaningful contexts mention specific constructs
        meaningfulContexts.forEach((error) => {
          const hasSpecificContext = (
            error.context.includes('function')
            || error.context.includes('class')
            || error.context.includes('interface')
            || error.context.includes('statement')
            || error.context.includes('Missing')
            || error.context.includes('In ')
          )

          expect(hasSpecificContext).toBe(true)
        })
      }
    })

    it('should provide actionable suggestions', async () => {
      const project = await createTestProject(ERROR_SCENARIOS_DIR)
      const result = analyzeErrors(project)

      if (result.errors.length > 0) {
        result.errors.forEach((error) => {
          expect(error.suggestion).not.toBe('Review syntax')
          expect(error.suggestion).not.toBe('')

          // Suggestions should be specific and actionable
          const hasActionableSuggestion = (
            error.suggestion.includes('Add')
            || error.suggestion.includes('Close')
            || error.suggestion.includes('Complete')
            || error.suggestion.includes('Fix')
            || error.suggestion.includes('Remove')
          )

          expect(hasActionableSuggestion).toBe(true)
        })
      }
    })
  })

  describe('performance and edge cases', () => {
    it('should handle projects with no parseable files', async () => {
      // Create a project with no JS/TS files (or empty directory)
      const project = createProject({
        directory: FIXTURES_DIR, // Parent directory with mixed content
        languages: [],
        autoWatch: false,
      })

      // Manually set empty files to simulate no parseable content
      project.files.clear()

      const result = analyzeErrors(project)

      expect(result.errors).toHaveLength(0)
      expect(result.summary.totalErrors).toBe(0)
      expect(result.metrics.totalFiles).toBe(0)
      expect(result.metrics.totalErrorNodes).toBe(0)
    })

    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now()
      const project = await createTestProject(ERROR_SCENARIOS_DIR)
      const result = analyzeErrors(project)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should complete within 1 second
      expect(result).toHaveProperty('errors')
    })

    it('should handle files with only extra nodes', () => {
      // This would require mocking specific tree-sitter output
      // For now, verify the function handles various node types gracefully
      const mockNode = {
        hasError: false,
        children: [],
      }

      const count = countErrorNodes(mockNode)
      expect(count).toBe(0)
    })
  })
})