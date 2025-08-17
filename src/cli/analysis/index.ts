/**
 * CLI Analysis orchestration
 * Refactored from handleAnalyzeCode to use existing utilities and modular design
 */

import chalk from 'chalk'
import { getLogger } from '../../utils/logger.js'
import { TreeManager } from '../../core/tree-manager.js'
import { getParserRegistry } from '../../parsers/registry.js'
import { DeadCodeCoordinator } from '../../mcp/tools/analyzers/deadcode/deadcode-coordinator.js'
import { QualityAnalyzer } from '../../mcp/tools/analyzers/quality-analyzer.js'
import { resolveAnalysisTarget, createAnalysisConfig, type AnalysisOptions } from './config.js'
import { displayAnalysisResults, type AnalysisResult } from './formatters.js'

/**
 * Main analysis orchestration function
 * Replaces the original 212-line handleAnalyzeCode with modular approach
 */
export async function runAnalysis(
  target: string,
  analysisType: string,
  options: AnalysisOptions,
): Promise<void> {
  const logger = getLogger()
  const projectId = `cli-analysis-${Date.now()}`

  try {
    // 1. Resolve target and find project root (reuses existing utilities)
    const analysisTarget = resolveAnalysisTarget(target)

    // Log what we're analyzing
    if (analysisTarget.isFile) {
      logger.output(chalk.cyan(
        `🔍 Running ${analysisType} analysis on file ${target} (project: ${analysisTarget.projectRoot})...`,
      ))
    }
    else {
      logger.output(chalk.cyan(`🔍 Running ${analysisType} analysis on ${target}...`))
    }

    // 2. Create analysis configuration (extends existing config utilities)
    const config = createAnalysisConfig(analysisTarget.projectRoot, options)

    // 3. Set up and initialize project (reuses existing TreeManager patterns)
    const { project, treeManager } = await setupAnalysisProject(projectId, config)

    logger.output(chalk.dim(`📁 Analyzed ${project.fileIndex.size} files`))

    // 4. Run analysis
    const result = await performAnalysis(analysisType, project, treeManager)

    // 5. Display results (modular formatting)
    displayAnalysisResults(analysisType, result, logger)
  }
  catch (error) {
    logger.output(chalk.red(`❌ Analysis failed: ${error instanceof Error ? error.message : String(error)}`))
    throw error
  }
}

/**
 * Set up TreeManager and initialize project
 * Reuses existing TreeManager patterns from other CLI commands
 */
async function setupAnalysisProject(projectId: string, config: any) {
  const treeManager = new TreeManager(getParserRegistry())

  await treeManager.createProject(projectId, config)
  await treeManager.initializeProject(projectId)

  const project = treeManager.getProject(projectId)
  if (!project) {
    throw new Error('Failed to initialize project')
  }

  return { project, treeManager }
}

/**
 * Perform the actual analysis
 * Handles analyzer selection and node preparation
 */
async function performAnalysis(
  analysisType: string,
  project: any,
  treeManager: TreeManager,
): Promise<AnalysisResult> {
  // Get appropriate analyzer
  let analyzer: any
  switch (analysisType) {
    case 'deadcode':
      analyzer = new DeadCodeCoordinator()
      break
    case 'quality':
      analyzer = new QualityAnalyzer()
      break
    default:
      throw new Error(`Unsupported analysis type: ${analysisType}`)
  }

  // Prepare analysis result structure
  const result: AnalysisResult = {
    findings: [],
    metrics: {},
    summary: { totalFindings: 0, criticalFindings: 0, warningFindings: 0, infoFindings: 0 },
  }

  // Get all nodes (files + their contained elements like functions/methods)
  // This was the key fix for the analyzer bug
  const fileNodes = Array.from(project.fileIndex.values())
  const elementNodes = Array.from(project.nodeIndex.values()).flat()
  const allNodes = [...fileNodes, ...elementNodes]

  // Run analysis
  await analyzer.analyze(allNodes, result)

  // Clean up
  treeManager.destroyProject(project.projectId)

  return result
}