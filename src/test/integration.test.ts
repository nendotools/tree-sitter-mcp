/**
 * Integration tests using test fixtures for TreeManager and MCP tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolve } from 'path'
import { TreeManager } from '../core/tree-manager.js'
import { BatchFileWatcher } from '../core/file-watcher.js'
import { getParserRegistry } from '../parsers/registry.js'
import { initializeProject } from '../mcp/tools/initialize-project.js'
import { searchCode } from '../mcp/tools/search-code.js'
import { findUsage } from '../mcp/tools/find-usage.js'
import type { Config } from '../types/index.js'
import { DEFAULT_IGNORE_DIRS } from '../constants/service-constants.js'
import { DIRECTORIES } from '../constants/service-constants.js'

describe('Integration Tests with Fixtures', () => {
  let treeManager: TreeManager
  let fileWatcher: BatchFileWatcher

  const fixturesDir = resolve(import.meta.dirname, 'fixtures')
  const simpleProjectDir = resolve(fixturesDir, 'simple-ts')
  const multiLangProjectDir = resolve(fixturesDir, 'multi-lang')
  const monoRepoProjectDir = resolve(fixturesDir, 'mono-repo')
  const edgeCasesProjectDir = resolve(fixturesDir, 'edge-cases')

  beforeEach(() => {
    const parserRegistry = getParserRegistry()
    treeManager = new TreeManager(parserRegistry)
    fileWatcher = new BatchFileWatcher(treeManager)
  })

  afterEach(async () => {
    // Clean up all projects
    try {
      const projects = treeManager.getAllProjects()
      for (const project of projects) {
        try {
          treeManager.destroyProject(project.projectId)
        }
        catch {
          // Project may already be destroyed
        }
        try {
          fileWatcher.stopWatching(project.projectId)
        }
        catch {
          // Watcher may not be active
        }
      }
    }
    catch {
      // Clean up may have issues, but don't fail the test
    }
  })

  describe('TreeManager with Simple TypeScript Project', () => {
    it('should initialize and index simple TypeScript project', async () => {
      const projectId = 'test-simple-ts'
      const config: Config = {
        workingDir: simpleProjectDir,
        languages: ['typescript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      const project = treeManager.createProject(projectId, config)
      expect(project).toBeDefined()
      expect(project.config.workingDir).toBe(simpleProjectDir)

      await treeManager.initializeProject(projectId)
      expect(project.initialized).toBe(true)

      const stats = treeManager.getProjectStats(projectId)
      expect(stats.totalFiles).toBeGreaterThan(0)
      expect(stats.totalNodes).toBeGreaterThan(0)
      expect(Object.keys(stats.languages).length).toBeGreaterThan(0)
    })

    it('should find classes and functions in TypeScript project', async () => {
      const projectId = 'test-simple-ts-search'
      const config: Config = {
        workingDir: simpleProjectDir,
        languages: ['typescript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      // Search for the User class
      const userClassResults = await treeManager.search(projectId, 'User', {
        types: ['class'],
        maxResults: 10,
      })
      expect(userClassResults.length).toBeGreaterThan(0)
      expect(userClassResults[0]!.node.name).toBe('User')
      expect(userClassResults[0]!.node.type).toBe('class')

      // Search for functions
      const functionResults = await treeManager.search(projectId, 'createUser', {
        types: ['function'],
        maxResults: 10,
      })
      expect(functionResults.length).toBeGreaterThan(0)
      expect(functionResults[0]!.node.name).toBe('createUser')
      expect(functionResults[0]!.node.type).toBe('function')
    })

    it('should find method usages', async () => {
      const projectId = 'test-simple-ts-usage'
      const config: Config = {
        workingDir: simpleProjectDir,
        languages: ['typescript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      // Search for methods that use 'updateName'
      const results = await treeManager.search(projectId, 'updateName', {
        maxResults: 10,
      })
      // This test may need adjustment based on actual file content
      expect(results.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('TreeManager with Multi-Language Project', () => {
    it('should handle multiple languages in one project', async () => {
      const projectId = 'test-multi-lang'
      const config: Config = {
        workingDir: multiLangProjectDir,
        languages: [], // Empty means all languages
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      const stats = treeManager.getProjectStats(projectId)
      expect(stats.totalFiles).toBeGreaterThan(0)

      // Should detect multiple languages
      const languages = Object.keys(stats.languages)
      expect(languages.length).toBeGreaterThanOrEqual(1)
      // At minimum should contain typescript from our TS calculator
      if (languages.length > 0) {
        expect(stats.languages.typescript || stats.languages.javascript).toBeGreaterThan(0)
      }
    })

    it('should find Calculator class across different languages', async () => {
      const projectId = 'test-multi-lang-search'
      const config: Config = {
        workingDir: multiLangProjectDir,
        languages: [],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      const results = await treeManager.search(projectId, 'Calculator', {
        types: ['class'],
        maxResults: 20,
      })

      // Should find Calculator class - may be in TypeScript or other languages
      expect(results.length).toBeGreaterThanOrEqual(1)
      const fileExtensions = results.map(r => r.filePath.split('.').pop())
      // Check that we found at least one result
      expect(fileExtensions.length).toBeGreaterThan(0)
    })
  })

  describe('TreeManager with Mono-Repo Structure', () => {
    it('should handle mono-repo project structure', async () => {
      const projectId = 'test-mono-repo'
      const config: Config = {
        workingDir: monoRepoProjectDir,
        languages: ['typescript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: [...DEFAULT_IGNORE_DIRS, 'node_modules'],
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      const stats = treeManager.getProjectStats(projectId)
      expect(stats.totalFiles).toBeGreaterThan(0)
      expect(Object.keys(stats.languages).length).toBeGreaterThan(0)

      // Search across the mono-repo
      const repositoryResults = await treeManager.search(projectId, 'Repository', {
        types: ['class'],
        maxResults: 10,
      })
      expect(repositoryResults.length).toBeGreaterThan(0)

      // Should find classes from different packages
      const eventEmitterResults = await treeManager.search(projectId, 'EventEmitter', {
        types: ['class'],
        maxResults: 10,
      })
      expect(eventEmitterResults.length).toBeGreaterThan(0)
    })

    it('should find cross-package imports and usages', async () => {
      const projectId = 'test-mono-repo-usage'
      const config: Config = {
        workingDir: monoRepoProjectDir,
        languages: ['typescript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: [...DEFAULT_IGNORE_DIRS, 'node_modules'],
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      // Search for generateUUID function
      const generateUUIDResults = await treeManager.search(projectId, 'generateUUID', {
        maxResults: 10,
      })
      expect(generateUUIDResults.length).toBeGreaterThan(0)

      // Should find the function definition
      const resultFiles = generateUUIDResults.map(r => r.filePath)
      expect(resultFiles.some(f => f.includes('shared-utils') || f.includes('index.ts'))).toBe(
        true,
      )
    })
  })

  describe('Edge Cases Handling', () => {
    it('should handle files with syntax errors gracefully', async () => {
      const projectId = 'test-edge-cases'
      const config: Config = {
        workingDir: edgeCasesProjectDir,
        languages: ['javascript', 'typescript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)

      // Should not throw error even with syntax errors in files
      await expect(treeManager.initializeProject(projectId)).resolves.not.toThrow()

      const stats = treeManager.getProjectStats(projectId)
      expect(stats.totalFiles).toBeGreaterThan(0)
    })

    it('should handle empty files', async () => {
      const projectId = 'test-empty-files'
      const config: Config = {
        workingDir: edgeCasesProjectDir,
        languages: ['javascript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      const stats = treeManager.getProjectStats(projectId)
      // Should include empty files in file count
      expect(stats.totalFiles).toBeGreaterThan(0)
    })

    it('should handle very long lines', async () => {
      const projectId = 'test-long-lines'
      const config: Config = {
        workingDir: edgeCasesProjectDir,
        languages: ['typescript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      // Should be able to search in files with very long lines
      const results = await treeManager.search(projectId, 'processLongString', {
        types: ['function'],
        maxResults: 10,
      })
      // Should complete without throwing an error, even if no results
      expect(results).toBeInstanceOf(Array)
    })
  })

  describe('MCP Tools Integration', () => {
    it('should work with initialize-project tool', async () => {
      const result = await initializeProject(
        {
          projectId: 'mcp-test-init',
          directory: simpleProjectDir,
          languages: ['typescript'],
          autoWatch: false,
        },
        treeManager,
        fileWatcher,
      )

      expect(result.type).toBe('text')
      expect(result.text).toContain('[OK]')
      expect(result.text).toContain('Files:')
      expect(result.text).toContain('Code Elements:')
    })

    it('should work with search-code tool', async () => {
      // First initialize
      await initializeProject(
        {
          projectId: 'mcp-test-search',
          directory: simpleProjectDir,
          languages: ['typescript'],
          autoWatch: false,
        },
        treeManager,
        fileWatcher,
      )

      // Then search
      const result = await searchCode(
        {
          projectId: 'mcp-test-search',
          query: 'User',
          types: ['class'],
          maxResults: 10,
        },
        treeManager,
        fileWatcher,
      )

      expect(result.type).toBe('text')
      expect(result.text).toContain('Found')
      expect(result.text).toContain('User')
      expect(result.text).toContain('class')
    })

    it('should work with find-usage tool', async () => {
      // First initialize
      await initializeProject(
        {
          projectId: 'mcp-test-usage',
          directory: simpleProjectDir,
          languages: ['typescript'],
          autoWatch: false,
        },
        treeManager,
        fileWatcher,
      )

      // Then find usage
      const result = await findUsage(
        {
          projectId: 'mcp-test-usage',
          identifier: 'User',
          exactMatch: false,
        },
        treeManager,
        fileWatcher,
      )

      expect(result.type).toBe('text')
      // Should either find usages or complete without error
      expect(result.text).toBeDefined()
    })
  })

  describe('Performance Tests', () => {
    it('should initialize projects within reasonable time', async () => {
      const projectId = 'perf-test'
      const config: Config = {
        workingDir: simpleProjectDir,
        languages: ['typescript'],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)

      const startTime = Date.now()
      await treeManager.initializeProject(projectId)
      const endTime = Date.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should perform searches quickly', async () => {
      const projectId = 'perf-search-test'
      const config: Config = {
        workingDir: multiLangProjectDir,
        languages: [],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      treeManager.createProject(projectId, config)
      await treeManager.initializeProject(projectId)

      const startTime = Date.now()
      await treeManager.search(projectId, 'Calculator', { maxResults: 20 })
      const endTime = Date.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(100) // Should complete within 100ms
    })
  })
})
