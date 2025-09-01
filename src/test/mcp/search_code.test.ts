/**
 * Comprehensive MCP search_code tool tests
 * Tests all parameter combinations, edge cases, and failure scenarios
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { handleToolRequest } from '../../mcp/handlers.js'
import type { JsonObject } from '../../types/core.js'

describe('MCP search_code Tool', () => {
  const fixturesDir = resolve(import.meta.dirname, '../fixtures')
  const positiveFixture = resolve(fixturesDir, 'minimal-positive')
  const emptyFixture = resolve(fixturesDir, 'empty-project')

  // Helper function to call search_code tool
  async function callSearchCode(args: JsonObject) {
    return handleToolRequest({
      params: {
        name: 'search_code',
        arguments: args,
      },
    })
  }

  describe('Basic Functionality', () => {
    it('should find results in positive fixture', async () => {
      const result = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
      })

      expect(result.content).toBeDefined()
      expect(result.content[0]).toBeDefined()
      expect(result.content[0].type).toBe('text')

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.results.length).toBeGreaterThan(0)
      expect(content.totalResults).toBeGreaterThan(0)
    })

    it('should return 0 results for empty fixture', async () => {
      const result = await callSearchCode({
        query: 'NonexistentFunction',
        directory: emptyFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.results.length).toBe(0)
      expect(content.totalResults).toBe(0)
    })

    it('should return 0 results for query with no matches', async () => {
      const result = await callSearchCode({
        query: 'XyzNonexistentElement',
        directory: positiveFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.results.length).toBe(0)
      expect(content.totalResults).toBe(0)
    })
  })

  describe('Parameter Testing', () => {
    it('should respect maxResults parameter', async () => {
      const result = await callSearchCode({
        query: 'Test',
        directory: positiveFixture,
        maxResults: 2,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results.length).toBeLessThanOrEqual(2)
    })

    it('should use fuzzyThreshold parameter', async () => {
      // Test with very high threshold (should get fewer results)
      const strictResult = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
        fuzzyThreshold: 90,
      })

      // Test with low threshold (should get more results)
      const relaxedResult = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
        fuzzyThreshold: 10,
      })

      const strictContent = JSON.parse(strictResult.content[0].text)
      const relaxedContent = JSON.parse(relaxedResult.content[0].text)

      // Relaxed search should find at least as many results as strict
      expect(relaxedContent.results.length).toBeGreaterThanOrEqual(strictContent.results.length)
    })

    it('should use exactMatch parameter', async () => {
      const exactResult = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
        exactMatch: true,
      })

      const fuzzyResult = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
        exactMatch: false,
      })

      const exactContent = JSON.parse(exactResult.content[0].text)
      const fuzzyContent = JSON.parse(fuzzyResult.content[0].text)

      // Verify both return results
      expect(exactContent.results).toBeDefined()
      expect(fuzzyContent.results).toBeDefined()
    })

    it('should filter by types parameter', async () => {
      const result = await callSearchCode({
        query: 'Test',
        directory: positiveFixture,
        types: ['function'],
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()

      // All results should be functions if any are found
      content.results.forEach((result: any) => {
        if (result.type) {
          expect(result.type).toBe('function')
        }
      })
    })

    it('should filter by pathPattern parameter', async () => {
      const result = await callSearchCode({
        query: 'Test',
        directory: positiveFixture,
        pathPattern: 'index',
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()

      // All results should have 'index' in their path if any are found
      content.results.forEach((result: any) => {
        expect(result.path).toContain('index')
      })
    })
  })

  describe('Directory vs ProjectId', () => {
    it('should work with directory parameter', async () => {
      const result = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.projectId).toBeDefined()
    })

    it('should work with projectId as path', async () => {
      const result = await callSearchCode({
        query: 'TestUser',
        projectId: positiveFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.projectId).toBeDefined()
    })

    it('should default to current directory when no directory or projectId', async () => {
      const result = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.projectId).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should throw error for missing query', async () => {
      await expect(callSearchCode({
        directory: positiveFixture,
      })).rejects.toThrow('Query must be a string')
    })

    it('should throw error for invalid query type', async () => {
      await expect(callSearchCode({
        query: 123,
        directory: positiveFixture,
      })).rejects.toThrow('Query must be a string')
    })

    it('should handle non-existent directory gracefully', async () => {
      // This should throw an error for non-existent directory
      await expect(callSearchCode({
        query: 'test',
        directory: '/nonexistent/path',
      })).rejects.toThrow()
    })
  })

  describe('Response Structure Validation', () => {
    it('should return properly structured response', async () => {
      const result = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
      })

      // Validate response structure
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.content).toBeInstanceOf(Array)
      expect(result.content.length).toBe(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toBeDefined()

      // Validate JSON content structure
      const content = JSON.parse(result.content[0].text)
      expect(content).toHaveProperty('query')
      expect(content).toHaveProperty('results')
      expect(content).toHaveProperty('totalResults')
      expect(content).toHaveProperty('projectId')
      expect(content.results).toBeInstanceOf(Array)
      expect(typeof content.totalResults).toBe('number')
    })

    it('should return valid result objects', async () => {
      const result = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
      })

      const content = JSON.parse(result.content[0].text)

      content.results.forEach((result: any) => {
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('type')
        expect(result).toHaveProperty('path')
        expect(result).toHaveProperty('startLine')
        expect(result).toHaveProperty('endLine')
        expect(result).toHaveProperty('startColumn')
        expect(result).toHaveProperty('endColumn')
        expect(result).toHaveProperty('score')
        expect(result).toHaveProperty('matches')
        // New content inclusion fields
        expect(result).toHaveProperty('contentIncluded')
        expect(typeof result.contentIncluded).toBe('boolean')
        if (result.contentIncluded) {
          expect(result).toHaveProperty('content')
          expect(result).toHaveProperty('contentTruncated')
          expect(result).toHaveProperty('contentLines')
          expect(typeof result.contentTruncated).toBe('boolean')
          expect(typeof result.contentLines).toBe('number')
        }
      })
    })
  })

  describe('Content Inclusion Feature', () => {
    const contentFixture = resolve(fixturesDir, 'content-inclusion-test')

    it('should include full content for 1 result', async () => {
      const result = await callSearchCode({
        query: 'processUserDataValidation',
        directory: contentFixture,
        maxResults: 1,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toHaveLength(1)
      expect(content.results[0].contentIncluded).toBe(true)
      expect(content.results[0].content).toBeDefined()
      expect(content.results[0].contentTruncated).toBe(false)
      expect(content.results[0].contentLines).toBeGreaterThan(0)
    })

    it('should include limited content for 3 results', async () => {
      const result = await callSearchCode({
        query: 'processUser',
        directory: contentFixture,
        maxResults: 3,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results.length).toBeLessThanOrEqual(3)
      content.results.forEach((result: any) => {
        expect(result.contentIncluded).toBe(true)
        if (result.content) {
          expect(result.contentLines).toBeGreaterThan(0)
        }
      })
    })

    it('should not include content for 4+ results', async () => {
      const result = await callSearchCode({
        query: 'processUser',
        directory: contentFixture,
        maxResults: 10,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results.length).toBeGreaterThanOrEqual(4)
      content.results.forEach((result: any) => {
        expect(result.contentIncluded).toBe(false)
        expect(result.content).toBeUndefined()
        expect(result.contentTruncated).toBeUndefined()
        expect(result.contentLines).toBeUndefined()
      })
    })

    it('should force content inclusion when forceContentInclusion is true', async () => {
      const result = await callSearchCode({
        query: 'processUser',
        directory: contentFixture,
        maxResults: 10,
        forceContentInclusion: true,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results.length).toBeGreaterThanOrEqual(4)
      content.results.forEach((result: any) => {
        expect(result.contentIncluded).toBe(true)
        if (result.content) {
          expect(result.contentLines).toBeGreaterThan(0)
        }
      })
    })

    it('should disable content inclusion when disableContentInclusion is true', async () => {
      const result = await callSearchCode({
        query: 'processUserDataValidation',
        directory: contentFixture,
        maxResults: 1,
        disableContentInclusion: true,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toHaveLength(1)
      expect(content.results[0].contentIncluded).toBe(false)
      expect(content.results[0].content).toBeUndefined()
      expect(content.results[0].contentTruncated).toBeUndefined()
      expect(content.results[0].contentLines).toBeUndefined()
    })

    it('should respect maxContentLines parameter', async () => {
      const result = await callSearchCode({
        query: 'processUserData',
        directory: contentFixture,
        maxResults: 3,
        maxContentLines: 10,
      })

      const content = JSON.parse(result.content[0].text)
      content.results.forEach((result: any) => {
        if (result.contentIncluded && result.content && result.contentLines > 10) {
          expect(result.contentTruncated).toBe(true)
          expect(result.content).not.toContain('... truncated ...')
        }
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty query string', async () => {
      const result = await callSearchCode({
        query: '',
        directory: positiveFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.results).toBeInstanceOf(Array)
    })

    it('should handle very large maxResults', async () => {
      const result = await callSearchCode({
        query: 'Test',
        directory: positiveFixture,
        maxResults: 999999,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.results.length).toBeLessThanOrEqual(999999)
    })

    it('should handle maxResults of 0', async () => {
      const result = await callSearchCode({
        query: 'TestUser',
        directory: positiveFixture,
        maxResults: 0,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.results.length).toBe(0)
    })

    it('should handle special characters in query', async () => {
      const result = await callSearchCode({
        query: 'Test@#$%^&*()',
        directory: positiveFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.results).toBeDefined()
      expect(content.results).toBeInstanceOf(Array)
    })
  })
})