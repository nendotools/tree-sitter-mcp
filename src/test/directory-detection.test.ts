/**
 * Tests for directory detection utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import {
  detectCodeDirectories,
  detectProjectType,
  getIgnorePatterns,
  validateDirectories,
  getWatchingSummary,
} from '../utils/directory-detection.js'

describe('Directory Detection Tests', () => {
  const testRoot = '/tmp/tree-sitter-test'

  beforeEach(() => {
    // Clean up any existing test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true })
    }
    mkdirSync(testRoot, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true })
    }
  })

  describe('Project Type Detection', () => {
    it('should detect Vue.js project', () => {
      // Create Vue project structure
      writeFileSync(join(testRoot, 'vue.config.js'), '// Vue config')
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'components'), { recursive: true })

      const projectType = detectProjectType(testRoot)

      expect(projectType).toBeTruthy()
      expect(projectType?.name).toBe('vue')
      expect(projectType?.primaryDirs).toContain('src')
      expect(projectType?.primaryDirs).toContain('components')
    })

    it('should detect React project', () => {
      // Create React project structure
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      writeFileSync(join(testRoot, 'src', 'App.tsx'), '// React app')

      const projectType = detectProjectType(testRoot)

      expect(projectType).toBeTruthy()
      expect(projectType?.name).toBe('react')
      expect(projectType?.primaryDirs).toContain('src')
    })

    it('should detect Angular project', () => {
      // Create Angular project structure
      writeFileSync(join(testRoot, 'angular.json'), '// Angular config')
      mkdirSync(join(testRoot, 'src', 'app'), { recursive: true })
      writeFileSync(join(testRoot, 'src', 'app', 'app.module.ts'), '// Angular module')

      const projectType = detectProjectType(testRoot)

      expect(projectType).toBeTruthy()
      expect(projectType?.name).toBe('angular')
    })

    it('should detect monorepo project', () => {
      // Create monorepo structure
      writeFileSync(join(testRoot, 'lerna.json'), '// Lerna config')
      mkdirSync(join(testRoot, 'packages'), { recursive: true })

      const projectType = detectProjectType(testRoot)

      expect(projectType).toBeTruthy()
      expect(projectType?.name).toBe('monorepo')
      expect(projectType?.primaryDirs).toContain('packages')
    })

    it('should detect generic Node.js project', () => {
      // Create basic Node project
      writeFileSync(join(testRoot, 'package.json'), '{"name": "test"}')
      mkdirSync(join(testRoot, 'src'), { recursive: true })

      const projectType = detectProjectType(testRoot)

      expect(projectType).toBeTruthy()
      expect(projectType?.name).toBe('node')
    })

    it('should return null for unknown project type', () => {
      // Empty directory with no indicators
      const projectType = detectProjectType(testRoot)

      expect(projectType).toBeNull()
    })
  })

  describe('Code Directory Detection', () => {
    it('should detect Vue project directories', () => {
      // Create Vue project structure
      writeFileSync(join(testRoot, 'vue.config.js'), '// Vue config')
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'components'), { recursive: true })
      mkdirSync(join(testRoot, 'pages'), { recursive: true })

      const directories = detectCodeDirectories(testRoot)

      expect(directories).toHaveLength(3)
      expect(directories).toContain(join(testRoot, 'src'))
      expect(directories).toContain(join(testRoot, 'components'))
      expect(directories).toContain(join(testRoot, 'pages'))
    })

    it('should detect React project directories', () => {
      // Create React project structure
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      writeFileSync(join(testRoot, 'src', 'App.tsx'), '// React app')
      mkdirSync(join(testRoot, 'components'), { recursive: true })

      const directories = detectCodeDirectories(testRoot)

      expect(directories).toContain(join(testRoot, 'src'))
      expect(directories).toContain(join(testRoot, 'components'))
    })

    it('should fall back to common patterns when no project type detected', () => {
      // Create directories without project indicators
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'lib'), { recursive: true })
      mkdirSync(join(testRoot, 'utils'), { recursive: true })

      const directories = detectCodeDirectories(testRoot)

      expect(directories).toContain(join(testRoot, 'src'))
      expect(directories).toContain(join(testRoot, 'lib'))
      expect(directories).toContain(join(testRoot, 'utils'))
    })

    it('should fall back to root directory when no code directories found', () => {
      // Empty project with no recognizable structure
      const directories = detectCodeDirectories(testRoot)

      expect(directories).toHaveLength(1)
      expect(directories[0]).toBe(testRoot)
    })

    it('should handle nested project structures', () => {
      // Create nested structure
      mkdirSync(join(testRoot, 'client', 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'server', 'src'), { recursive: true })

      const directories = detectCodeDirectories(testRoot)

      expect(directories).toContain(join(testRoot, 'client/src'))
      expect(directories).toContain(join(testRoot, 'server/src'))
    })
  })

  describe('Directory Validation', () => {
    it('should validate existing directories', () => {
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'lib'), { recursive: true })

      const directories = [
        join(testRoot, 'src'),
        join(testRoot, 'lib'),
        join(testRoot, 'nonexistent'),
      ]

      const valid = validateDirectories(directories)

      expect(valid).toHaveLength(2)
      expect(valid).toContain(join(testRoot, 'src'))
      expect(valid).toContain(join(testRoot, 'lib'))
      expect(valid).not.toContain(join(testRoot, 'nonexistent'))
    })

    it('should return empty array for all invalid directories', () => {
      const directories = [
        join(testRoot, 'nonexistent1'),
        join(testRoot, 'nonexistent2'),
      ]

      const valid = validateDirectories(directories)

      expect(valid).toHaveLength(0)
    })
  })

  describe('Ignore Patterns', () => {
    it('should return standard ignore patterns', () => {
      const patterns = getIgnorePatterns()

      expect(patterns).toContain('**/node_modules/**')
      expect(patterns).toContain('**/.git/**')
      expect(patterns).toContain('**/dist/**')
      expect(patterns).toContain('**/build/**')
      expect(patterns).toContain('**/.next/**')
      expect(patterns).toContain('**/.nuxt/**')
    })

    it('should include development-specific patterns', () => {
      const patterns = getIgnorePatterns()

      expect(patterns).toContain('**/coverage/**')
      expect(patterns).toContain('**/.cache/**')
      expect(patterns).toContain('**/tmp/**')
      expect(patterns).toContain('**/temp/**')
    })
  })

  describe('Watching Summary', () => {
    it('should provide comprehensive watching summary', () => {
      // Create Vue project structure
      writeFileSync(join(testRoot, 'vue.config.js'), '// Vue config')
      mkdirSync(join(testRoot, 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'components'), { recursive: true })

      const summary = getWatchingSummary(testRoot)

      expect(summary.projectRoot).toBe(testRoot)
      expect(summary.projectType).toBe('vue')
      expect(summary.watchedDirectories).toHaveLength(2)
      expect(summary.watchedCount).toBe(2)
      expect(summary.ignorePatterns.length).toBeGreaterThan(0)
      expect(summary.ignoreCount).toBeGreaterThan(0)
    })

    it('should handle unknown project type', () => {
      const summary = getWatchingSummary(testRoot)

      expect(summary.projectType).toBe('unknown')
      expect(summary.watchedDirectories).toHaveLength(1)
      expect(summary.watchedDirectories[0]).toBe(testRoot)
    })
  })

  describe('Edge Cases', () => {
    it('should handle non-existent project root', () => {
      const nonExistentPath = join(testRoot, 'nonexistent')

      const directories = detectCodeDirectories(nonExistentPath)

      expect(directories).toHaveLength(1)
      expect(directories[0]).toBe(nonExistentPath)
    })

    it('should handle permission errors gracefully', () => {
      // This test might be platform-specific, so we'll mock the behavior
      const directories = detectCodeDirectories('/root') // Typically restricted

      // Should fall back to the provided path even if it's not accessible
      expect(directories).toHaveLength(1)
      expect(directories[0]).toBe('/root')
    })

    it('should handle complex monorepo structures', () => {
      // Create complex monorepo
      writeFileSync(join(testRoot, 'lerna.json'), '{}')
      mkdirSync(join(testRoot, 'packages', 'ui', 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'packages', 'api', 'src'), { recursive: true })
      mkdirSync(join(testRoot, 'apps', 'web'), { recursive: true })

      const directories = detectCodeDirectories(testRoot)

      expect(directories).toContain(join(testRoot, 'packages'))
      expect(directories).toContain(join(testRoot, 'apps'))
    })
  })
})