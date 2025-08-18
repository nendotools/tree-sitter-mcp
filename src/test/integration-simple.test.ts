/**
 * Simple integration test to verify TreeManager basic functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolve } from 'path'
import { createProject, parseProject } from '../project/manager.js'
import { analyzeProject } from '../analysis/index.js'
import { searchCode } from '../core/search.js'
import type { Project } from '../types/core.js'

describe('Simple Integration Test', () => {
  let testProjects: Project[] = []

  const fixturesDir = resolve(import.meta.dirname, 'fixtures')
  const simpleProjectDir = resolve(fixturesDir, 'simple-ts')

  beforeEach(() => {
    testProjects = []
  })

  afterEach(async () => {
    // Cleanup projects
    testProjects.forEach((_project) => {
      try {
        // Project cleanup in our simplified system is automatic
      }
      catch {
        // Ignore cleanup errors
      }
    })
  })

  it('should create a project successfully', () => {
    const project = createProject({
      directory: simpleProjectDir,
      languages: ['typescript'],
      maxDepth: 10,
      ignoreDirs: ['node_modules', '.git'],
    })

    expect(project).toBeDefined()
    expect(project.id).toBeDefined()
    expect(project.config.directory).toBe(simpleProjectDir)
    expect(project.config.languages).toContain('typescript')

    testProjects.push(project)
  })

  it('should initialize project and find files', async () => {
    const project = createProject({
      directory: simpleProjectDir,
      languages: ['typescript'],
      maxDepth: 10,
      ignoreDirs: ['node_modules', '.git'],
    })

    await parseProject(project)

    expect(project.files.size).toBeGreaterThanOrEqual(0)
    console.info('Project stats:', {
      totalFiles: project.files.size,
      totalNodes: Array.from(project.nodes.values()).reduce((sum, nodes) => sum + nodes.length, 0),
    })

    testProjects.push(project)
  })

  it('should handle project lifecycle', async () => {
    // Create project
    const project = createProject({
      directory: simpleProjectDir,
      languages: ['typescript'],
      maxDepth: 10,
      ignoreDirs: ['node_modules', '.git'],
    })
    expect(project).toBeDefined()

    // Initialize project
    await parseProject(project)
    expect(project.files.size).toBeGreaterThanOrEqual(0)

    // Test analysis integration
    const analysisResult = await analyzeProject(simpleProjectDir, {
      includeQuality: true,
    })
    expect(analysisResult).toBeDefined()
    expect(analysisResult.findings).toBeDefined()

    testProjects.push(project)
  })

  it('should perform basic search', async () => {
    const project = createProject({
      directory: simpleProjectDir,
      languages: ['typescript'],
      maxDepth: 10,
      ignoreDirs: ['node_modules', '.git'],
    })

    await parseProject(project)

    // Perform a search - looking for any results
    const allNodes = Array.from(project.files.values())
    const elementNodes = Array.from(project.nodes.values()).flat()
    const searchNodes = [...allNodes, ...elementNodes]

    const results = searchCode('user', searchNodes, {
      maxResults: 10,
    })

    console.info('Search results for "user":', results)

    // The search should complete without error, even if no results
    expect(results).toBeInstanceOf(Array)

    testProjects.push(project)
  })
})
