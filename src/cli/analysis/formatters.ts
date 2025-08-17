/**
 * Analysis result formatting and display utilities
 */

import chalk from 'chalk'
import type { Logger } from '../../types/index.js'

export interface AnalysisResult {
  findings: AnalysisFinding[]
  metrics: Record<string, unknown>
  summary: {
    totalFindings: number
    criticalFindings: number
    warningFindings: number
    infoFindings: number
  }
}

export interface AnalysisFinding {
  severity: 'critical' | 'warning' | 'info'
  category: string
  description: string
  location: string
  context?: string
}

/**
 * Format and display analysis results
 */
export function displayAnalysisResults(
  analysisType: string,
  result: AnalysisResult,
  logger: Logger,
): void {
  logger.output(chalk.cyan(`\n📊 ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis Results:`))

  if (result.findings.length === 0) {
    logger.output(chalk.green('✅ No issues found!'))
  }
  else {
    displayFindings(result, logger)
  }

  // Display metrics if available
  if (result.metrics.quality) {
    logger.output(chalk.cyan('\n📈 Metrics:'))
    logger.output(`  quality: ${JSON.stringify(result.metrics.quality)}`)
  }
}

/**
 * Display analysis findings grouped by severity
 */
function displayFindings(result: AnalysisResult, logger: Logger): void {
  if (result.findings.length === 0) return

  // Group findings by severity
  const groupedFindings = result.findings.reduce((acc, finding) => {
    const key = finding.severity || 'info'
    if (!acc[key]) acc[key] = []
    acc[key].push(finding)
    return acc
  }, {} as Record<string, AnalysisFinding[]>)

  // Display each severity group
  for (const [severity, findings] of Object.entries(groupedFindings)) {
    displaySeverityGroup(severity, findings, logger)
  }
}

/**
 * Display findings for a specific severity level
 */
function displaySeverityGroup(
  severity: string,
  findings: AnalysisFinding[],
  logger: Logger,
): void {
  const icon = getSeverityIcon(severity)
  const color = getSeverityColor(severity)

  logger.output(color(`\n${icon} ${severity.toUpperCase()} (${findings.length}):`))

  // Show all findings for critical, limited for others
  const displayCount = severity === 'critical' ? findings.length : Math.min(findings.length, 10)

  for (let i = 0; i < displayCount; i++) {
    const finding = findings[i]
    if (finding) {
      logger.output(`  ${color('•')} ${finding.description}`)
      logger.output(`    ${chalk.dim(finding.location)}`)
      if (finding.context) {
        logger.output(`    ${chalk.dim(finding.context)}`)
      }
    }
  }

  // Show truncation message if needed
  if (findings.length > displayCount) {
    logger.output(chalk.dim(`    ... and ${findings.length - displayCount} more`))
  }
}

/**
 * Get icon for severity level
 */
function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴'
    case 'warning': return '🟡'
    case 'info': return '🔵'
    default: return '⚪'
  }
}

/**
 * Get color function for severity level
 */
function getSeverityColor(severity: string): typeof chalk.red {
  switch (severity) {
    case 'critical': return chalk.red
    case 'warning': return chalk.yellow
    case 'info': return chalk.blue
    default: return chalk.gray
  }
}