/**
 * Unified analysis interface - single entry point for all analysis types
 */

import { analyzeQuality } from './quality.js'
import { analyzeDeadcode } from './deadcode.js'
import { analyzeStructure } from './structure.js'
import { analyzeSyntaxErrors } from './syntax.js'
import { createProject, parseProject } from '../project/manager.js'
import { handleError } from '../utils/errors.js'
import { getLogger } from '../utils/logger.js'
import {
  ANALYSIS_TEMPLATES,
  populateTemplateWithSections,
  buildQualitySection,
  buildDeadcodeSection,
  buildStructureSection,
  // buildSyntaxSection, // TODO: Integrate with markdown reports
  buildCriticalIssuesSection,
  buildWarningsSection,
} from '../constants/templates.js'
import type { AnalysisOptions, AnalysisResult } from '../types/analysis.js'
import type { ProjectConfig, Project } from '../types/core.js'

/**
 * Analyzes a project using the specified analysis options
 */
export async function analyzeProject(
  projectPath: string,
  options: AnalysisOptions,
): Promise<AnalysisResult>

/**
 * Analyzes a project instance using the specified analysis options
 */
export async function analyzeProject(
  project: Project,
  options: AnalysisOptions,
): Promise<AnalysisResult>

/**
 * Implementation
 */
export async function analyzeProject(
  projectOrPath: string | Project,
  options: AnalysisOptions,
): Promise<AnalysisResult> {
  const logger = getLogger()

  try {
    let project: Project

    if (typeof projectOrPath === 'string') {
      // Path provided - create and parse new project
      const projectPath = projectOrPath
      logger.info(`Starting analysis of ${projectPath}`)

      const config: ProjectConfig = {
        directory: projectPath,
        languages: [],
        autoWatch: false,
      }

      project = createProject(config)
      await parseProject(project)
    }
    else {
      // Project instance provided - use directly (already parsed)
      project = projectOrPath
      logger.info(`Starting analysis of ${project.config.directory}`)
    }

    const nodes = Array.from(project.files.values())
    const elementNodes = Array.from(project.nodes.values()).flat()

    if (project.subProjects) {
      for (const subProject of project.subProjects) {
        nodes.push(...Array.from(subProject.files.values()))
        elementNodes.push(...Array.from(subProject.nodes.values()).flat())
      }
    }

    const allNodes = [...nodes, ...elementNodes]

    logger.info(`Analyzing ${allNodes.length} nodes from ${project.files.size} files`)

    const result: AnalysisResult = {
      findings: [],
      metrics: {},
      summary: { totalFindings: 0, criticalFindings: 0, warningFindings: 0, infoFindings: 0 },
    }

    if (options.includeQuality !== false) {
      const qualityResult = analyzeQuality(allNodes)
      result.metrics.quality = qualityResult.metrics
      result.findings.push(...qualityResult.findings)
    }

    if (options.includeDeadcode) {
      const deadcodeResult = analyzeDeadcode(project)
      result.metrics.deadcode = deadcodeResult.metrics
      result.findings.push(...deadcodeResult.findings)
    }

    if (options.includeStructure) {
      const structureResult = analyzeStructure(allNodes)
      result.metrics.structure = structureResult.metrics
      result.findings.push(...structureResult.findings)
    }

    if (options.includeSyntax) {
      const syntaxResult = analyzeSyntaxErrors(project)
      result.metrics.syntax = syntaxResult.metrics
      result.findings.push(...syntaxResult.findings)
    }

    result.summary = calculateSummary(result.findings)

    logger.info(`Analysis complete: ${result.findings.length} findings`)
    return result
  }
  catch (error) {
    throw handleError(error, `Failed to analyze project ${typeof projectOrPath === 'string' ? projectOrPath : projectOrPath.config.directory}`)
  }
}

/**
 * Calculates summary statistics from analysis findings
 */
export function calculateSummary(findings: AnalysisResult['findings']): AnalysisResult['summary'] {
  return {
    totalFindings: findings.length,
    criticalFindings: findings.filter(f => f.severity === 'critical').length,
    warningFindings: findings.filter(f => f.severity === 'warning').length,
    infoFindings: findings.filter(f => f.severity === 'info').length,
  }
}

/**
 * Formats analysis results as a markdown report using templates
 */
export function formatAnalysisReport(result: AnalysisResult): string {
  const { findings, metrics, summary } = result

  const data = {
    totalFindings: summary.totalFindings,
    criticalFindings: summary.criticalFindings,
    warningFindings: summary.warningFindings,
    infoFindings: summary.infoFindings,
  }

  const sections = {
    qualitySection: buildQualitySection(metrics.quality),
    deadcodeSection: buildDeadcodeSection(metrics.deadcode),
    structureSection: buildStructureSection(metrics.structure),
    criticalIssuesSection: buildCriticalIssuesSection(findings, summary.criticalFindings),
    warningsSection: buildWarningsSection(findings, summary.warningFindings),
  }

  return populateTemplateWithSections(ANALYSIS_TEMPLATES.MARKDOWN, data, sections)
}