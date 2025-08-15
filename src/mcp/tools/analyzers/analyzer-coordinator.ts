/**
 * Analyzer Coordinator - Manages and coordinates different code analyzers
 */

import { QualityAnalyzer } from './quality-analyzer.js'
import { StructureAnalyzer } from './structure-analyzer.js'
import { DeadCodeAnalyzer } from './deadcode-analyzer.js'
import { ConfigAnalyzer } from './config-analyzer.js'
import type {
  AnalyzeCodeArgs,
  TreeNode,
  AnalysisResult,
  AnalysisType,
  IssueSeverity,
} from '../../../types/index.js'

/**
 * Coordinates multiple analyzers to perform comprehensive code analysis
 */
export class AnalyzerCoordinator {
  private readonly qualityAnalyzer: QualityAnalyzer
  private readonly structureAnalyzer: StructureAnalyzer
  private readonly deadCodeAnalyzer: DeadCodeAnalyzer
  private readonly configAnalyzer: ConfigAnalyzer

  constructor() {
    this.qualityAnalyzer = new QualityAnalyzer()
    this.structureAnalyzer = new StructureAnalyzer()
    this.deadCodeAnalyzer = new DeadCodeAnalyzer()
    this.configAnalyzer = new ConfigAnalyzer()
  }

  /**
   * Performs comprehensive code analysis using multiple analyzers
   */
  async analyze(args: AnalyzeCodeArgs, nodes: TreeNode[]): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      projectId: args.projectId,
      analysisTypes: args.analysisTypes,
      scope: args.scope,
      target: args.target,
      summary: {
        totalIssues: 0,
        severityBreakdown: {
          info: 0,
          warning: 0,
          critical: 0,
        },
      },
      findings: [],
      metrics: {},
    }

    const analysisNodes = this.getAnalysisScope(args, nodes)

    for (const analysisType of args.analysisTypes) {
      await this.runAnalysisType(analysisType, analysisNodes, result)
    }

    this.calculateSummaryStatistics(result, args.severity)

    return result
  }

  /**
   * Gets the appropriate nodes for analysis based on scope and target
   */
  private getAnalysisScope(args: AnalyzeCodeArgs, nodes: TreeNode[]): TreeNode[] {
    switch (args.scope) {
      case 'project':
        return nodes

      case 'file':
        if (!args.target) {
          throw new Error('Target file path required for file-level analysis')
        }
        return nodes.filter(node => node.path === args.target || (node.path && args.target && node.path.startsWith(args.target)))

      case 'method':
        if (!args.target) {
          throw new Error('Target method identifier required for method-level analysis')
        }
        return nodes.filter(node =>
          (node.type === 'function' || node.type === 'method')
          && (node.name === args.target || (node.path && args.target && node.path.includes(args.target))),
        )

      default:
        return nodes
    }
  }

  /**
   * Runs a specific analysis type
   */
  private async runAnalysisType(
    analysisType: AnalysisType,
    nodes: TreeNode[],
    result: AnalysisResult,
  ): Promise<void> {
    switch (analysisType) {
      case 'quality':
        await this.qualityAnalyzer.analyze(nodes, result)
        break

      case 'structure':
        await this.structureAnalyzer.analyze(nodes, result)
        break

      case 'deadcode':
        await this.deadCodeAnalyzer.analyze(nodes, result)
        break

      case 'config-validation':
        await this.configAnalyzer.analyze(nodes, result)
        break

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`)
    }
  }

  /**
   * Calculates summary statistics and applies severity filtering
   */
  private calculateSummaryStatistics(result: AnalysisResult, minSeverity?: IssueSeverity): void {
    if (minSeverity) {
      const severityOrder = { info: 0, warning: 1, critical: 2 }
      const minLevel = severityOrder[minSeverity]

      result.findings = result.findings.filter(finding =>
        severityOrder[finding.severity] >= minLevel,
      )
    }

    result.summary.totalIssues = result.findings.length
    result.summary.severityBreakdown = {
      info: result.findings.filter(f => f.severity === 'info').length,
      warning: result.findings.filter(f => f.severity === 'warning').length,
      critical: result.findings.filter(f => f.severity === 'critical').length,
    }
  }
}