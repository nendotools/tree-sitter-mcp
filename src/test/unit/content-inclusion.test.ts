/**
 * Tests for progressive content inclusion enhancement feature
 *
 * Tests that searchCode function implements the correct progressive content inclusion logic:
 * - 4+ results: metadata only (no content)
 * - 2-3 results: limited content (150-line truncation)
 * - 1 result: full content (no truncation)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'path'
import { createProject, parseProject } from '../../project/manager.js'
import { searchCode } from '../../core/search.js'

describe('Content Inclusion Feature', () => {
  const testFixturePath = resolve(import.meta.dirname, '../fixtures/content-inclusion-test')
  let projectNodes: any[] = []

  beforeAll(async () => {
    // Parse the test fixture project
    const project = createProject({
      directory: testFixturePath,
      languages: ['typescript'],
      ignoreDirs: ['node_modules'],
      maxDepth: 10,
    })

    await parseProject(project)

    // Extract all nodes for testing
    projectNodes = Array.from(project.nodes.values()).flat()

    // Verify we have the expected functions with different lengths
    const functions = projectNodes.filter(node =>
      node.type === 'function'
      && node.name?.includes('processUserData'),
    )
    expect(functions.length).toBeGreaterThanOrEqual(4)

    // Verify we have functions with different content lengths for testing
    const longFunction = functions.find(f => f.name === 'processUserData')
    const shortFunction = functions.find(f => f.name === 'processUserDataValidation')
    expect(longFunction?.content?.split('\n').length).toBeGreaterThan(150)
    expect(shortFunction?.content?.split('\n').length).toBeLessThan(100)
  })

  describe('Progressive Content Inclusion Logic', () => {
    it('should include NO content when 4+ results are returned', () => {
      // Search for 'processUser' which returns 4 distinct functions
      const results = searchCode('processUser', projectNodes, {
        maxResults: 10, // Allow all results
        exactMatch: false,
      })

      // Verify we got 4+ results to trigger the no-content rule
      expect(results.length).toBeGreaterThanOrEqual(4)

      // Verify we have the 4 distinct functions we expect (may have duplicates due to fuzzy matching)
      const functionNames = results.map(r => r.node.name)
      const uniqueNames = new Set(functionNames)
      expect(uniqueNames.has('processUserData')).toBe(true)
      expect(uniqueNames.has('processUserDataBatch')).toBe(true)
      expect(uniqueNames.has('processUserDataStream')).toBe(true)
      expect(uniqueNames.has('processUserDataValidation')).toBe(true)

      // ALL results should have contentIncluded: false (4+ results = metadata only)
      results.forEach((result) => {
        expect(result.contentIncluded).toBe(false)
        expect(result.content).toBeUndefined()
        expect(result.contentTruncated).toBeUndefined()
        expect(result.contentLines).toBeUndefined()

        // But should still have metadata
        expect(result.node.name).toBeDefined()
        expect(result.node.path).toBeDefined()
        expect(result.score).toBeGreaterThan(0)
      })
    })

    it('should include LIMITED content when exactly 3 results are returned', () => {
      // Search for 'processUser' but limit to exactly 3 results
      const results = searchCode('processUser', projectNodes, {
        maxResults: 3, // Limit to 3 results
        exactMatch: false,
      })

      // Should return exactly 3 results (limited from the 4 available)
      expect(results.length).toBe(3)

      // Verify we have 3 distinct functions (no duplicates)
      const functionNames = results.map(r => r.node.name)
      expect(new Set(functionNames).size).toBe(3)

      // ALL 3 results should have content included (2-3 results = limited content)
      results.forEach((result) => {
        expect(result.contentIncluded).toBe(true)
        expect(result.content).toBeDefined()
        expect(result.contentLines).toBeDefined()
        expect(result.contentLines).toBeGreaterThan(0)

        // Business rule: For 2-3 results, content should be limited to 150 lines max
        if (result.contentLines! > 150) {
          expect(result.contentTruncated).toBe(true)
          // Content should be truncated to 150 lines maximum
          expect(result.content!.split('\n').length).toBeLessThanOrEqual(150)
          // Truncated content should not contain corruption markers
          expect(result.content).not.toContain('// ... truncated ...')
          expect(result.content).not.toMatch(/\.\.\.\s*$/) // No trailing ellipsis marker
        }
        else {
          // Short content should not be truncated
          expect(result.contentTruncated).toBe(false)
          expect(result.content).toBe(result.node.content)
        }
      })
    })

    it('should include LIMITED content when exactly 2 results are returned', () => {
      // Search for 'processUser' but limit to exactly 2 results
      const results = searchCode('processUser', projectNodes, {
        maxResults: 2,
        exactMatch: false,
      })

      expect(results.length).toBe(2)

      // Verify we have 2 distinct functions (no duplicates)
      const functionNames = results.map(r => r.node.name)
      expect(new Set(functionNames).size).toBe(2)

      // ALL 2 results should have content included (2-3 results = limited content)
      results.forEach((result) => {
        expect(result.contentIncluded).toBe(true)
        expect(result.content).toBeDefined()
        expect(result.contentLines).toBeDefined()
        expect(result.contentLines).toBeGreaterThan(0)

        // Business rule: For 2-3 results, content should be limited to 150 lines max
        if (result.contentLines! > 150) {
          expect(result.contentTruncated).toBe(true)
          // Content should be truncated to 150 lines maximum
          expect(result.content!.split('\n').length).toBeLessThanOrEqual(150)
          // Truncated content should not contain corruption markers
          expect(result.content).not.toContain('// ... truncated ...')
          expect(result.content).not.toMatch(/\.\.\.\s*$/) // No trailing ellipsis marker
        }
        else {
          // Short content should not be truncated
          expect(result.contentTruncated).toBe(false)
          expect(result.content).toBe(result.node.content)
        }
      })
    })

    it('should include FULL content when exactly 1 result is returned', () => {
      // Use search that returns exactly 1 result
      const results = searchCode('processUserData', projectNodes, {
        maxResults: 1,
        exactMatch: false,
      })

      expect(results.length).toBe(1)

      const result = results[0]!
      if (result.node.content) {
        expect(result.contentIncluded).toBe(true)
        expect(result.content).toBe(result.node.content) // FULL content, no truncation
        expect(result.contentTruncated).toBe(false)
        expect(result.contentLines).toBe(result.node.content.split('\n').length)
      }
    })

    it('should transition correctly at the 4-result boundary', () => {
      // Test the boundary: 3 results should have content, 4 should not
      const threeResults = searchCode('processUserData', projectNodes, {
        maxResults: 3,
        exactMatch: false,
      })

      const fourResults = searchCode('processUserData', projectNodes, {
        maxResults: 4,
        exactMatch: false,
      })

      expect(threeResults.length).toBe(3)
      expect(fourResults.length).toBe(4)

      // 3 results: should have content
      threeResults.forEach((result) => {
        if (result.node.content) {
          expect(result.contentIncluded).toBe(true)
        }
      })

      // 4 results: should NOT have content
      fourResults.forEach((result) => {
        expect(result.contentIncluded).toBe(false)
      })
    })
  })

  describe('Configuration Options', () => {
    it('should force content inclusion when forceContentInclusion=true', () => {
      // Even with 4+ results, should include content when forced
      const results = searchCode('processUserData', projectNodes, {
        maxResults: 10,
        forceContentInclusion: true,
      })

      expect(results.length).toBeGreaterThanOrEqual(4)

      // Should include content despite having 4+ results
      results.forEach((result) => {
        if (result.node.content) {
          expect(result.contentIncluded).toBe(true)
          expect(result.content).toBe(result.node.content) // Full content when forced
          expect(result.contentTruncated).toBe(false)
        }
      })
    })

    it('should disable content inclusion when disableContentInclusion=true', () => {
      // Even with 1 result, should not include content when disabled
      const results = searchCode('processUserData', projectNodes, {
        maxResults: 1,
        disableContentInclusion: true,
      })

      expect(results.length).toBe(1)

      results.forEach((result) => {
        expect(result.contentIncluded).toBe(false)
        expect(result.content).toBeUndefined()
      })
    })

    it('should respect custom maxContentLines setting', () => {
      const results = searchCode('processUserData', projectNodes, {
        maxResults: 2,
        maxContentLines: 50, // Custom limit
      })

      expect(results.length).toBe(2)

      // Find a result with long content
      const longResult = results.find(r => r.node.content && r.node.content.split('\n').length > 50)
      if (longResult) {
        expect(longResult.contentIncluded).toBe(true)
        expect(longResult.contentTruncated).toBe(true)
        expect(longResult.content).not.toContain('// ... truncated ...')
        // Should respect the custom 50-line limit (clean truncation)
        expect(longResult.content!.split('\n').length).toBeLessThanOrEqual(50)
      }
    })

    it('should prioritize forceContentInclusion over disableContentInclusion', () => {
      // When both are true, force should win
      const results = searchCode('processUserData', projectNodes, {
        maxResults: 5,
        forceContentInclusion: true,
        disableContentInclusion: true,
      })

      // Should include content because force overrides disable
      results.forEach((result) => {
        if (result.node.content) {
          expect(result.contentIncluded).toBe(true)
        }
      })
    })
  })

  describe('Content Quality and Truncation', () => {
    it('should preserve function signatures in truncated content', () => {
      // Get a long function and truncate it
      const results = searchCode('processUserData', projectNodes, {
        maxResults: 2,
        maxContentLines: 20,
        exactMatch: true, // Get the long function specifically
      })

      const longResult = results.find(r =>
        r.node.name === 'processUserData'
        && r.contentLines! > 20,
      )

      if (longResult) {
        expect(longResult.contentTruncated).toBe(true)
        expect(longResult.content).toContain('function processUserData')
        expect(longResult.content).toContain('userData: any')
        expect(longResult.content).not.toContain('// ... truncated ...')
      }
    })

    it('should not truncate content shorter than limit', () => {
      // Get a short function
      const results = searchCode('processUserDataValidation', projectNodes, {
        maxResults: 1,
        exactMatch: true,
      })

      expect(results.length).toBe(1)

      const result = results[0]!
      if (result.node.content) {
        const lineCount = result.node.content.split('\n').length
        if (lineCount <= 150) {
          expect(result.contentTruncated).toBe(false)
          expect(result.content).toBe(result.node.content)
          expect(result.content).not.toContain('// ... truncated ...')
        }
      }
    })
  })

  describe('Advanced Business Logic', () => {
    it('should respect forced content inclusion even for large result sets', () => {
      // Test that forceContentInclusion overrides the 4+ results rule
      const results = searchCode('processUser', projectNodes, {
        maxResults: 10,
        forceContentInclusion: true,
      })

      expect(results.length).toBeGreaterThanOrEqual(4)

      // Even with 4+ results, ALL should have content when forced
      results.forEach((result) => {
        expect(result.contentIncluded).toBe(true)
        expect(result.content).toBeDefined()
        // When forced, content should NOT be truncated (gets full content)
        expect(result.content).toBe(result.node.content)
        expect(result.contentTruncated).toBe(false)
      })
    })

    it('should properly truncate very long functions in 2-3 result scenarios', () => {
      // Test with a specific function we know is > 150 lines
      const results = searchCode('processUserData', projectNodes, {
        maxResults: 3,
        maxContentLines: 50, // Force truncation
      })

      expect(results.length).toBeGreaterThan(0)

      // Find the long function (processUserData has 172 lines)
      const longFunction = results.find(r => r.node.name === 'processUserData')
      expect(longFunction).toBeDefined()

      if (longFunction) {
        expect(longFunction.contentIncluded).toBe(true)
        expect(longFunction.contentTruncated).toBe(true)
        expect(longFunction.contentLines).toBe(172) // Original length
        expect(longFunction.content!.split('\n').length).toBeLessThanOrEqual(50) // Truncated length

        // Truncated content should still be valid code (start with function declaration)
        expect(longFunction.content).toMatch(/^function\s+processUserData/)
        expect(longFunction.content).not.toContain('// ... truncated ...')
      }
    })

    it('should validate the maxContentLines configuration boundary', () => {
      // Test that maxContentLines actually controls truncation
      const results1 = searchCode('processUserData', projectNodes, {
        maxResults: 2,
        maxContentLines: 10, // Very small
      })

      const results2 = searchCode('processUserData', projectNodes, {
        maxResults: 2,
        maxContentLines: 200, // Very large
      })

      expect(results1.length).toBeGreaterThan(0)
      expect(results2.length).toBeGreaterThan(0)

      const longFunction1 = results1.find(r => r.node.name === 'processUserData')
      const longFunction2 = results2.find(r => r.node.name === 'processUserData')

      if (longFunction1 && longFunction2) {
        // With maxContentLines=10, should be truncated
        expect(longFunction1.contentTruncated).toBe(true)
        expect(longFunction1.content!.split('\n').length).toBeLessThanOrEqual(10)

        // With maxContentLines=200, should NOT be truncated (original is 172 lines)
        expect(longFunction2.contentTruncated).toBe(false)
        expect(longFunction2.content).toBe(longFunction2.node.content)
      }
    })
  })

  describe('Content Quality Validation', () => {
    it('should maintain function signature visibility even when truncated', () => {
      // Ensure truncation preserves the most important parts (function signature)
      const results = searchCode('processUserDataBatch', projectNodes, {
        maxResults: 2,
        maxContentLines: 5, // Very aggressive truncation
      })

      expect(results.length).toBeGreaterThan(0)

      const batchFunction = results.find(r => r.node.name === 'processUserDataBatch')
      expect(batchFunction).toBeDefined()

      if (batchFunction) {
        expect(batchFunction.contentIncluded).toBe(true)
        // Even with aggressive truncation, should preserve function signature
        expect(batchFunction.content).toMatch(/^function\s+processUserDataBatch\s*\(/)
        expect(batchFunction.content!.split('\n').length).toBeLessThanOrEqual(5)
      }
    })

    it('should validate that content inclusion fields are always consistent', () => {
      // Test that the metadata fields are always logically consistent
      const results = searchCode('processUser', projectNodes, {
        maxResults: 10,
      })

      results.forEach((result, _index) => {
        if (result.contentIncluded) {
          expect(result.content).toBeDefined()
          expect(result.contentLines).toBeGreaterThan(0)
          expect(result.contentTruncated).toBeDefined()

          if (result.contentTruncated) {
            expect(result.content!.length).toBeLessThan(result.node.content!.length)
          }
          else {
            expect(result.content).toBe(result.node.content)
          }
        }
        else {
          expect(result.content).toBeUndefined()
          expect(result.contentTruncated).toBeUndefined()
          expect(result.contentLines).toBeUndefined()
        }
      })
    })
  })
})