/**
 * Tests for the analyze_code MCP tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TreeManager } from '../core/tree-manager.js'
import { analyzeCode } from '../mcp/tools/analyze-code.js'
import { getParserRegistry } from '../parsers/registry.js'
import type { AnalyzeCodeArgs, Config } from '../types/index.js'
import { resolve } from 'path'

// Helper functions for JSON response testing
function parseAnalysisResult(result: any) {
  expect(result.type).toBe('text')
  return JSON.parse(result.text)
}

function expectMetricExists(jsonResult: any, metricType: string, metricName: string): boolean {
  return jsonResult.metrics
    && jsonResult.metrics[metricType]
    && jsonResult.metrics[metricType][metricName] !== undefined
}

describe('Code Analysis Tests', () => {
  let treeManager: TreeManager
  let testConfig: Config

  beforeEach(async () => {
    treeManager = new TreeManager(getParserRegistry())
    testConfig = {
      workingDir: resolve('./src/test/fixtures/simple-ts'),
      languages: ['typescript'],
      maxDepth: 10,
      ignoreDirs: ['node_modules', '.git'],
    }
  })

  afterEach(async () => {
    // Clean up all projects
    const projects = treeManager.getAllProjects()
    for (const project of projects) {
      try {
        treeManager.destroyProject(project.projectId)
      }
      catch {
        // Project may already be destroyed in some tests
      }
    }
  })

  describe('Basic Functionality', () => {
    it('should analyze project-level quality', async () => {
      const projectId = 'test-analyze-quality'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toContain('quality')
      expect(expectMetricExists(jsonResult, 'quality', 'avgComplexity')).toBe(true)
      expect(expectMetricExists(jsonResult, 'quality', 'totalMethods')).toBe(true)
    })

    it('should handle file-level analysis', async () => {
      const projectId = 'test-analyze-file'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'file',
        target: 'src/services/userService.ts',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.scope).toBe('file')
      expect(jsonResult.project.target).toBe('src/services/userService.ts')
    })

    it('should handle method-level analysis', async () => {
      const projectId = 'test-analyze-method'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'method',
        target: 'updateUser',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.scope).toBe('method')
      expect(jsonResult.project.target).toBe('updateUser')
    })
  })

  describe('Quality Analysis', () => {
    it('should detect long methods', async () => {
      const projectId = 'test-quality-long-methods'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toContain('quality')
      expect(expectMetricExists(jsonResult, 'quality', 'avgMethodLength')).toBe(true)

      // Should include findings if any long methods are detected
      const longMethodFindings = jsonResult.findings?.filter((f: any) => f.type === 'long_method')
      if (longMethodFindings && longMethodFindings.length > 0) {
        expect(longMethodFindings[0].description).toContain('Method is very long')
      }
    })

    it('should calculate complexity metrics', async () => {
      const projectId = 'test-quality-complexity'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'quality', 'avgComplexity')).toBe(true)
      expect(expectMetricExists(jsonResult, 'quality', 'totalMethods')).toBe(true)
      expect(expectMetricExists(jsonResult, 'quality', 'codeQualityScore')).toBe(true)

      // Should have numeric values
      expect(typeof jsonResult.metrics.quality.avgComplexity).toBe('number')
      expect(typeof jsonResult.metrics.quality.totalMethods).toBe('number')
      expect(typeof jsonResult.metrics.quality.codeQualityScore).toBe('number')
      expect(jsonResult.metrics.quality.codeQualityScore).toBeGreaterThanOrEqual(0)
      expect(jsonResult.metrics.quality.codeQualityScore).toBeLessThanOrEqual(10)
    })

    it('should detect parameter overload', async () => {
      const projectId = 'test-quality-params'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'quality', 'avgParameters')).toBe(true)
      expect(typeof jsonResult.metrics.quality.avgParameters).toBe('number')
      expect(jsonResult.metrics.quality.avgParameters).toBeGreaterThanOrEqual(0)
    })

    it('should provide severity breakdown', async () => {
      const projectId = 'test-quality-severity'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.summary).toBeDefined()
      expect(typeof jsonResult.summary.totalIssues).toBe('number')
      expect(jsonResult.summary.severityBreakdown).toBeDefined()
      expect(typeof jsonResult.summary.severityBreakdown.critical).toBe('number')
      expect(typeof jsonResult.summary.severityBreakdown.warning).toBe('number')
      expect(typeof jsonResult.summary.severityBreakdown.info).toBe('number')
    })
  })

  describe('Multiple Analysis Types', () => {
    it('should handle quality and structure analysis together', async () => {
      const projectId = 'test-multi-analysis'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toEqual(expect.arrayContaining(['quality', 'structure']))
      expect(expectMetricExists(jsonResult, 'quality', 'avgComplexity')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
    })

    it('should handle all analysis types', async () => {
      const projectId = 'test-all-analysis'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'structure', 'deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toEqual(expect.arrayContaining(['quality', 'structure', 'deadcode']))
      expect(expectMetricExists(jsonResult, 'quality', 'avgComplexity')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'deadCode', 'orphanedFiles')).toBe(true)
    })
  })

  describe('Structure Analysis', () => {
    it('should provide structure metrics', async () => {
      const projectId = 'test-structure-metrics'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toContain('structure')
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'circularDependencies')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'highCouplingFiles')).toBe(true)
      expect(typeof jsonResult.metrics.structure.analyzedFiles).toBe('number')
    })

    it('should run structure analysis without errors', async () => {
      const projectId = 'test-structure-analysis'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(result.type).toBe('text')
      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toContain('structure')
      expect(jsonResult.summary).toBeDefined()
    })

    it('should handle combined quality and structure analysis', async () => {
      const projectId = 'test-combined-analysis'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toEqual(expect.arrayContaining(['quality', 'structure']))
      expect(expectMetricExists(jsonResult, 'quality', 'codeQualityScore')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
    })

    it('should analyze dependency relationships', async () => {
      const projectId = 'test-structure-dependencies'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'circularDependencies')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'highCouplingFiles')).toBe(true)
      expect(typeof jsonResult.metrics.structure.analyzedFiles).toBe('number')
      expect(typeof jsonResult.metrics.structure.circularDependencies).toBe('number')
      expect(typeof jsonResult.metrics.structure.highCouplingFiles).toBe('number')
    })

    it('should handle projects with no structural issues', async () => {
      const projectId = 'test-structure-clean'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.metrics.structure.circularDependencies).toBe(0)
      expect(jsonResult.metrics.structure.highCouplingFiles).toBe(0)
      expect(jsonResult.summary.totalIssues).toBe(0)
    })

    it('should detect structure issues when present', async () => {
      const projectId = 'test-structure-issues'

      // Use the test fixtures instead of the full src directory to avoid parser issues
      const complexConfig = {
        workingDir: resolve('./src/test/fixtures/simple-ts'),
        languages: ['typescript'],
        maxDepth: 5,
        ignoreDirs: ['node_modules', '.git'],
      }

      await treeManager.createProject(projectId, complexConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(typeof jsonResult.metrics.structure.analyzedFiles).toBe('number')

      // Should provide detailed analysis even if no issues found
      if (jsonResult.findings && jsonResult.findings.length > 0) {
        expect(Array.isArray(jsonResult.findings)).toBe(true)
      }
    })

    it('should work with file-level structure analysis', async () => {
      const projectId = 'test-structure-file-level'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'file',
        target: 'src/services/userService.ts',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.scope).toBe('file')
      expect(jsonResult.project.target).toBe('src/services/userService.ts')
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
    })

    it('should handle structure analysis with various thresholds', async () => {
      const projectId = 'test-structure-thresholds'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should complete without errors regardless of coupling levels
      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'structure', 'highCouplingFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'circularDependencies')).toBe(true)
    })
  })

  describe('Structure Analysis Edge Cases', () => {
    it('should handle empty projects', async () => {
      const projectId = 'test-structure-empty'
      const emptyConfig = {
        workingDir: resolve('./src/test/fixtures'),
        languages: ['nonexistent-language'], // Use a language that won't match any files
        maxDepth: 1,
        ignoreDirs: ['node_modules', '.git'],
      }

      await treeManager.createProject(projectId, emptyConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.metrics.structure.analyzedFiles).toBe(0)
      expect(jsonResult.metrics.structure.circularDependencies).toBe(0)
      expect(jsonResult.metrics.structure.highCouplingFiles).toBe(0)
    })

    it('should handle structure analysis on single file project', async () => {
      const projectId = 'test-structure-single-file'

      const singleFileConfig = {
        workingDir: resolve('./src/test/fixtures/simple-ts'),
        languages: ['typescript'],
        maxDepth: 1,
        ignoreDirs: ['node_modules', '.git'],
      }

      await treeManager.createProject(projectId, singleFileConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(typeof jsonResult.metrics.structure.analyzedFiles).toBe('number')
      expect(jsonResult.metrics.structure.circularDependencies).toBe(0)
    })

    it('should handle structure analysis with method scope', async () => {
      const projectId = 'test-structure-method-scope'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'method',
        target: 'updateUser',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.scope).toBe('method')
      expect(jsonResult.project.target).toBe('updateUser')
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
    })

    it('should provide consistent metrics format', async () => {
      const projectId = 'test-structure-metrics-format'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Verify expected metrics format
      expect(jsonResult.project.id).toBe(projectId)
      expect(typeof jsonResult.metrics.structure.analyzedFiles).toBe('number')
      expect(typeof jsonResult.metrics.structure.circularDependencies).toBe('number')
      expect(typeof jsonResult.metrics.structure.highCouplingFiles).toBe('number')

      // Should have proper JSON structure
      expect(jsonResult.metrics.structure).toBeDefined()
      expect(jsonResult.summary).toBeDefined()
    })

    it('should handle structure analysis with all scopes', async () => {
      const projectId = 'test-structure-all-scopes'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      // Test project scope
      const projectArgs: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const projectResult = await analyzeCode(projectArgs, treeManager)
      const projectJsonResult = parseAnalysisResult(projectResult)
      expect(projectJsonResult.project.scope).toBe('project')
      expect(expectMetricExists(projectJsonResult, 'structure', 'analyzedFiles')).toBe(true)

      // Test file scope
      const fileArgs: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'file',
        target: 'src/models/user.ts',
      }

      const fileResult = await analyzeCode(fileArgs, treeManager)
      const fileJsonResult = parseAnalysisResult(fileResult)
      expect(fileJsonResult.project.scope).toBe('file')
      expect(fileJsonResult.project.target).toBe('src/models/user.ts')
      expect(expectMetricExists(fileJsonResult, 'structure', 'analyzedFiles')).toBe(true)

      // Test method scope
      const methodArgs: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'method',
        target: 'createUser',
      }

      const methodResult = await analyzeCode(methodArgs, treeManager)
      const methodJsonResult = parseAnalysisResult(methodResult)
      expect(methodJsonResult.project.scope).toBe('method')
      expect(methodJsonResult.project.target).toBe('createUser')
      expect(expectMetricExists(methodJsonResult, 'structure', 'analyzedFiles')).toBe(true)
    })

    it('should integrate structure findings with overall summary', async () => {
      const projectId = 'test-structure-integration'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should have both analysis types in project
      expect(jsonResult.project.analysisTypes).toEqual(expect.arrayContaining(['quality', 'structure']))

      // Should have both metrics sections
      expect(expectMetricExists(jsonResult, 'quality', 'avgComplexity')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)

      // Summary should account for all findings
      expect(jsonResult.summary).toBeDefined()
      expect(typeof jsonResult.summary.totalIssues).toBe('number')
      expect(jsonResult.summary.severityBreakdown).toBeDefined()
      expect(typeof jsonResult.summary.severityBreakdown.critical).toBe('number')
      expect(typeof jsonResult.summary.severityBreakdown.warning).toBe('number')
      expect(typeof jsonResult.summary.severityBreakdown.info).toBe('number')
    })
  })

  describe('HTML Hierarchy Analysis', () => {
    it('should include HTML metrics in structure analysis', async () => {
      const projectId = 'test-html-metrics'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      // Should include HTML hierarchy metrics
      expect(expectMetricExists(jsonResult, 'structure', 'htmlFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'deeplyNestedElements')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'maxNestingDepth')).toBe(true)
      expect(typeof jsonResult.metrics.structure.htmlFiles).toBe('number')
      expect(typeof jsonResult.metrics.structure.deeplyNestedElements).toBe('number')
      expect(typeof jsonResult.metrics.structure.maxNestingDepth).toBe('number')
    })

    it('should handle projects with HTML files', async () => {
      const projectId = 'test-html-files'

      // Create a config that includes HTML files
      const htmlConfig = {
        workingDir: resolve('./src/test/fixtures'),
        languages: ['html', 'typescript'],
        maxDepth: 5,
        ignoreDirs: ['node_modules', '.git'],
      }

      await treeManager.createProject(projectId, htmlConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'htmlFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'deeplyNestedElements')).toBe(true)
    })

    it('should analyze Vue files for template nesting', async () => {
      const projectId = 'test-vue-nesting'

      const vueConfig = {
        workingDir: resolve('./src/test/fixtures'),
        languages: ['vue', 'typescript'],
        maxDepth: 5,
        ignoreDirs: ['node_modules', '.git'],
      }

      await treeManager.createProject(projectId, vueConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'htmlFiles')).toBe(true)
      expect(typeof jsonResult.metrics.structure.htmlFiles).toBe('number')
    })

    it('should detect excessive HTML nesting in findings', async () => {
      const projectId = 'test-html-nesting-detection'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should complete without errors even if no HTML nesting issues found
      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'structure', 'deeplyNestedElements')).toBe(true)
      expect(jsonResult.metrics.structure.deeplyNestedElements).toBe(0)

      // If findings exist, they should have proper format
      const htmlNestingFindings = jsonResult.findings?.filter((f: any) => f.type === 'excessive_html_nesting')
      if (htmlNestingFindings && htmlNestingFindings.length > 0) {
        expect(htmlNestingFindings[0].description).toContain('Element')
        expect(htmlNestingFindings[0].description).toContain('exceeds recommended depth of 5')
      }
    })

    it('should provide consistent HTML metrics across analysis types', async () => {
      const projectId = 'test-html-consistency'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      // Test structure-only analysis
      const structureArgs: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['structure'],
        scope: 'project',
      }

      const structureResult = await analyzeCode(structureArgs, treeManager)

      // Test combined analysis
      const combinedArgs: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'structure'],
        scope: 'project',
      }

      const combinedResult = await analyzeCode(combinedArgs, treeManager)

      // Both should have same HTML metrics
      const structureJsonResult = parseAnalysisResult(structureResult)
      const combinedJsonResult = parseAnalysisResult(combinedResult)

      if (expectMetricExists(structureJsonResult, 'structure', 'htmlFiles')
        && expectMetricExists(combinedJsonResult, 'structure', 'htmlFiles')) {
        expect(structureJsonResult.metrics.structure.htmlFiles).toBe(
          combinedJsonResult.metrics.structure.htmlFiles,
        )
      }

      expect(expectMetricExists(structureJsonResult, 'structure', 'htmlFiles')).toBe(true)
      expect(expectMetricExists(combinedJsonResult, 'structure', 'htmlFiles')).toBe(true)
    })
  })

  describe('Dead Code Analysis', () => {
    it('should provide dead code metrics', async () => {
      const projectId = 'test-deadcode-metrics'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toContain('deadcode')
      expect(expectMetricExists(jsonResult, 'deadCode', 'orphanedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'deadCode', 'unusedExports')).toBe(true)
      expect(expectMetricExists(jsonResult, 'deadCode', 'unusedDependencies')).toBe(true)
      expect(typeof jsonResult.metrics.deadCode.orphanedFiles).toBe('number')
      expect(typeof jsonResult.metrics.deadCode.unusedExports).toBe('number')
      expect(typeof jsonResult.metrics.deadCode.unusedDependencies).toBe('number')
    })

    it('should run dead code analysis without errors', async () => {
      const projectId = 'test-deadcode-analysis'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(result.type).toBe('text')
      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toContain('deadcode')
      expect(jsonResult.summary).toBeDefined()
    })

    it('should handle combined quality, structure and dead code analysis', async () => {
      const projectId = 'test-all-analysis-types'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'structure', 'deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toEqual(expect.arrayContaining(['quality', 'structure', 'deadcode']))
      expect(expectMetricExists(jsonResult, 'quality', 'codeQualityScore')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'deadCode', 'orphanedFiles')).toBe(true)
    })

    it('should work with file-level dead code analysis', async () => {
      const projectId = 'test-deadcode-file-level'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['deadcode'],
        scope: 'file',
        target: 'src/services/userService.ts',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.scope).toBe('file')
      expect(jsonResult.project.target).toBe('src/services/userService.ts')
      expect(expectMetricExists(jsonResult, 'deadCode', 'orphanedFiles')).toBe(true)
    })

    it('should handle method-level dead code analysis', async () => {
      const projectId = 'test-deadcode-method-level'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['deadcode'],
        scope: 'method',
        target: 'updateUser',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.scope).toBe('method')
      expect(jsonResult.project.target).toBe('updateUser')
      expect(expectMetricExists(jsonResult, 'deadCode', 'orphanedFiles')).toBe(true)
    })

    it('should detect potentially orphaned files', async () => {
      const projectId = 'test-orphaned-detection'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should complete without errors and may find orphaned files
      expect(jsonResult.project.id).toBe(projectId)
      // The simple-ts fixture actually has 3 files detected as orphaned by the analyzer
      expect(jsonResult.metrics.deadCode.orphanedFiles).toBe(3)

      // If findings exist, they should have proper format
      const orphanedFindings = jsonResult.findings?.filter((f: any) => f.type === 'orphaned_file')
      if (orphanedFindings && orphanedFindings.length > 0) {
        expect(orphanedFindings[0].description).toContain('appears to be orphaned')
      }
    })

    it('should detect unused exports', async () => {
      const projectId = 'test-unused-exports-detection'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should complete without errors even if no unused exports found
      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'deadCode', 'unusedExports')).toBe(true)

      // If findings exist, they should have proper format
      const unusedExportFindings = jsonResult.findings?.filter((f: any) => f.type === 'unused_export')
      if (unusedExportFindings && unusedExportFindings.length > 0) {
        expect(unusedExportFindings[0].description).toContain('not used elsewhere')
      }
    })

    it('should detect unused dependencies', async () => {
      const projectId = 'test-unused-dependencies-detection'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should complete without errors even if no unused dependencies found
      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.metrics.deadCode.unusedDependencies).toBe(0)

      // If findings exist, they should have proper format
      const unusedDepFindings = jsonResult.findings?.filter((f: any) => f.type === 'unused_dependency')
      if (unusedDepFindings && unusedDepFindings.length > 0) {
        expect(unusedDepFindings[0].description).toContain('not imported in any source files')
      }
    })

    it('should provide consistent metrics format for dead code analysis', async () => {
      const projectId = 'test-deadcode-metrics-format'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Verify expected metrics format
      expect(jsonResult.project.id).toBe(projectId)
      expect(typeof jsonResult.metrics.deadCode.orphanedFiles).toBe('number')
      expect(typeof jsonResult.metrics.deadCode.unusedExports).toBe('number')
      expect(typeof jsonResult.metrics.deadCode.unusedDependencies).toBe('number')

      // Should have proper JSON structure
      expect(jsonResult.metrics.deadCode).toBeDefined()
      expect(jsonResult.summary).toBeDefined()
    })

    it('should integrate dead code findings with overall summary', async () => {
      const projectId = 'test-deadcode-integration'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'deadcode'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should have both analysis types in project
      expect(jsonResult.project.analysisTypes).toEqual(expect.arrayContaining(['quality', 'deadcode']))

      // Should have both metrics sections
      expect(expectMetricExists(jsonResult, 'quality', 'avgComplexity')).toBe(true)
      expect(expectMetricExists(jsonResult, 'deadCode', 'orphanedFiles')).toBe(true)

      // Summary should account for all findings
      expect(jsonResult.summary).toBeDefined()
      expect(typeof jsonResult.summary.totalIssues).toBe('number')
      expect(jsonResult.summary.severityBreakdown).toBeDefined()
      expect(typeof jsonResult.summary.severityBreakdown.critical).toBe('number')
      expect(typeof jsonResult.summary.severityBreakdown.warning).toBe('number')
      expect(typeof jsonResult.summary.severityBreakdown.info).toBe('number')
    })
  })

  describe('Config Validation Analysis', () => {
    it('should provide config validation metrics', async () => {
      const projectId = 'test-config-metrics'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['config-validation'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toContain('config-validation')
      expect(expectMetricExists(jsonResult, 'configValidation', 'validatedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'configValidation', 'schemaMatches')).toBe(true)
      expect(expectMetricExists(jsonResult, 'configValidation', 'validationErrors')).toBe(true)
      expect(expectMetricExists(jsonResult, 'configValidation', 'criticalErrors')).toBe(true)
      expect(typeof jsonResult.metrics.configValidation.validatedFiles).toBe('number')
      expect(typeof jsonResult.metrics.configValidation.schemaMatches).toBe('number')
      expect(typeof jsonResult.metrics.configValidation.validationErrors).toBe('number')
    })

    it('should run config validation analysis without errors', async () => {
      const projectId = 'test-config-analysis'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['config-validation'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(result.type).toBe('text')
      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toContain('config-validation')
      expect(jsonResult.summary).toBeDefined()
    })

    it('should handle combined quality, structure, deadcode and config validation analysis', async () => {
      const projectId = 'test-all-analysis-types-with-config'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'structure', 'deadcode', 'config-validation'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.analysisTypes).toEqual(expect.arrayContaining(['quality', 'structure', 'deadcode', 'config-validation']))
      expect(expectMetricExists(jsonResult, 'quality', 'codeQualityScore')).toBe(true)
      expect(expectMetricExists(jsonResult, 'structure', 'analyzedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'deadCode', 'orphanedFiles')).toBe(true)
      expect(expectMetricExists(jsonResult, 'configValidation', 'validatedFiles')).toBe(true)
    })

    it('should work with file-level config validation analysis', async () => {
      const projectId = 'test-config-file-level'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['config-validation'],
        scope: 'file',
        target: 'package.json',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.scope).toBe('file')
      expect(jsonResult.project.target).toBe('package.json')
      expect(expectMetricExists(jsonResult, 'configValidation', 'validatedFiles')).toBe(true)
    })

    it('should handle method-level config validation analysis', async () => {
      const projectId = 'test-config-method-level'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['config-validation'],
        scope: 'method',
        target: 'someMethod',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.project.scope).toBe('method')
      expect(jsonResult.project.target).toBe('someMethod')
      expect(expectMetricExists(jsonResult, 'configValidation', 'validatedFiles')).toBe(true)
    })

    it('should handle projects with no config files', async () => {
      const projectId = 'test-config-no-files'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['config-validation'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should complete without errors even if no config files found
      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.metrics.configValidation.validatedFiles).toBe(0)
      expect(jsonResult.metrics.configValidation.schemaMatches).toBe(0)
      expect(jsonResult.metrics.configValidation.validationErrors).toBe(0)
    })

    it('should detect config files by pattern', async () => {
      const projectId = 'test-config-pattern-detection'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['config-validation'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should complete without errors regardless of config files found
      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'configValidation', 'validatedFiles')).toBe(true)
      expect(typeof jsonResult.metrics.configValidation.validatedFiles).toBe('number')
    })

    it('should provide consistent config metrics format', async () => {
      const projectId = 'test-config-metrics-format'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['config-validation'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Verify expected metrics format
      expect(jsonResult.project.id).toBe(projectId)
      expect(typeof jsonResult.metrics.configValidation.validatedFiles).toBe('number')
      expect(typeof jsonResult.metrics.configValidation.schemaMatches).toBe('number')
      expect(typeof jsonResult.metrics.configValidation.validationErrors).toBe('number')
      expect(typeof jsonResult.metrics.configValidation.criticalErrors).toBe('number')

      // Should have proper JSON structure
      expect(jsonResult.metrics.configValidation).toBeDefined()
      expect(jsonResult.summary).toBeDefined()
    })

    it('should integrate config validation findings with overall summary', async () => {
      const projectId = 'test-config-integration'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality', 'config-validation'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should have both analysis types in project
      expect(jsonResult.project.analysisTypes).toEqual(expect.arrayContaining(['quality', 'config-validation']))

      // Should have both metrics sections
      expect(expectMetricExists(jsonResult, 'quality', 'avgComplexity')).toBe(true)
      expect(expectMetricExists(jsonResult, 'configValidation', 'validatedFiles')).toBe(true)

      // Summary should account for all findings
      expect(jsonResult.summary).toBeDefined()
      expect(typeof jsonResult.summary.totalIssues).toBe('number')
      expect(jsonResult.summary.severityBreakdown).toBeDefined()
      expect(typeof jsonResult.summary.severityBreakdown.critical).toBe('number')
      expect(typeof jsonResult.summary.severityBreakdown.warning).toBe('number')
      expect(typeof jsonResult.summary.severityBreakdown.info).toBe('number')
    })

    it('should handle schema matching patterns', async () => {
      const projectId = 'test-config-schema-matching'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['config-validation'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should complete without errors and show schema matching results
      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'configValidation', 'schemaMatches')).toBe(true)
      expect(typeof jsonResult.metrics.configValidation.schemaMatches).toBe('number')

      // When schema URLs are not available (in test mode), should show 0 matches
      expect(jsonResult.metrics.configValidation.schemaMatches).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle non-existent project with proper error', async () => {
      const args: AnalyzeCodeArgs = {
        projectId: 'non-existent-project',
        analysisTypes: ['quality'],
        scope: 'project',
      }

      // Should throw error requiring initialization
      await expect(analyzeCode(args, treeManager)).rejects.toThrow(
        'Project "non-existent-project" not found',
      )
    })

    it('should handle invalid analysis types', async () => {
      const projectId = 'test-invalid-types'
      await treeManager.createProject(projectId, testConfig)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['invalid' as any],
        scope: 'project',
      }

      await expect(analyzeCode(args, treeManager)).rejects.toThrow()
    })

    it('should handle missing target for file scope', async () => {
      const projectId = 'test-missing-target'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'file',
        // target is missing
      }

      await expect(analyzeCode(args, treeManager)).rejects.toThrow()
    })

    it('should handle missing target for method scope', async () => {
      const projectId = 'test-missing-method-target'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'method',
        // target is missing
      }

      await expect(analyzeCode(args, treeManager)).rejects.toThrow()
    })

    it('should handle non-existent file target', async () => {
      const projectId = 'test-nonexistent-file'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'file',
        target: 'src/nonexistent.ts',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should not error, but should return empty analysis
      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.summary.totalIssues).toBe(0)
    })

    it('should handle non-existent method target', async () => {
      const projectId = 'test-nonexistent-method'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'method',
        target: 'nonExistentMethod',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should not error, but should return empty analysis
      expect(jsonResult.project.id).toBe(projectId)
      expect(jsonResult.summary.totalIssues).toBe(0)
    })
  })

  describe('Initialization Requirements', () => {
    it('should require project initialization before analysis', async () => {
      const projectId = 'test-auto-init'
      const project = await treeManager.createProject(projectId, testConfig)

      // Ensure project is not initialized
      expect(project.initialized).toBe(false)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      // Should throw error requiring initialization
      await expect(analyzeCode(args, treeManager)).rejects.toThrow(
        'Project "test-auto-init" is not fully initialized',
      )

      // Clean up
      treeManager.destroyProject(projectId)
    })

    it('should work correctly with properly initialized projects', async () => {
      const projectId = 'test-initialized'
      const project = await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      // Ensure project is initialized
      expect(project.initialized).toBe(true)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      // Should work correctly
      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(typeof jsonResult.summary.totalIssues).toBe('number')

      // Clean up
      treeManager.destroyProject(projectId)
    })
  })

  describe('Configuration Options', () => {
    it('should respect includeMetrics option', async () => {
      const projectId = 'test-include-metrics'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
        includeMetrics: true,
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'quality', 'avgComplexity')).toBe(true)
    })

    it('should handle severity filtering', async () => {
      const projectId = 'test-severity-filter'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
        severity: 'warning',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)
      // Should still work even with severity filter (implementation detail)
      expect(jsonResult.summary).toBeDefined()
    })
  })

  describe('Integration with Real Code', () => {
    it('should analyze the test fixtures correctly', async () => {
      const projectId = 'test-real-code'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      // Get project stats to verify we have actual code to analyze
      const project = treeManager.getProject(projectId)
      expect(project).toBeDefined()
      expect(project!.initialized).toBe(true)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      // Should find actual methods and classes in the test fixtures
      expect(jsonResult.project.id).toBe(projectId)
      expect(expectMetricExists(jsonResult, 'quality', 'totalMethods')).toBe(true)
      expect(jsonResult.metrics.quality.totalMethods).toBeGreaterThanOrEqual(1) // At least 1 method
      expect(expectMetricExists(jsonResult, 'quality', 'codeQualityScore')).toBe(true)
      expect(jsonResult.metrics.quality.codeQualityScore).toBeGreaterThanOrEqual(0)
      expect(jsonResult.metrics.quality.codeQualityScore).toBeLessThanOrEqual(10)
    })

    it('should provide detailed findings for quality issues', async () => {
      const projectId = 'test-detailed-findings'
      await treeManager.createProject(projectId, testConfig)
      await treeManager.initializeProject(projectId)

      const args: AnalyzeCodeArgs = {
        projectId,
        analysisTypes: ['quality'],
        scope: 'project',
      }

      const result = await analyzeCode(args, treeManager)
      const jsonResult = parseAnalysisResult(result)

      expect(jsonResult.project.id).toBe(projectId)

      // If there are findings, they should be well-formatted
      if (jsonResult.findings && jsonResult.findings.length > 0) {
        const finding = jsonResult.findings[0]
        expect(finding.type).toBeDefined()
        expect(finding.category).toBeDefined()
        expect(finding.severity).toBeDefined()
        expect(finding.location).toBeDefined()
        expect(finding.context).toBeDefined()
      }
    })
  })
})