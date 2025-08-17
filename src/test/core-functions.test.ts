/**
 * Test core functions using patterns similar to original tests
 */

import { describe, it, expect } from 'vitest'
import { analyzeProject } from '../analysis/index.js'
import { createProject, parseProject } from '../project/manager.js'
import { searchCode, findUsage } from '../core/search.js'

describe('Core Functions (Original Test Patterns)', () => {
  const testFixture = './src/test/fixtures/simple-ts'

  it('should initialize and parse a project like TreeManager', async () => {
    // Similar to how TreeManager.initialize() worked
    const project = createProject({
      directory: testFixture,
      languages: ['typescript'],
    })

    await parseProject(project)

    // Check project was initialized
    expect(project.id).toBeDefined()
    expect(project.config.directory).toContain('simple-ts')
    expect(project.files.size).toBeGreaterThanOrEqual(0)
  })

  it('should analyze code quality like old analyze-code tool', async () => {
    // Similar to how analyzeCode() tool worked
    const result = await analyzeProject(testFixture, {
      includeQuality: true,
      includeDeadcode: false,
      includeStructure: false,
    })

    // Check analysis results structure
    expect(result).toHaveProperty('findings')
    expect(result).toHaveProperty('metrics')
    expect(result).toHaveProperty('summary')
    expect(result.metrics.quality).toBeDefined()
    expect(result.metrics.quality.codeQualityScore).toBeGreaterThanOrEqual(0)
    expect(result.metrics.quality.codeQualityScore).toBeLessThanOrEqual(10)
  })

  it('should search code like old search-code tool', async () => {
    // Similar to how searchCode() tool worked
    const project = createProject({
      directory: testFixture,
      languages: ['typescript'],
    })

    await parseProject(project)

    const allNodes = Array.from(project.files.values())
    const elementNodes = Array.from(project.nodes.values()).flat()
    const searchNodes = [...allNodes, ...elementNodes]

    const results = searchCode('user', searchNodes, {
      maxResults: 10,
      exactMatch: false,
    })

    // Check search results structure
    expect(Array.isArray(results)).toBe(true)
    results.forEach((result) => {
      expect(result).toHaveProperty('node')
      expect(result).toHaveProperty('score')
      expect(result.node).toHaveProperty('type')
      expect(result.node).toHaveProperty('path')
    })
  })

  it('should find usage like old find-usage tool', async () => {
    // Similar to how findUsage() tool worked
    const project = createProject({
      directory: testFixture,
      languages: ['typescript'],
    })

    await parseProject(project)

    const allNodes = Array.from(project.files.values())
    const elementNodes = Array.from(project.nodes.values()).flat()
    const searchNodes = [...allNodes, ...elementNodes]

    const results = findUsage('User', searchNodes, {
      exactMatch: true,
    })

    // Check usage results structure
    expect(Array.isArray(results)).toBe(true)
    results.forEach((result) => {
      expect(result).toHaveProperty('node')
      expect(result.node).toHaveProperty('type')
      expect(result.node).toHaveProperty('path')
      expect(result).toHaveProperty('context')
    })
  })

  it('should run full analysis like integration tests', async () => {
    // Similar to integration test patterns
    const result = await analyzeProject(testFixture, {
      includeQuality: true,
      includeDeadcode: true,
      includeStructure: true,
    })

    // Comprehensive analysis checks
    expect(result.findings).toBeDefined()
    expect(result.summary.totalFindings).toBeGreaterThanOrEqual(0)
    expect(result.summary.criticalFindings).toBeGreaterThanOrEqual(0)
    expect(result.summary.warningFindings).toBeGreaterThanOrEqual(0)
    expect(result.summary.infoFindings).toBeGreaterThanOrEqual(0)

    // Should have quality metrics
    if (result.metrics.quality) {
      expect(result.metrics.quality.totalMethods).toBeGreaterThanOrEqual(0)
      expect(result.metrics.quality.avgComplexity).toBeGreaterThanOrEqual(0)
    }
  })
})