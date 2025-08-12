/**
 * Tests for selective directory file watching functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { FileWatcher } from '../core/file-watcher.js'
import { TreeManager } from '../core/tree-manager.js'
import type { Config } from '../types/index.js'
import { getParserRegistry } from '../parsers/registry.js'
import { setLogger, ConsoleLogger } from '../utils/logger.js'

describe('Selective File Watcher Tests', () => {
  const testRoot = '/tmp/selective-watcher-test'
  let treeManager: TreeManager

  beforeEach(() => {
    // Set up test logger
    const logger = new ConsoleLogger({
      level: 'error', // Minimize test output
      logToFile: false,
      useColors: false,
    })
    setLogger(logger)

    // Clean up any existing test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true })
    }
    mkdirSync(testRoot, { recursive: true })

    // Create tree manager
    const parserRegistry = getParserRegistry()
    treeManager = new TreeManager(parserRegistry)
  })

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true })
    }
  })

  describe('Selective Directory Detection', () => {
    it('should watch only Vue project directories', async () => {
      // Create Vue project structure
      writeFileSync(join(testRoot, 'vue.config.js'), '// Vue config')
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'components'), { recursive: true })
      mkdirSync(join(testRoot, 'node_modules'), { recursive: true }) // Should be ignored

      const config: Config = {
        workingDir: testRoot,
        languages: ['vue', 'typescript'],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-vue-project', config)

      // Mock the tree manager update method to track calls
      vi.spyOn(treeManager, 'updateFile').mockResolvedValue()

      watcher.start()

      // Wait for watcher to initialize
      await new Promise(resolve => setTimeout(resolve, 500))

      const status = watcher.getStatus()
      expect(status.watching).toBe(true)

      watcher.stop()
    })

    it('should watch React project directories', async () => {
      // Create React project structure
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      writeFileSync(join(testRoot, 'src', 'App.tsx'), '// React app')
      mkdirSync(join(testRoot, 'pages'), { recursive: true })

      const config: Config = {
        workingDir: testRoot,
        languages: ['typescript', 'javascript'],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-react-project', config)

      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 500))

      const status = watcher.getStatus()
      expect(status.watching).toBe(true)

      watcher.stop()
    })

    it('should handle monorepo structures', async () => {
      // Create monorepo structure
      writeFileSync(join(testRoot, 'lerna.json'), '{}')
      mkdirSync(join(testRoot, 'packages', 'ui', 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'packages', 'api', 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'apps', 'web', 'src'), { recursive: true })

      const config: Config = {
        workingDir: testRoot,
        languages: [],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-monorepo', config)

      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 500))

      const status = watcher.getStatus()
      expect(status.watching).toBe(true)

      watcher.stop()
    })

    it('should fall back gracefully when no code directories found', async () => {
      // Create empty project
      const config: Config = {
        workingDir: testRoot,
        languages: [],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-empty-project', config)

      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 500))

      const status = watcher.getStatus()
      expect(status.watching).toBe(true) // Should fall back to watching root

      watcher.stop()
    })
  })

  describe('File Change Detection', () => {
    it('should detect file changes in watched directories', async () => {
      // Create Vue project structure
      writeFileSync(join(testRoot, 'vue.config.js'), '// Vue config')
      mkdirSync(join(testRoot, 'src'), { recursive: true })

      const config: Config = {
        workingDir: testRoot,
        languages: ['vue'],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-change-detection', config)

      // Mock the tree manager update method
      const updateSpy = vi.spyOn(treeManager, 'updateFile').mockResolvedValue()

      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 500))

      // Create a file in watched directory
      const testFile = join(testRoot, 'src', 'Component.vue')
      writeFileSync(testFile, '<template><div>Test</div></template>')

      // Wait for file change detection
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Modify the file
      writeFileSync(testFile, '<template><div>Modified</div></template>')

      // Wait for change detection
      await new Promise(resolve => setTimeout(resolve, 1000))

      watcher.stop()

      // Verify that updateFile was called
      expect(updateSpy).toHaveBeenCalled()
    })

    it('should detect new directories and files within watched areas', async () => {
      // Create basic project structure
      mkdirSync(join(testRoot, 'src'), { recursive: true })

      const config: Config = {
        workingDir: testRoot,
        languages: [],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-new-dirs', config)

      // Mock the tree manager update method
      const updateSpy = vi.spyOn(treeManager, 'updateFile').mockResolvedValue()

      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 500))

      // Create new nested directory structure
      mkdirSync(join(testRoot, 'src', 'components', 'ui'), { recursive: true })

      await new Promise(resolve => setTimeout(resolve, 500))

      // Add file to new directory
      const newFile = join(testRoot, 'src', 'components', 'ui', 'Button.vue')
      writeFileSync(newFile, '<template><button>Click me</button></template>')

      // Wait for detection (increase timeout for reliability)
      await new Promise(resolve => setTimeout(resolve, 2000))

      watcher.stop()

      // Verify that the new file was detected (more flexible assertion)
      expect(updateSpy).toHaveBeenCalledTimes(1)
    })

    it('should ignore files in ignored directories', async () => {
      // Create project with both watched and ignored directories
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'node_modules'), { recursive: true })
      mkdirSync(join(testRoot, '.git'), { recursive: true })

      const config: Config = {
        workingDir: testRoot,
        languages: [],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-ignore-patterns', config)

      // Mock the tree manager update method
      const updateSpy = vi.spyOn(treeManager, 'updateFile').mockResolvedValue()

      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 500))

      // Create files in ignored directories
      writeFileSync(join(testRoot, 'node_modules', 'package.json'), '{}')
      writeFileSync(join(testRoot, '.git', 'config'), 'git config')

      // Create file in watched directory
      writeFileSync(join(testRoot, 'src', 'index.ts'), 'console.log("test")')

      // Wait for detection
      await new Promise(resolve => setTimeout(resolve, 2000))

      watcher.stop()

      // Should be called at least once for files in src/, not ignored directories
      expect(updateSpy).toHaveBeenCalled()

      // Verify it was called with the correct file path
      const calls = updateSpy.mock.calls
      expect(calls.some(call => call[1] === join(testRoot, 'src', 'index.ts'))).toBe(true)
    })
  })

  describe('Error Handling and Fallbacks', () => {
    it('should handle watcher initialization errors gracefully', async () => {
      // Try to watch a non-existent or inaccessible directory
      const config: Config = {
        workingDir: '/nonexistent/path',
        languages: [],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-error-handling', config)

      // Should not throw error
      expect(() => watcher.start()).not.toThrow()

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500))

      watcher.stop()
    })

    it('should stop watcher correctly', async () => {
      mkdirSync(join(testRoot, 'src'), { recursive: true })

      const config: Config = {
        workingDir: testRoot,
        languages: [],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-stop', config)

      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 500))

      expect(watcher.getStatus().watching).toBe(true)

      watcher.stop()

      expect(watcher.getStatus().watching).toBe(false)
    })

    it('should not start multiple watchers for same project', async () => {
      mkdirSync(join(testRoot, 'src'), { recursive: true })

      const config: Config = {
        workingDir: testRoot,
        languages: [],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-multiple-start', config)

      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 500))

      // Try to start again - should warn and not create new watcher
      watcher.start()

      expect(watcher.getStatus().watching).toBe(true)

      watcher.stop()
    })
  })

  describe('Performance Characteristics', () => {
    it('should handle large directory structures efficiently', async () => {
      // Create a larger directory structure
      const dirs = ['src', 'lib', 'components', 'pages', 'utils', 'services']

      for (const dir of dirs) {
        mkdirSync(join(testRoot, dir), { recursive: true })

        // Create subdirectories
        for (let i = 0; i < 5; i++) {
          mkdirSync(join(testRoot, dir, `subdir${i}`), { recursive: true })
        }
      }

      const config: Config = {
        workingDir: testRoot,
        languages: [],
        maxDepth: 10,
        ignoreDirs: [],
      }

      const watcher = new FileWatcher(treeManager, 'test-large-structure', config)

      const startTime = Date.now()
      watcher.start()

      await new Promise(resolve => setTimeout(resolve, 1000))

      const initTime = Date.now() - startTime

      // Should initialize quickly (< 2 seconds even for large structures)
      expect(initTime).toBeLessThan(2000)

      expect(watcher.getStatus().watching).toBe(true)

      watcher.stop()
    })
  })
})