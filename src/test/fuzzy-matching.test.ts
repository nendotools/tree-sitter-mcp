/**
 * Comprehensive fuzzy matching tests
 */

import { describe, it, expect } from 'vitest'
import { SearchEngine } from '../core/search/search-engine.js'
import type { SearchOptions, NodeType, TreeNode } from '../types/index.js'

describe('Fuzzy Matching System', () => {
  describe('Word Boundary Splitting', () => {
    it('should split camelCase correctly', () => {
      const engine = new SearchEngine() as any // Access private method for testing

      expect(engine.splitIntoWords('getUserName')).toEqual(['get', 'User', 'Name'])
      expect(engine.splitIntoWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request'])
      expect(engine.splitIntoWords('getUserV2')).toEqual(['get', 'User', 'V', '2'])
      expect(engine.splitIntoWords('field1Name')).toEqual(['field', '1', 'Name'])
      expect(engine.splitIntoWords('HTML5Parser')).toEqual(['HTML', '5', 'Parser'])
    })

    it('should split snake_case correctly', () => {
      const engine = new SearchEngine() as any

      expect(engine.splitIntoWords('user_service')).toEqual(['user', 'service'])
      expect(engine.splitIntoWords('API_BASE_URL')).toEqual(['API', 'BASE', 'URL'])
      expect(engine.splitIntoWords('HTTP_CLIENT_V2')).toEqual(['HTTP', 'CLIENT', 'V2'])
    })

    it('should handle mixed patterns', () => {
      const engine = new SearchEngine() as any

      expect(engine.splitIntoWords('getUserV2_data')).toEqual(['getUserV2', 'data'])
      expect(engine.splitIntoWords('XMLParser_v1')).toEqual(['XMLParser', 'v1'])
    })
  })

  describe('Fuzzy Score Calculation', () => {
    it('should score exact matches highest', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false }

      // Test direct scoring algorithm
      const exactScore = engine.calculateFuzzyScore('User', 'User', options)
      const partialScore = engine.calculateFuzzyScore('UserData', 'User', options)

      expect(exactScore).toBeGreaterThanOrEqual(100) // Perfect exact match (includes bonuses)
      expect(partialScore).toBeLessThan(exactScore) // Partial should be less
    })

    it('should handle case sensitivity in scoring', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false }

      const exactCaseScore = engine.calculateFuzzyScore('User', 'User', options)
      const lowerCaseScore = engine.calculateFuzzyScore('User', 'user', options)

      expect(exactCaseScore).toBeGreaterThanOrEqual(100) // Includes bonuses
      expect(lowerCaseScore).toBeGreaterThanOrEqual(95) // Mixed case exact match
      // Both should be high scores for exact matches, case matters less than match type
    })

    it('should score prefix matches highly', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false }

      const prefixScore = engine.calculateFuzzyScore('getUserById', 'get', options)
      const substringScore = engine.calculateFuzzyScore('createUserHelper', 'get', options)

      expect(prefixScore).toBeGreaterThan(substringScore)
      expect(prefixScore).toBeGreaterThanOrEqual(80) // Prefix score with bonuses
    })

    it('should handle word boundary matching', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false }

      const boundaryScore = engine.calculateFuzzyScore('UserService', 'Service', options)
      expect(boundaryScore).toBeGreaterThanOrEqual(75) // Word boundary match with bonuses

      const lowerBoundaryScore = engine.calculateFuzzyScore('UserService', 'service', options)
      expect(lowerBoundaryScore).toBeGreaterThanOrEqual(65) // Mixed case word match
    })

    it('should apply sequence matching for partial matches', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false, fuzzyThreshold: 20 }

      const sequenceScore = engine.calculateFuzzyScore('UserService', 'UsrSrv', options)
      expect(sequenceScore).toBeGreaterThan(0) // Should get some sequence match
      expect(sequenceScore).toBeLessThan(50) // But less than substring
    })
  })

  describe('Priority Type Bonuses', () => {
    it('should calculate priority bonuses correctly', () => {
      const engine = new SearchEngine() as any

      // Mock a node
      const classNode: TreeNode = {
        id: 'test-id',
        name: 'User',
        type: 'class' as NodeType,
        path: 'test.ts',
        language: 'typescript',
      } as TreeNode

      const withoutPriority = engine.calculateScore(classNode, 75, {})
      const withPriority = engine.calculateScore(classNode, 75, {
        priorityType: 'class' as NodeType,
      })

      expect(withPriority).toBeGreaterThan(withoutPriority)
      expect(withPriority - withoutPriority).toBe(10) // Priority bonus
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty queries gracefully', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false }

      const score = engine.calculateFuzzyScore('UserService', '', options)
      expect(score).toBe(0)
    })

    it('should handle very short queries', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false }

      const score = engine.calculateFuzzyScore('User', 'u', options)
      expect(score).toBeGreaterThan(0) // Should get some match
    })

    it('should handle queries longer than names', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false }

      const score = engine.calculateFuzzyScore(
        'User',
        'UserServiceMethodThatDoesNotExist',
        options,
      )
      expect(score).toBeGreaterThan(0) // Should get some word match
    })

    it('should handle special characters in queries', () => {
      const engine = new SearchEngine() as any
      const options: SearchOptions = { exactMatch: false }

      // Should not crash
      expect(() => {
        engine.calculateFuzzyScore('getUser', 'get-user', options)
      }).not.toThrow()
    })
  })

  describe('Character Sequence Matching', () => {
    it('should match character sequences in order', () => {
      const engine = new SearchEngine() as any

      // Test the sequence matching algorithm directly
      const score1 = engine.calculateSequenceMatch('userservice', 'usrsrv')
      const score2 = engine.calculateSequenceMatch('userservice', 'xyz')

      expect(score1).toBeGreaterThan(0)
      expect(score2).toBe(0)
    })

    it('should handle edge cases in sequence matching', () => {
      const engine = new SearchEngine() as any

      // Empty query
      expect(engine.calculateSequenceMatch('test', '')).toBe(0)

      // Query longer than name
      expect(engine.calculateSequenceMatch('a', 'abc')).toBe(0)

      // Perfect sequence
      expect(engine.calculateSequenceMatch('abc', 'abc')).toBeGreaterThan(0)
    })
  })
})
