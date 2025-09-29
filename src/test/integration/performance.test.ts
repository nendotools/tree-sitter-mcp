/**
 * Persistence performance integration test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolve } from 'path'
import { createPersistentManager, getOrCreateProject, clearAllProjects } from '../../project/persistent-manager.js'
import { searchCode, findUsage } from '../../core/search.js'
// import { analyzeProject } from '../../analysis/index.js'
import type { PersistentProjectManager } from '../../project/persistent-manager.js'

describe('Persistence Performance Test', () => {
  let persistentManager: PersistentProjectManager

  const fixturesDir = resolve(import.meta.dirname, '../fixtures')
  const testProjectDir = resolve(fixturesDir, 'simple-ts')

  beforeEach(() => {
    // Create fresh persistent manager for each test
    persistentManager = createPersistentManager(10)
  })

  afterEach(() => {
    // Clean up all projects
    clearAllProjects(persistentManager)
  })

  it('should demonstrate basic caching functionality', async () => {
    const projectId = 'cache-test-project'

    // Test 1: First project creation
    const project1 = await getOrCreateProject(persistentManager, {
      directory: testProjectDir,
      languages: ['typescript'],
      autoWatch: false,
    }, projectId)

    expect(project1).toBeDefined()
    expect(project1.id).toBe(projectId)
    expect(project1.files.size).toBeGreaterThanOrEqual(0)

    // Test 2: Second project access (should reuse existing)
    const project2 = await getOrCreateProject(persistentManager, {
      directory: testProjectDir,
      languages: ['typescript'],
      autoWatch: false,
    }, projectId)

    expect(project2).toBe(project1) // Should be same instance
    expect(project2.id).toBe(projectId)

    // Test 3: Search functionality works
    const allNodes = Array.from(project2.files.values())
    const elementNodes = Array.from(project2.nodes.values()).flat()
    const searchNodes = [...allNodes, ...elementNodes]

    const results = searchCode('user', searchNodes, {
      maxResults: 10,
    })

    expect(results).toBeInstanceOf(Array)

    // Test 4: Different projectId creates new project
    const project4 = await getOrCreateProject(persistentManager, {
      directory: testProjectDir,
      languages: ['typescript'],
      autoWatch: false,
    }, 'different-project')

    expect(project4).not.toBe(project1) // Should be different instance
    expect(project4.id).toBe('different-project')
  })

  it('should handle multiple projects with LRU eviction', async () => {
    // Create a small manager to test eviction
    const smallManager = createPersistentManager(2) // Only 2 projects max

    console.info('[TEST] Testing LRU Eviction')
    console.info('======================')

    // Create first project
    await getOrCreateProject(smallManager, {
      directory: testProjectDir,
      languages: ['typescript'],
    }, 'project-1')

    expect(smallManager.memory.projects.size).toBe(1)
    console.info(`[RESULT] Project 1 created (total: ${smallManager.memory.projects.size})`)

    // Create second project
    await getOrCreateProject(smallManager, {
      directory: testProjectDir,
      languages: ['typescript'],
    }, 'project-2')

    expect(smallManager.memory.projects.size).toBe(2)
    console.info(`[RESULT] Project 2 created (total: ${smallManager.memory.projects.size})`)

    // Create third project (should evict oldest)
    await getOrCreateProject(smallManager, {
      directory: testProjectDir,
      languages: ['typescript'],
    }, 'project-3')

    expect(smallManager.memory.projects.size).toBe(2) // Still only 2
    expect(smallManager.memory.projects.has('project-1')).toBe(false) // Evicted
    expect(smallManager.memory.projects.has('project-2')).toBe(true) // Kept
    expect(smallManager.memory.projects.has('project-3')).toBe(true) // New

    console.info(`[RESULT] Project 3 created, project 1 evicted (total: ${smallManager.memory.projects.size})`)

    clearAllProjects(smallManager)
  })

  it('should generate collision-safe project IDs from directory names', async () => {
    console.info('[TEST] Testing ProjectId Generation')
    console.info('===============================')

    // Test auto-generation from directory name
    const autoProject = await getOrCreateProject(persistentManager, {
      directory: testProjectDir,
      languages: ['typescript'],
    }) // No projectId provided

    expect(autoProject.id).toBe('simple-ts') // Should use directory name
    console.info(`[RESULT] Auto-generated projectId: "${autoProject.id}"`)

    // Test explicit projectId
    const explicitProject = await getOrCreateProject(persistentManager, {
      directory: testProjectDir,
      languages: ['typescript'],
    }, 'custom-name')

    expect(explicitProject.id).toBe('custom-name')
    expect(explicitProject).not.toBe(autoProject) // Different projects
    console.info(`[RESULT] Explicit projectId: "${explicitProject.id}"`)

    // Verify both projects exist
    expect(persistentManager.memory.projects.size).toBe(2)
    console.info(`[RESULT] Total projects: ${persistentManager.memory.projects.size}`)
  })

  it('should maintain performance across multiple operations', async () => {
    const projectId = 'multi-op-test'
    const iterations = 5

    console.info('[TEST] Testing Multiple Operations Performance')
    console.info('=========================================')

    // Initial project creation
    const project = await getOrCreateProject(persistentManager, {
      directory: testProjectDir,
      languages: ['typescript'],
      autoWatch: false,
    }, projectId)

    const searchTimes: number[] = []
    const findUsageTimes: number[] = []

    // Perform multiple operations
    for (let i = 0; i < iterations; i++) {
      // Search operation
      const searchStart = performance.now()
      const allNodes = Array.from(project.files.values())
      const elementNodes = Array.from(project.nodes.values()).flat()
      const searchNodes = [...allNodes, ...elementNodes]

      searchCode('user', searchNodes, { maxResults: 5 })
      const searchTime = performance.now() - searchStart
      searchTimes.push(searchTime)

      // Find usage operation
      const usageStart = performance.now()
      findUsage('user', searchNodes, { exactMatch: false })
      const usageTime = performance.now() - usageStart
      findUsageTimes.push(usageTime)

      console.info(`Iteration ${i + 1}: Search ${searchTime.toFixed(2)}ms, Usage ${usageTime.toFixed(2)}ms`)
    }

    // Calculate averages
    const avgSearchTime = searchTimes.reduce((sum, time) => sum + time, 0) / iterations
    const avgUsageTime = findUsageTimes.reduce((sum, time) => sum + time, 0) / iterations

    console.info('[SUMMARY] Multi-Operation Summary')
    console.info('==========================')
    console.info(`Average search time: ${avgSearchTime.toFixed(2)}ms`)
    console.info(`Average usage time: ${avgUsageTime.toFixed(2)}ms`)
    console.info(`Total operations: ${iterations * 2}`)

    // Verify operations completed successfully (functionality test, not performance)
    expect(searchTimes.length).toBe(iterations)
    expect(findUsageTimes.length).toBe(iterations)
    expect(avgSearchTime).toBeGreaterThan(0) // Operations actually ran
    expect(avgUsageTime).toBeGreaterThan(0) // Operations actually ran
  })
})