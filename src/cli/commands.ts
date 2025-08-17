/**
 * Command handlers - extracted from main CLI for better organization
 */

import chalk from 'chalk'
import { analyzeProject, formatAnalysisReport } from '../analysis/index.js'
import { createProject, parseProject } from '../project/manager.js'
import { searchCode, findUsage } from '../core/search.js'
import { renderAnalysis, type AnalysisData } from '../constants/templates.js'
import { getLogger, type Logger } from '../utils/logger.js'
import type { AnalysisOptions, AnalysisResult, Finding } from '../types/analysis.js'

export async function executeSearch(query: string, options: {
  directory: string
  type?: string[]
  languages?: string[]
  maxResults: string
  exact?: boolean
}): Promise<void> {
  const logger = getLogger()

  const project = createProject({
    directory: options.directory,
    languages: options.languages || [],
  })

  await parseProject(project)

  const allNodes = Array.from(project.files.values())
  const elementNodes = Array.from(project.nodes.values()).flat()
  const searchNodes = [...allNodes, ...elementNodes]

  const results = searchCode(query, searchNodes, {
    maxResults: parseInt(options.maxResults),
    exactMatch: options.exact,
    types: options.type,
  })

  if (results.length === 0) {
    logger.output(chalk.yellow('No results found'))
    return
  }

  logger.output(chalk.cyan(`Found ${results.length} results:\n`))

  for (const result of results) {
    const { node, score } = result
    logger.output(`${chalk.green('●')} ${chalk.bold(node.name || 'unnamed')} ${chalk.dim(`(${node.type})`)}`)

    // Show position information (start and end)
    const position = node.startLine !== undefined && node.endLine !== undefined
      ? node.startColumn !== undefined && node.endColumn !== undefined
        ? `:${node.startLine}:${node.startColumn}-${node.endLine}:${node.endColumn}`
        : `:${node.startLine}-${node.endLine}`
      : node.startLine !== undefined
        ? node.startColumn !== undefined
          ? `:${node.startLine}:${node.startColumn}`
          : `:${node.startLine}`
        : ''

    logger.output(`  ${chalk.dim(node.path)}${position}`)
    logger.output(`  ${chalk.dim('Score:')} ${score}`)
    logger.output('')
  }
}

export async function executeAnalysis(directory: string, options: {
  quality: boolean
  deadcode?: boolean
  structure?: boolean
  severity: string
  output: string
}): Promise<void> {
  const logger = getLogger()

  const analysisOptions: AnalysisOptions = {
    includeQuality: options.quality,
    includeDeadcode: options.deadcode,
    includeStructure: options.structure,
  }

  const result = await analyzeProject(directory, analysisOptions)

  if (options.output === 'json') {
    // Use template for consistent JSON format
    const { metrics, summary } = result
    const analysisData: AnalysisData = {
      totalFindings: summary.totalFindings,
      critical: summary.criticalFindings,
      warnings: summary.warningFindings,
      info: summary.infoFindings,
      qualityScore: metrics.quality?.codeQualityScore || 0,
      avgComplexity: metrics.quality?.avgComplexity || 0,
      avgMethodLength: metrics.quality?.avgMethodLength || 0,
      totalMethods: metrics.quality?.totalMethods || 0,
      analyzedFiles: metrics.structure?.analyzedFiles || 0,
      unusedFiles: metrics.deadcode?.unusedFiles,
      unusedFunctions: metrics.deadcode?.unusedFunctions,
      circularDependencies: metrics.structure?.circularDependencies,
    }

    logger.output(JSON.stringify(renderAnalysis(analysisData, 'json'), null, 2))
  }
  else if (options.output === 'markdown') {
    logger.output(formatAnalysisReport(result))
  }
  else {
    displayTextResults(result, logger)
  }
}

export async function executeFindUsage(identifier: string, options: {
  directory: string
  languages?: string[]
  caseSensitive?: boolean
  exact?: boolean
}): Promise<void> {
  const logger = getLogger()

  const project = createProject({
    directory: options.directory,
    languages: options.languages || [],
  })

  await parseProject(project)

  const allNodes = Array.from(project.files.values())
  const elementNodes = Array.from(project.nodes.values()).flat()
  const searchNodes = [...allNodes, ...elementNodes]

  const results = findUsage(identifier, searchNodes, {
    caseSensitive: options.caseSensitive,
    exactMatch: options.exact,
  })

  if (results.length === 0) {
    logger.output(chalk.yellow(`No usage found for: ${identifier}`))
    return
  }

  logger.output(chalk.cyan(`Found ${results.length} usages:\n`))

  for (const result of results) {
    const position = `${result.startLine}:${result.startColumn}-${result.endLine}:${result.endColumn}`
    logger.output(`${chalk.green('●')} ${chalk.bold(result.node.path)}:${position}`)

    // Show context with syntax highlighting for the matching line
    if (result.context) {
      const contextLines = result.context.split('\n')
      const maxLines = 8 // Limit context display
      const displayLines = contextLines.slice(0, maxLines)

      for (const line of displayLines) {
        if (line.startsWith('→ ')) {
          // This is the matching line - highlight it
          logger.output(`  ${chalk.yellow(line)}`)
        }
        else {
          logger.output(`  ${chalk.dim(line)}`)
        }
      }

      if (contextLines.length > maxLines) {
        logger.output(`  ${chalk.dim('... and ' + (contextLines.length - maxLines) + ' more lines')}`)
      }
    }
    logger.output('')
  }
}

function displayTextResults(result: AnalysisResult, logger: Logger): void {
  const { findings, metrics, summary } = result

  // Prepare findings data for template
  const critical = findings.filter((f: Finding) => f.severity === 'critical')
  const warnings = findings.filter((f: Finding) => f.severity === 'warning')

  const criticalIssues = critical.length > 0
    ? critical.slice(0, 5).map((f: Finding) =>
      `● ${f.description}\n  ${f.location}${f.context ? `\n  → ${f.context}` : ''}`,
    ).join('\n\n') + (critical.length > 5 ? `\n\n... and ${critical.length - 5} more critical issues` : '')
    : undefined

  const warningIssues = warnings.length > 0
    ? warnings.slice(0, 3).map((f: Finding) =>
      `● ${f.description}\n  ${f.location}`,
    ).join('\n\n') + (warnings.length > 3 ? `\n\n... and ${warnings.length - 3} more warnings` : '')
    : undefined

  const statusMessage = summary.criticalFindings === 0 && summary.warningFindings <= 5
    ? '✅ Code quality looks good overall'
    : summary.criticalFindings > 0
      ? '🔧 Focus on resolving critical issues first'
      : undefined

  // Collect all data for template rendering
  const analysisData: AnalysisData = {
    totalFindings: summary.totalFindings,
    critical: summary.criticalFindings,
    warnings: summary.warningFindings,
    info: summary.infoFindings,
    qualityScore: metrics.quality?.codeQualityScore || 0,
    avgComplexity: metrics.quality?.avgComplexity || 0,
    avgMethodLength: metrics.quality?.avgMethodLength || 0,
    totalMethods: metrics.quality?.totalMethods || 0,
    analyzedFiles: metrics.structure?.analyzedFiles || 0,
    unusedFiles: metrics.deadcode?.unusedFiles || 0,
    unusedFunctions: metrics.deadcode?.unusedFunctions || 0,
    circularDependencies: metrics.structure?.circularDependencies || 0,
    criticalIssues,
    warningIssues,
    statusMessage,
  }

  // Single template output!
  logger.output('\n' + renderAnalysis(analysisData, 'console'))
}
