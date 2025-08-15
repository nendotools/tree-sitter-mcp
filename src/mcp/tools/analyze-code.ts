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
  ProjectTree,
  AnalysisResult,
  AnalysisType,
  TreeNode,
  Config,
} from '../../types/index.js'
import { ErrorFactory } from '../../types/error-types.js'
import { TreeManager } from '../../core/tree-manager.js'
import { getLogger } from '../../utils/logger.js'
import { AnalyzerCoordinator } from './analyzers/index.js'
import { DIRECTORIES, DEFAULT_IGNORE_DIRS } from '../../constants/service-constants.js'
import { findProjectRoot } from '../../utils/project-detection.js'

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
  const logger = getLogger()

  try {
    validateAnalysisArgs(args)

    const project = await getOrCreateInitializedProject(args.projectId, args.directory, treeManager)

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
  }
  catch (error) {
    logger.error('Code analysis failed:', error)
    throw error
  }
}

/**
 * Validates analysis arguments for required fields and valid values
 *
 * @param args - Arguments to validate
 * @throws {McpOperationError} When validation fails
 */
function validateAnalysisArgs(args: AnalyzeCodeArgs): void {
  if (!args.projectId || args.projectId.trim().length === 0) {
    throw ErrorFactory.validationError('projectId', args.projectId)
  }

  if (!args.analysisTypes || args.analysisTypes.length === 0) {
    throw ErrorFactory.validationError('analysisTypes', args.analysisTypes)
  }

  const validTypes: AnalysisType[] = ['quality', 'structure', 'deadcode', 'config-validation']
  const invalidTypes = args.analysisTypes.filter(type => !validTypes.includes(type))
  if (invalidTypes.length > 0) {
    throw ErrorFactory.validationError('analysisTypes', `Invalid types: ${invalidTypes.join(', ')}`)
  }
}

/**
 * Retrieves and ensures project is initialized for analysis, auto-initializing if necessary
 *
 * @param projectId - Project identifier
 * @param treeManager - Tree manager instance
 * @returns Promise resolving to project tree data
 * @throws {McpOperationError} When project creation or initialization fails
 */
async function getOrCreateInitializedProject(projectId: string, directory: string | undefined, treeManager: TreeManager): Promise<ProjectTree> {
  const logger = getLogger()
  let project = treeManager.getProject(projectId)

  if (!project) {
    logger.info(`Auto-initializing project ${projectId} for analysis`)

    const config: Config = {
      workingDir: directory || findProjectRoot(),
      languages: [],
      maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
      ignoreDirs: DEFAULT_IGNORE_DIRS,
    }

    project = await treeManager.createProject(projectId, config)
    await treeManager.initializeProject(projectId)
  }
  else if (!project.initialized) {
    logger.info(`Initializing existing project ${projectId} for analysis`)
    await treeManager.initializeProject(projectId)
  }

  return project
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