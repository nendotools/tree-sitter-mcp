/**
 * Comprehensive MCP find_usage tool tests
 * Tests all parameter combinations, edge cases, and failure scenarios
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { handleToolRequest } from '../../mcp/handlers.js'
import type { JsonObject } from '../../types/core.js'

describe('MCP find_usage Tool', () => {
  const fixturesDir = resolve(import.meta.dirname, '../fixtures')
  const positiveFixture = resolve(fixturesDir, 'minimal-positive')
  const emptyFixture = resolve(fixturesDir, 'empty-project')

  // Helper function to call find_usage tool
  async function callFindUsage(args: JsonObject) {
    return handleToolRequest({
      params: {
        name: 'find_usage',
        arguments: args,
      },
    })
  }

  describe('Basic Functionality', () => {
    it('should find usages in positive fixture', async () => {
      const result = await callFindUsage({
        identifier: 'TestUser',
        directory: positiveFixture,
      })

      expect(result.content).toBeDefined()
      expect(result.content[0]).toBeDefined()
      expect(result.content[0].type).toBe('text')

      const content = JSON.parse(result.content[0].text)
      expect(content.usages).toBeDefined()
      expect(content.usages.length).toBeGreaterThan(0)
      expect(content.totalUsages).toBeGreaterThan(0)
    })

    it('should return 0 usages for empty fixture', async () => {
      const result = await callFindUsage({
        identifier: 'TestUser',
        directory: emptyFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.usages).toBeDefined()
      expect(content.usages.length).toBe(0)
      expect(content.totalUsages).toBe(0)
    })

    it('should return 0 usages for non-existent identifier', async () => {
      const result = await callFindUsage({
        identifier: 'XyzNonexistentIdentifier',
        directory: positiveFixture,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.usages).toBeDefined()
      expect(content.usages.length).toBe(0)
      expect(content.totalUsages).toBe(0)
    })
  })

  describe('Parameter Testing', () => {
    it('should respect maxResults parameter', async () => {
      const result = await callFindUsage({
        identifier: 'TestUser',
        directory: positiveFixture,
        maxResults: 2,
      })

      const content = JSON.parse(result.content[0].text)
      expect(content.usages.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Error Handling', () => {
    it('should throw error for missing identifier', async () => {
      await expect(callFindUsage({
        directory: positiveFixture,
      })).rejects.toThrow('Identifier must be a string')
    })
  })
})