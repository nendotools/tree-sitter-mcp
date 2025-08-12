/**
 * Tests for file-level search functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TreeManager } from '../core/tree-manager.js'
import { getParserRegistry } from '../parsers/registry.js'
import type { Config } from '../types/index.js'

describe('File Search Tests', () => {
  let treeManager: TreeManager
  const testProjectId = 'test-file-search'

  beforeEach(async () => {
    const parserRegistry = getParserRegistry()
    treeManager = new TreeManager(parserRegistry)

    const config: Config = {
      workingDir: './src/test/fixtures/simple-ts',
      languages: [],
      maxDepth: 10,
      ignoreDirs: ['.git', 'node_modules'],
    }

    await treeManager.createProject(testProjectId, config)
    await treeManager.initializeProject(testProjectId)
  })

  afterEach(() => {
    treeManager.destroyProject(testProjectId)
  })

  describe('File Type Search', () => {
    it('should find files by filename', async () => {
      const results = await treeManager.search(testProjectId, 'user.ts', {
        types: ['file'],
        maxResults: 10,
      })

      expect(results.length).toBeGreaterThan(0)
      const userFile = results.find(r => r.node.name === 'user.ts')
      expect(userFile).toBeDefined()
      expect(userFile?.node.type).toBe('file')
    })

    it('should find files by partial filename', async () => {
      const results = await treeManager.search(testProjectId, 'user', {
        types: ['file'],
        maxResults: 10,
      })

      expect(results.length).toBeGreaterThan(0)
      const userFile = results.find(r => r.node.name.includes('user'))
      expect(userFile).toBeDefined()
    })

    it('should support fuzzy matching for filenames', async () => {
      const results = await treeManager.search(testProjectId, 'usr', {
        types: ['file'],
        fuzzyThreshold: 20,
        maxResults: 10,
      })

      expect(results.length).toBeGreaterThan(0)
      const userFile = results.find(r => r.node.name.includes('user'))
      expect(userFile).toBeDefined()
    })

    it('should find files by path pattern', async () => {
      const results = await treeManager.search(testProjectId, '', {
        types: ['file'],
        pathPattern: '**/services/*.ts',
        maxResults: 10,
      })

      expect(results.length).toBeGreaterThan(0)
      const serviceFile = results.find(r => r.filePath.includes('services'))
      expect(serviceFile).toBeDefined()
    })

    it('should support empty query with path pattern', async () => {
      const results = await treeManager.search(testProjectId, '', {
        types: ['file'],
        pathPattern: '**/*.ts',  // Use ** pattern to match any directory depth
        maxResults: 10,
      })

      expect(results.length).toBeGreaterThan(0)
      results.forEach(result => {
        expect(result.node.type).toBe('file')
        expect(result.filePath.endsWith('.ts')).toBe(true)
      })
    })
  })

  describe('Mixed Search (Files + Code Elements)', () => {
    it('should find both files and code elements when no type filter', async () => {
      const results = await treeManager.search(testProjectId, 'user', {
        maxResults: 20,
      })

      expect(results.length).toBeGreaterThan(0)
      
      const hasFiles = results.some(r => r.node.type === 'file')
      const hasCodeElements = results.some(r => r.node.type !== 'file')
      
      expect(hasFiles).toBe(true)
      expect(hasCodeElements).toBe(true)
    })

    it('should exclude files when file type not in filter', async () => {
      const results = await treeManager.search(testProjectId, 'user', {
        types: ['class', 'function'],
        maxResults: 20,
      })

      expect(results.length).toBeGreaterThan(0)
      results.forEach(result => {
        expect(result.node.type).not.toBe('file')
        expect(['class', 'function'].includes(result.node.type)).toBe(true)
      })
    })
  })

  describe('File Extension Filtering', () => {
    it('should find TypeScript files', async () => {
      const results = await treeManager.search(testProjectId, '.ts', {
        types: ['file'],
        maxResults: 10,
      })

      expect(results.length).toBeGreaterThan(0)
      results.forEach(result => {
        expect(result.filePath.endsWith('.ts')).toBe(true)
      })
    })
  })

  describe('Error Cases', () => {
    it('should handle non-existent files gracefully', async () => {
      const results = await treeManager.search(testProjectId, 'nonexistent.xyz', {
        types: ['file'],
        maxResults: 10,
      })

      expect(results.length).toBe(0)
    })

    it('should handle empty query without path pattern', async () => {
      // This should be handled at the MCP tool level, but test that empty query
      // with type filter still works
      const results = await treeManager.search(testProjectId, '', {
        types: ['file'],
        maxResults: 10,
      })

      // Should return all files with default scoring
      expect(results.length).toBeGreaterThan(0)
    })
  })
})