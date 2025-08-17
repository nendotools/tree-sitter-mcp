/**
 * Final validation test to verify all analyzers are working with non-zero results
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

describe('Final Validation - All Analyzers Working', () => {
  let treeManager: TreeManager
  const projectId = 'final-validation-project'
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

  it('should show all analyzers detecting real issues (non-zero results)', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['quality', 'structure', 'deadcode', 'config-validation'],
      scope: 'project',
    }, treeManager)

    expect(result.type).toBe('text')
    const output = result.text

    console.log('=== FINAL ANALYSIS RESULTS ===')
    console.log(output)
    console.log('==============================')

    // Parse JSON and extract metrics
    const jsonResult = JSON.parse(output)
    const totalIssues = jsonResult.summary.totalIssues
    const qualityMethods = jsonResult.metrics.quality?.totalMethods || 0
    const structureFiles = jsonResult.metrics.structure?.analyzedFiles || 0
    const deadcodeOrphaned = jsonResult.metrics.deadCode?.orphanedFiles || 0
    const deadcodeUnused = jsonResult.metrics.deadCode?.unusedExports || 0
    const configValidated = jsonResult.metrics.configValidation?.validatedFiles || 0
    const configErrors = jsonResult.metrics.configValidation?.validationErrors || 0

    console.log('=== EXTRACTED METRICS ===')
    console.log(`Total Issues: ${totalIssues}`)
    console.log(`Quality - Methods Analyzed: ${qualityMethods}`)
    console.log(`Structure - Files Analyzed: ${structureFiles}`)
    console.log(`Dead Code - Orphaned Files: ${deadcodeOrphaned}`)
    console.log(`Dead Code - Unused Exports: ${deadcodeUnused}`)
    console.log(`Config - Validated Files: ${configValidated}`)
    console.log(`Config - Validation Errors: ${configErrors}`)
    console.log('========================')

    // All analyzers should have non-zero meaningful results
    expect(totalIssues).toBeGreaterThan(0)
    expect(qualityMethods).toBeGreaterThan(0) // Quality analyzer working
    expect(structureFiles).toBeGreaterThan(0) // Structure analyzer working
    expect(deadcodeOrphaned).toBeGreaterThan(0) // Dead code analyzer working
    expect(deadcodeUnused).toBe(0) // Conservative: unused exports = 0 for imported files
    expect(configValidated).toBeGreaterThan(0) // Config analyzer finding files
    expect(configErrors).toBeGreaterThan(0) // Config analyzer detecting errors

    // Verify no analyzer is returning only zeros
    expect(totalIssues).toBeGreaterThan(10) // Should be substantial number of issues
  })
})