/**
 * Code Analysis MCP tool - Provides quality, structure, and dead code analysis
 *
 * This module implements comprehensive code analysis capabilities that complement
 * traditional linting tools by focusing on cross-file analysis and architectural insights.
 * Designed specifically for AI agent consumption with structured output formats.
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type {
  AnalyzeCodeArgs,
  AnalysisResult,
  AnalysisType,
  TreeNode,
} from '../../types/index.js'
import { withErrorHandling, EnhancedErrorFactory } from '../../core/error-handling/index.js'
import { TreeManager } from '../../core/tree-manager.js'
import { AnalyzerCoordinator } from './analyzers/index.js'

/**
 * Performs comprehensive code analysis across project elements
 *
 * Provides four types of analysis:
 * - Quality analysis: complexity, method length, parameter count, recursion detection
 * - Structure analysis: circular dependencies, coupling analysis, HTML nesting depth
 * - Dead code analysis: unused exports, orphaned files, unused dependencies
 * - Config validation: validates configuration files against schemas
 *
 * Supports multi-scope analysis at project, file, or method level with configurable
 * severity filtering and detailed metrics reporting.
 *
 * @param args - Analysis configuration including types, scope, target, and options
 * @param treeManager - Tree manager instance for accessing parsed project data
 * @returns Promise resolving to formatted analysis results with findings and metrics
 * @throws {McpOperationError} When project not found, invalid parameters, or analysis fails
 *
 * @example
 * ```typescript
 * const result = await analyzeCode({
 *   projectId: 'my-project',
 *   analysisTypes: ['quality'],
 *   scope: 'project'
 * }, treeManager);
 * ```
 */
export async function analyzeCode(
  args: AnalyzeCodeArgs,
  treeManager: TreeManager,
): Promise<TextContent> {
  return withErrorHandling(async () => {
    validateAnalysisArgs(args)

    const project = treeManager.getProject(args.projectId)

    if (!project) {
      throw EnhancedErrorFactory.project.notFound(
        args.projectId,
        ['You must initialize the project first using the initialize_project tool.',
          'Example:',
          `{"projectId": "${args.projectId}", "directory": "${args.directory || '.'}"}`,
          'This ensures proper project root detection and avoids initialization failures.'],
      )
    }

    if (!project.initialized) {
      throw EnhancedErrorFactory.project.notInitialized(
        args.projectId,
        'Project exists but is not initialized. This should not happen - please destroy and recreate the project.',
      )
    }

    const allNodes: TreeNode[] = []
    // Get all parsed nodes from the node index
    for (const nodes of project.nodeIndex.values()) {
      allNodes.push(...nodes)
    }
    // Also get all file nodes from the file index (needed for structure/deadcode analysis)
    for (const fileNode of project.fileIndex.values()) {
      allNodes.push(fileNode)
    }

    const coordinator = new AnalyzerCoordinator()
    const result = await coordinator.analyze(args, allNodes)

    const jsonOutput = formatAnalysisResultsAsJson(result)

    return {
      type: 'text',
      text: JSON.stringify(jsonOutput, null, 2),
    }
  }, {
    operation: 'analyze-code',
    tool: 'analyze-code',
  })
}

/**
 * Validates analysis arguments for required fields and valid values
 *
 * @param args - Arguments to validate
 * @throws {McpOperationError} When validation fails
 */
function validateAnalysisArgs(args: AnalyzeCodeArgs): void {
  if (!args.projectId || args.projectId.trim().length === 0) {
    throw EnhancedErrorFactory.validation.parameterInvalid('projectId', args.projectId, 'string')
  }

  if (!args.analysisTypes || args.analysisTypes.length === 0) {
    throw EnhancedErrorFactory.validation.parameterMissing('analysisTypes', 'code analysis')
  }

  const validTypes: AnalysisType[] = ['quality', 'structure', 'deadcode', 'config-validation']
  const invalidTypes = args.analysisTypes.filter(type => !validTypes.includes(type))
  if (invalidTypes.length > 0) {
    throw EnhancedErrorFactory.validation.parameterInvalid('analysisTypes', invalidTypes, validTypes.join(', '))
  }
}

/**
 * Formats analysis results as structured JSON
 *
 * @param result - Analysis result object
 * @returns Structured JSON object
 */
function formatAnalysisResultsAsJson(result: AnalysisResult): any {
  return {
    project: {
      id: result.projectId,
      analysisTypes: result.analysisTypes,
      scope: result.scope,
      target: result.target || null,
    },
    summary: {
      totalIssues: result.summary.totalIssues,
      severityBreakdown: {
        critical: result.summary.severityBreakdown.critical,
        warning: result.summary.severityBreakdown.warning,
        info: result.summary.severityBreakdown.info,
      },
    },
    metrics: {
      quality: result.metrics.quality
        ? {
            avgComplexity: result.metrics.quality.avgComplexity,
            avgMethodLength: result.metrics.quality.avgMethodLength,
            avgParameters: result.metrics.quality.avgParameters,
            totalMethods: result.metrics.quality.totalMethods,
            codeQualityScore: result.metrics.quality.codeQualityScore,
          }
        : null,
      structure: result.metrics.structure
        ? {
            analyzedFiles: result.metrics.structure.analyzedFiles,
            circularDependencies: result.metrics.structure.circularDependencies,
            highCouplingFiles: result.metrics.structure.highCouplingFiles,
            htmlFiles: result.metrics.structure.htmlFiles,
            deeplyNestedElements: result.metrics.structure.deeplyNestedElements,
            maxNestingDepth: result.metrics.structure.maxNestingDepth,
          }
        : null,
      deadCode: result.metrics.deadCode
        ? {
            orphanedFiles: result.metrics.deadCode.orphanedFiles,
            unusedExports: result.metrics.deadCode.unusedExports,
            unusedDependencies: result.metrics.deadCode.unusedDependencies,
          }
        : null,
      configValidation: result.metrics.configValidation
        ? {
            validatedFiles: result.metrics.configValidation.validatedFiles,
            schemaMatches: result.metrics.configValidation.schemaMatches,
            validationErrors: result.metrics.configValidation.validationErrors,
            criticalErrors: result.metrics.configValidation.criticalErrors,
          }
        : null,
    },
    findings: result.findings.map(finding => ({
      type: finding.type,
      category: finding.category,
      severity: finding.severity,
      description: finding.description,
      location: finding.location,
      context: finding.context,
      metrics: finding.metrics || null,
    })),
  }
}