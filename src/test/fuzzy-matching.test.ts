/**
 * Comprehensive fuzzy matching tests
 */

import { describe, it, expect } from 'vitest'
import { TreeManager } from '../core/tree-manager.js'
import { getParserRegistry } from '../parsers/registry.js'
import type { SearchOptions, NodeType, TreeNode } from '../types/index.js'

describe('Fuzzy Matching System', () => {
  describe('Word Boundary Splitting', () => {
    it('should split camelCase correctly', () => {
      const manager = new TreeManager(getParserRegistry()) as any // Access private method for testing

      expect(manager.splitIntoWords('getUserName')).toEqual(['get', 'User', 'Name'])
      expect(manager.splitIntoWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request'])
      expect(manager.splitIntoWords('getUserV2')).toEqual(['get', 'User', 'V', '2'])
      expect(manager.splitIntoWords('field1Name')).toEqual(['field', '1', 'Name'])
      expect(manager.splitIntoWords('HTML5Parser')).toEqual(['HTML', '5', 'Parser'])
    })

    it('should split snake_case correctly', () => {
      const manager = new TreeManager(getParserRegistry()) as any

      expect(manager.splitIntoWords('user_service')).toEqual(['user', 'service'])
      expect(manager.splitIntoWords('API_BASE_URL')).toEqual(['API', 'BASE', 'URL'])
      expect(manager.splitIntoWords('HTTP_CLIENT_V2')).toEqual(['HTTP', 'CLIENT', 'V2'])
    })

    it('should handle mixed patterns', () => {
      const manager = new TreeManager(getParserRegistry()) as any

      expect(manager.splitIntoWords('getUserV2_data')).toEqual(['getUserV2', 'data'])
      expect(manager.splitIntoWords('XMLParser_v1')).toEqual(['XMLParser', 'v1'])
    })
  })

  describe('Fuzzy Score Calculation', () => {
    it('should score exact matches highest', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false }

      // Test direct scoring algorithm
      const exactScore = manager.calculateFuzzyScore('User', 'User', options)
      const partialScore = manager.calculateFuzzyScore('UserData', 'User', options)

      expect(exactScore).toBeGreaterThanOrEqual(100) // Perfect exact match (includes bonuses)
      expect(partialScore).toBeLessThan(exactScore) // Partial should be less
    })

    it('should handle case sensitivity in scoring', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false }

      const exactCaseScore = manager.calculateFuzzyScore('User', 'User', options)
      const lowerCaseScore = manager.calculateFuzzyScore('User', 'user', options)

      expect(exactCaseScore).toBeGreaterThan(lowerCaseScore)
      expect(exactCaseScore).toBeGreaterThanOrEqual(100) // Includes bonuses
      expect(lowerCaseScore).toBeGreaterThanOrEqual(90) // Includes bonuses
    })

    it('should score prefix matches highly', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false }

      const prefixScore = manager.calculateFuzzyScore('getUserById', 'get', options)
      const substringScore = manager.calculateFuzzyScore('createUserHelper', 'get', options)

      expect(prefixScore).toBeGreaterThan(substringScore)
      expect(prefixScore).toBeGreaterThanOrEqual(80) // Prefix score with bonuses
    })

    it('should handle word boundary matching', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false }

      const boundaryScore = manager.calculateFuzzyScore('UserService', 'Service', options)
      expect(boundaryScore).toBe(90) // Exact case word match with bonuses

      const lowerBoundaryScore = manager.calculateFuzzyScore('UserService', 'service', options)
      expect(lowerBoundaryScore).toBe(90) // Mixed case word match with bonuses (same as exact case for word-level matches)
    })

    it('should apply sequence matching for partial matches', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false, fuzzyThreshold: 20 }

      const sequenceScore = manager.calculateFuzzyScore('UserService', 'UsrSrv', options)
      expect(sequenceScore).toBeGreaterThan(0) // Should get some sequence match
      expect(sequenceScore).toBeLessThan(50) // But less than substring
    })
  })

  describe('Priority Type Bonuses', () => {
    it('should calculate priority bonuses correctly', () => {
      const manager = new TreeManager(getParserRegistry()) as any

      // Mock a node
      const classNode: TreeNode = {
        id: 'test-id',
        name: 'User',
        type: 'class' as NodeType,
        path: 'test.ts',
        language: 'typescript',
      } as TreeNode

      const withoutPriority = manager.calculateScore(classNode, 75, {})
      const withPriority = manager.calculateScore(classNode, 75, {
        priorityType: 'class' as NodeType,
      })

      expect(withPriority).toBeGreaterThan(withoutPriority)
      expect(withPriority - withoutPriority).toBe(15) // Priority bonus
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty queries gracefully', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false }

      const score = manager.calculateFuzzyScore('UserService', '', options)
      expect(score).toBe(0)
    })

    it('should handle very short queries', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false }

      const score = manager.calculateFuzzyScore('User', 'u', options)
      expect(score).toBeGreaterThan(0) // Should get some match
    })

    it('should handle queries longer than names', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false }

      const score = manager.calculateFuzzyScore(
        'User',
        'UserServiceMethodThatDoesNotExist',
        options,
      )
      expect(score).toBe(16) // Partial word match with position bonus
    })

    it('should handle special characters in queries', () => {
      const manager = new TreeManager(getParserRegistry()) as any
      const options: SearchOptions = { exactMatch: false }

      // Should not crash
      expect(() => {
        manager.calculateFuzzyScore('getUser', 'get-user', options)
      }).not.toThrow()
    })
  })

  describe('Character Sequence Matching', () => {
    it('should match character sequences in order', () => {
      const manager = new TreeManager(getParserRegistry()) as any

      // Test the sequence matching algorithm directly
      const score1 = manager.calculateSequenceMatch('userservice', 'usrsrv')
      const score2 = manager.calculateSequenceMatch('userservice', 'xyz')

      expect(score1).toBeGreaterThan(0)
      expect(score2).toBe(0)
    })

    it('should handle edge cases in sequence matching', () => {
      const manager = new TreeManager(getParserRegistry()) as any

      // Empty query
      expect(manager.calculateSequenceMatch('test', '')).toBe(0)

      // Query longer than name
      expect(manager.calculateSequenceMatch('a', 'abc')).toBe(0)

      // Perfect sequence
      expect(manager.calculateSequenceMatch('abc', 'abc')).toBeGreaterThan(0)
    })
  })
})
