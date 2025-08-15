/**
 * Quality Analyzer - Analyzes code quality metrics like complexity and method length
 */

import { BaseAnalyzer } from './base-analyzer.js'
import type { TreeNode, AnalysisResult } from '../../../types/index.js'

/**
 * Analyzes code quality metrics including complexity, method length, and parameter counts
 */
export class QualityAnalyzer extends BaseAnalyzer {
  async analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void> {
    const functionNodes = this.getFunctionNodes(nodes)

    if (functionNodes.length === 0) {
      result.metrics.quality = {
        avgComplexity: 0,
        avgMethodLength: 0,
        avgParameters: 0,
        totalMethods: 0,
        codeQualityScore: 7, // Neutral score for projects without functions (config files, etc.)
      }
      return
    }

    const complexities = functionNodes.map(node => this.calculateCyclomaticComplexity(node))
    const methodLengths = functionNodes.map(node => this.calculateMethodLength(node))
    const parameterCounts = functionNodes.map(node => this.getParameterCount(node))

    const avgComplexity = this.calculateAverage(complexities)
    const avgMethodLength = this.calculateAverage(methodLengths)
    const avgParameters = this.calculateAverage(parameterCounts)

    // First, analyze quality issues to get the count of problems
    this.analyzeQualityIssues(functionNodes, result)

    // Calculate base score from averages
    const baseScore = this.calculateQualityScore(avgComplexity, avgMethodLength, avgParameters)

    // Apply penalties for having many quality issues
    const finalScore = this.adjustScoreForIssues(baseScore, result, functionNodes.length)

    result.metrics.quality = {
      avgComplexity,
      avgMethodLength,
      avgParameters,
      totalMethods: functionNodes.length,
      codeQualityScore: finalScore,
    }
  }

  /**
   * Calculates cyclomatic complexity for a function/method node
   *
   * @param node - Function or method node
   * @returns Complexity score (1 = simple linear code)
   */
  private calculateCyclomaticComplexity(node: TreeNode): number {
    if (!node.content) return 1

    const complexityPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b&&\b/g,
      /\b\|\|\b/g,
      /\?\s*.*?\s*:/g,
    ]

    let complexity = 1

    for (const pattern of complexityPatterns) {
      const matches = node.content.match(pattern)
      if (matches) {
        complexity += matches.length
      }
    }

    return complexity
  }

  /**
   * Calculates method length in lines of code
   *
   * @param node - Function or method node
   * @returns Number of lines
   */
  private calculateMethodLength(node: TreeNode): number {
    if (node.startLine && node.endLine) {
      return node.endLine - node.startLine + 1
    }

    if (node.content) {
      return node.content.split('\n').length
    }

    return 1
  }

  /**
   * Gets parameter count for a function/method
   *
   * @param node - Function or method node
   * @returns Number of parameters
   */
  private getParameterCount(node: TreeNode): number {
    if (node.parameters) {
      return node.parameters.length
    }

    if (node.content) {
      const match = node.content.match(/\(([^)]*)\)/)
      if (match && match[1]?.trim()) {
        return match[1].split(',').filter(p => p.trim().length > 0).length
      }
    }

    return 0
  }

  /**
   * Calculates average from array of numbers
   *
   * @param values - Array of numeric values
   * @returns Average value rounded to 2 decimal places
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    const sum = values.reduce((acc, val) => acc + val, 0)
    return Math.round((sum / values.length) * 100) / 100
  }

  /**
   * Adjusts the base quality score based on the actual number of quality issues found
   *
   * @param baseScore - Score calculated from averages
   * @param result - Analysis result containing findings
   * @param totalMethods - Total number of methods analyzed
   * @returns Adjusted quality score accounting for issue density
   */
  private adjustScoreForIssues(baseScore: number, result: AnalysisResult, totalMethods: number): number {
    const qualityFindings = result.findings.filter(f => f.type === 'quality')
    const criticalIssues = qualityFindings.filter(f => f.severity === 'critical').length
    const warningIssues = qualityFindings.filter(f => f.severity === 'warning').length

    if (totalMethods === 0) return baseScore

    // Calculate issue density (issues per method)
    const criticalDensity = criticalIssues / totalMethods
    const warningDensity = warningIssues / totalMethods

    let adjustedScore = baseScore

    // Heavy penalties for critical issues
    if (criticalDensity > 0) {
      adjustedScore -= criticalDensity * 4 // -4 points per critical issue per method
    }

    // Moderate penalties for warning issues
    if (warningDensity > 0.1) { // More than 10% of methods have warnings
      adjustedScore -= (warningDensity - 0.1) * 2 // Progressive penalty
    }

    // Additional penalty if there are many absolute issues regardless of density
    if (criticalIssues > 0) {
      adjustedScore -= Math.min(2, criticalIssues * 0.3) // Up to -2 for many critical issues
    }

    if (warningIssues > 5) {
      adjustedScore -= Math.min(1.5, (warningIssues - 5) * 0.1) // Up to -1.5 for many warnings
    }

    return Math.max(0, Math.min(10, Math.round(adjustedScore * 100) / 100))
  }

  /**
   * Calculates overall code quality score (0-10 scale) with realistic modern standards
   *
   * @param avgComplexity - Average cyclomatic complexity
   * @param avgMethodLength - Average method length in lines
   * @param avgParameters - Average parameter count
   * @returns Quality score from 0 (worst) to 10 (best)
   */
  private calculateQualityScore(avgComplexity: number, avgMethodLength: number, avgParameters: number): number {
    // Modern, stricter thresholds for quality
    const excellentComplexity = 2 // Complexity 1-2 is excellent
    const goodComplexity = 4 // Complexity 3-4 is good
    const excellentLength = 10 // 10 lines or less is excellent
    const goodLength = 15 // 15 lines or less is good
    const excellentParams = 2 // 2 params or less is excellent
    const goodParams = 4 // 4 params or less is acceptable

    // Start with base score and apply more aggressive penalties
    let score = 10

    // Complexity penalties (more aggressive)
    if (avgComplexity > excellentComplexity) {
      if (avgComplexity <= goodComplexity) {
        score -= (avgComplexity - excellentComplexity) * 0.8 // -0.8 to -1.6
      }
      else {
        score -= 1.6 + (avgComplexity - goodComplexity) * 1.2 // Severe penalty beyond 4
      }
    }

    // Method length penalties (more realistic)
    if (avgMethodLength > excellentLength) {
      if (avgMethodLength <= goodLength) {
        score -= (avgMethodLength - excellentLength) * 0.3 // -0.3 to -1.5
      }
      else {
        score -= 1.5 + (avgMethodLength - goodLength) * 0.15 // Progressive penalty
      }
    }

    // Parameter count penalties
    if (avgParameters > excellentParams) {
      if (avgParameters <= goodParams) {
        score -= (avgParameters - excellentParams) * 0.5
      }
      else {
        score -= 1.0 + (avgParameters - goodParams) * 0.8
      }
    }

    // Ensure score stays within bounds
    const finalScore = Math.max(0, Math.min(10, score))
    return Math.round(finalScore * 100) / 100
  }

  /**
   * Analyzes quality issues and adds findings
   *
   * @param functionNodes - Function nodes to analyze
   * @param result - Result object to add findings to
   */
  private analyzeQualityIssues(functionNodes: TreeNode[], result: AnalysisResult): void {
    functionNodes.forEach((node) => {
      const complexity = this.calculateCyclomaticComplexity(node)
      const length = this.calculateMethodLength(node)
      const params = this.getParameterCount(node)

      if (complexity > 10) {
        this.addFinding(result, {
          type: 'quality',
          category: 'high_complexity',
          severity: complexity > 15 ? 'critical' : 'warning',
          location: `${node.path}:${node.startLine || 0}`,
          description: `Function '${node.name || 'anonymous'}' has high cyclomatic complexity (${complexity})`,
          context: `Consider breaking down into smaller functions`,
          metrics: { complexity },
        })
      }

      if (length > 50) {
        this.addFinding(result, {
          type: 'quality',
          category: 'long_method',
          severity: length > 100 ? 'critical' : 'warning',
          location: `${node.path}:${node.startLine || 0}`,
          description: `Method '${node.name || 'anonymous'}' is very long (${length} lines)`,
          context: `Consider extracting functionality into separate methods`,
          metrics: { methodLength: length },
        })
      }

      if (params > 5) {
        this.addFinding(result, {
          type: 'quality',
          category: 'parameter_overload',
          severity: params > 8 ? 'critical' : 'warning',
          location: `${node.path}:${node.startLine || 0}`,
          description: `Function '${node.name || 'anonymous'}' has too many parameters (${params})`,
          context: `Consider using object parameters or breaking into smaller functions`,
          metrics: { parameterCount: params },
        })
      }

      if (node.content && node.name && node.content.includes(node.name)) {
        this.addFinding(result, {
          type: 'quality',
          category: 'recursion_detected',
          severity: 'info',
          location: `${node.path}:${node.startLine || 0}`,
          description: `Function '${node.name || 'anonymous'}' may contain recursion`,
          context: `Verify recursion has proper base case to prevent stack overflow`,
        })
      }
    })
  }
}