/**
 * Validation and sanitization tests
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import {
  createPersistentManager,
  getOrCreateProject,
  sanitizeProjectId,
  clearAllProjects,
} from '../project/persistent-manager.js'
import type { PersistentProjectManager } from '../project/persistent-manager.js'

describe('Validation and Sanitization', () => {
  let persistentManager: PersistentProjectManager

  const fixturesDir = resolve(import.meta.dirname, 'fixtures')
  const testProjectDir = resolve(fixturesDir, 'simple-ts')

  beforeEach(() => {
    persistentManager = createPersistentManager(10)
  })

  afterEach(() => {
    clearAllProjects(persistentManager)
  })

  describe('Directory Validation', () => {
    it('should throw error for nonexistent directory', async () => {
      const nonexistentPath = '/path/that/does/not/exist'

      await expect(
        getOrCreateProject(persistentManager, {
          directory: nonexistentPath,
        }),
      ).rejects.toThrow('Directory does not exist or is not accessible')
    })

    it('should work with valid directory', async () => {
      const project = await getOrCreateProject(persistentManager, {
        directory: testProjectDir,
      })

      expect(project).toBeDefined()
      expect(project.config.directory).toBe(testProjectDir)
    })
  })

  describe('Project ID Sanitization', () => {
    it('should handle valid project IDs unchanged', () => {
      expect(sanitizeProjectId('valid-name')).toBe('valid-name')
      expect(sanitizeProjectId('valid_name')).toBe('valid_name')
      expect(sanitizeProjectId('123numbers')).toBe('123numbers')
    })

    it('should sanitize invalid characters', () => {
      expect(sanitizeProjectId('invalid/chars\\here')).toBe('invalid-chars-here')
      expect(sanitizeProjectId('special@chars#test!')).toBe('special-chars-test')
      expect(sanitizeProjectId('question?marks')).toBe('question-marks')
      expect(sanitizeProjectId('pipe|chars')).toBe('pipe-chars')
    })

    it('should handle spaces and multiple dashes', () => {
      expect(sanitizeProjectId('  spaces and tabs  ')).toBe('spaces-and-tabs')
      expect(sanitizeProjectId('---multiple---dashes---')).toBe('multiple-dashes')
      expect(sanitizeProjectId('mixed  ---  chars')).toBe('mixed-chars')
    })

    it('should enforce minimum length', () => {
      expect(sanitizeProjectId('!!!')).toBe('project')
      expect(sanitizeProjectId('---')).toBe('project')
    })

    it('should enforce maximum length', () => {
      const longId = 'a'.repeat(100)
      const result = sanitizeProjectId(longId)

      expect(result.length).toBeLessThanOrEqual(64)
      expect(result).toMatch(/-[a-f0-9]{8}$/) // Should end with hash
    })

    it('should throw error for empty string', () => {
      expect(() => sanitizeProjectId('')).toThrow('Project ID must be a non-empty string')
      expect(() => sanitizeProjectId(null as any)).toThrow('Project ID must be a non-empty string')
      expect(() => sanitizeProjectId(undefined as any)).toThrow('Project ID must be a non-empty string')
    })

    it('should work with sanitized IDs in actual projects', async () => {
      const project1 = await getOrCreateProject(persistentManager, {
        directory: testProjectDir,
      }, 'invalid/chars\\test')

      expect(project1.id).toBe('invalid-chars-test')

      const project2 = await getOrCreateProject(persistentManager, {
        directory: testProjectDir,
      }, 'special@project#1!')

      expect(project2.id).toBe('special-project-1')
    })
  })

  describe('Edge Cases', () => {
    it('should handle Unicode characters', () => {
      const unicodeId = 'projekt-ñáme-测试'
      const result = sanitizeProjectId(unicodeId)

      expect(result).toBe('projekt-me')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle only special characters', () => {
      const result = sanitizeProjectId('@#$%^&*()')
      expect(result).toBe('project')
    })

    it('should handle mixed valid and invalid characters', () => {
      const result = sanitizeProjectId('my@awesome#project!')
      expect(result).toBe('my-awesome-project')
    })

    it('should handle repeated invalid characters', () => {
      const result = sanitizeProjectId('test///\\\\project')
      expect(result).toBe('test-project')
    })

    it('should preserve valid characters between invalid ones', () => {
      const result = sanitizeProjectId('a@b#c$d')
      expect(result).toBe('a-b-c-d')
    })
  })

  describe('Integration with Project Creation', () => {
    it('should prevent duplicate sanitized IDs from causing conflicts', async () => {
      const project1 = await getOrCreateProject(persistentManager, {
        directory: testProjectDir,
      }, 'test/project')

      const project2 = await getOrCreateProject(persistentManager, {
        directory: testProjectDir,
      }, 'test\\project')

      // Both should sanitize to similar names, but second should be cached
      expect(project1.id).toBe('test-project')
      expect(project2.id).toBe('test-project')
      expect(project1).toBe(project2) // Same project instance
    })
  })
})