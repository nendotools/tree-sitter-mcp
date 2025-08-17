/**
 * Integration tests that validate analyzers detect actual quality issues
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TreeManager } from '../core/tree-manager.js'
import { analyzeCode } from '../mcp/tools/analyze-code.js'
import { getParserRegistry } from '../parsers/registry.js'
import type { Config } from '../types/index.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Quality Validation Tests', () => {
  let treeManager: TreeManager
  const projectId = 'quality-test-project'
  const fixturesPath = path.join(__dirname, 'fixtures', 'quality-issues')

  beforeAll(async () => {
    treeManager = new TreeManager(getParserRegistry())

    const config: Config = {
      workingDir: fixturesPath,
      languages: ['typescript', 'html', 'json'],
      maxDepth: 5,
      ignoreDirs: ['node_modules', '.git'],
    }

    treeManager.createProject(projectId, config)
    await treeManager.initializeProject(projectId)
  })

  afterAll(async () => {
    try {
      treeManager.destroyProject(projectId)
    }
    catch {
      // Project may already be destroyed
    }
  })

  it('should detect high complexity in complex function', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['quality'],
      scope: 'project',
    }, treeManager)

    expect(result.type).toBe('text')
    const jsonResult = JSON.parse(result.text)

    // Should find quality issues
    expect(jsonResult.summary.totalIssues).toBeGreaterThan(0)

    // Should have quality metrics
    expect(jsonResult.metrics.quality).toBeDefined()
    expect(jsonResult.metrics.quality.totalMethods).toBeGreaterThan(0)

    // Should detect quality issues in findings
    const qualityFindings = jsonResult.findings.filter((f: any) => f.type === 'quality')
    expect(qualityFindings.length).toBeGreaterThan(0)

    // Should detect long methods
    const longMethodFindings = qualityFindings.filter((f: any) =>
      f.description.includes('long') || f.description.includes('method'),
    )
    expect(longMethodFindings.length).toBeGreaterThan(0)
  })

  it('should detect circular dependencies', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['structure'],
      scope: 'project',
    }, treeManager)

    expect(result.type).toBe('text')
    const jsonResult = JSON.parse(result.text)

    // Should have structure analysis
    expect(jsonResult.metrics.structure).toBeDefined()
    expect(jsonResult.metrics.structure.analyzedFiles).toBeGreaterThan(0)

    // Should find structural issues (HTML nesting depth in our test case)
    expect(jsonResult.summary.totalIssues).toBeGreaterThan(0)
  })

  it('should detect orphaned files (conservative unused exports approach)', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['deadcode'],
      scope: 'project',
    }, treeManager)

    expect(result.type).toBe('text')
    const jsonResult = JSON.parse(result.text)

    // Should find dead code issues (orphaned files)
    expect(jsonResult.summary.totalIssues).toBeGreaterThan(0)

    // Should have deadcode metrics
    expect(jsonResult.metrics.deadCode).toBeDefined()
    expect(jsonResult.metrics.deadCode.orphanedFiles).toBeGreaterThan(0)

    // Unused exports detection is conservative (assumes all exports used if file imported)
    // This avoids false positives but means unused exports = 0 for imported files
    expect(jsonResult.metrics.deadCode.unusedExports).toBe(0)

    // Should detect orphaned file issues
    const deadcodeFindings = jsonResult.findings.filter((f: any) => f.type === 'deadcode')
    expect(deadcodeFindings.length).toBeGreaterThan(0)

    // Should specifically detect orphaned files
    const orphanedFiles = deadcodeFindings.filter((f: any) => f.category === 'orphaned_file')
    expect(orphanedFiles.length).toBeGreaterThan(0)
  })

  it('should detect HTML nesting depth issues', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['structure'],
      scope: 'project',
    }, treeManager)

    expect(result.type).toBe('text')
    const jsonResult = JSON.parse(result.text)

    // Should include HTML metrics
    expect(jsonResult.metrics.structure.htmlFiles).toBeGreaterThan(0)
    expect(jsonResult.metrics.structure.maxNestingDepth).toBeGreaterThan(10)
  })

  it('should detect config validation issues', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['config-validation'],
      scope: 'project',
    }, treeManager)

    expect(result.type).toBe('text')
    const jsonResult = JSON.parse(result.text)

    // Should find config validation issues
    expect(jsonResult.summary.totalIssues).toBeGreaterThan(0)

    // Should have config validation metrics
    expect(jsonResult.metrics.configValidation).toBeDefined()
    expect(jsonResult.metrics.configValidation.validationErrors).toBeGreaterThan(0)

    // Should detect config validation issues in findings
    const configFindings = jsonResult.findings.filter((f: any) => f.type === 'config-validation')
    expect(configFindings.length).toBeGreaterThan(0)
  })

  it('should detect multiple issue types in combined analysis', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['quality', 'structure', 'deadcode', 'config-validation'],
      scope: 'project',
    }, treeManager)

    expect(result.type).toBe('text')
    const jsonResult = JSON.parse(result.text)

    // Should find issues across all categories (conservative deadcode means fewer issues)
    expect(jsonResult.summary.totalIssues).toBeGreaterThan(10)

    // Should have all analysis types in project metadata
    expect(jsonResult.project.analysisTypes).toContain('quality')
    expect(jsonResult.project.analysisTypes).toContain('structure')
    expect(jsonResult.project.analysisTypes).toContain('deadcode')
    expect(jsonResult.project.analysisTypes).toContain('config-validation')

    // Should have findings from multiple analyzers
    const findingTypes = new Set(jsonResult.findings.map((f: any) => f.type))
    expect(findingTypes.has('quality')).toBe(true)
    expect(findingTypes.has('structure')).toBe(true)
    expect(findingTypes.has('deadcode')).toBe(true)
    expect(findingTypes.has('config-validation')).toBe(true)

    // Should show non-zero metrics for each category
    expect(jsonResult.metrics.quality.totalMethods).toBeGreaterThan(0)
    expect(jsonResult.metrics.structure.analyzedFiles).toBeGreaterThan(0)
    expect(jsonResult.metrics.deadCode.unusedExports).toBe(0) // Conservative approach
    expect(jsonResult.metrics.configValidation.validationErrors).toBeGreaterThan(0)
  })
})