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

    // Separate production and test code for better scoring
    const productionNodes = functionNodes.filter(node => !this.isTestFile(node.path))
    const testNodes = functionNodes.filter(node => this.isTestFile(node.path))

    // Calculate metrics primarily based on production code
    const primaryNodes = productionNodes.length > 0 ? productionNodes : functionNodes
    const complexities = primaryNodes.map(node => this.calculateCyclomaticComplexity(node))
    const methodLengths = primaryNodes.map(node => this.calculateMethodLength(node))
    const parameterCounts = primaryNodes.map(node => this.getParameterCount(node))

    const avgComplexity = this.calculateAverage(complexities)
    const avgMethodLength = this.calculateAverage(methodLengths)
    const avgParameters = this.calculateAverage(parameterCounts)

    // First, analyze quality issues to get the count of problems
    this.analyzeQualityIssues(functionNodes, result)

    // Calculate base score from production code averages
    const baseScore = this.calculateQualityScore(avgComplexity, avgMethodLength, avgParameters)

    // Apply penalties for having many quality issues (but weight test issues less)
    const finalScore = this.adjustScoreForIssues(baseScore, result, functionNodes.length, testNodes.length)

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
  private adjustScoreForIssues(baseScore: number, result: AnalysisResult, totalMethods: number, testMethods: number = 0): number {
    const qualityFindings = result.findings.filter(f => f.type === 'quality')

    // Separate test and production issues
    const productionIssues = qualityFindings.filter(f => !this.isTestFile(f.location))
    const testIssues = qualityFindings.filter(f => this.isTestFile(f.location))

    const criticalProduction = productionIssues.filter(f => f.severity === 'critical').length
    const warningProduction = productionIssues.filter(f => f.severity === 'warning').length
    const criticalTest = testIssues.filter(f => f.severity === 'critical').length
    const warningTest = testIssues.filter(f => f.severity === 'warning').length

    if (totalMethods === 0) return baseScore

    const productionMethods = totalMethods - testMethods

    let adjustedScore = baseScore

    // Heavy penalties for production critical issues
    if (productionMethods > 0 && criticalProduction > 0) {
      const criticalDensity = criticalProduction / productionMethods
      adjustedScore -= criticalDensity * 4 // -4 points per critical issue per method
    }

    // Moderate penalties for production warning issues
    if (productionMethods > 0 && warningProduction > 0) {
      const warningDensity = warningProduction / productionMethods
      if (warningDensity > 0.1) { // More than 10% of methods have warnings
        adjustedScore -= (warningDensity - 0.1) * 2 // Progressive penalty
      }
    }

    // Lighter penalties for test issues (weight them at 25% of production issues)
    if (testMethods > 0) {
      const testCriticalDensity = criticalTest / testMethods
      const testWarningDensity = warningTest / testMethods

      adjustedScore -= testCriticalDensity * 1 // Much lighter penalty for test critical issues
      if (testWarningDensity > 0.2) { // More tolerant threshold for test warnings
        adjustedScore -= (testWarningDensity - 0.2) * 0.5 // Much lighter penalty
      }
    }

    // Additional penalty if there are many absolute production issues
    if (criticalProduction > 0) {
      adjustedScore -= Math.min(2, criticalProduction * 0.3) // Up to -2 for many critical issues
    }

    if (warningProduction > 5) {
      adjustedScore -= Math.min(1.5, (warningProduction - 5) * 0.1) // Up to -1.5 for many warnings
    }

    // Add critical notices for severe quality degradation
    this.addCriticalQualityNotices(result, {
      baseScore,
      adjustedScore,
      criticalProduction,
      warningProduction,
      criticalTest,
      warningTest,
      productionMethods,
      testMethods,
      totalMethods,
    })

    return Math.max(0, Math.min(10, Math.round(adjustedScore * 100) / 100))
  }

  /**
   * Adds critical notices for severe quality degradation patterns
   */
  private addCriticalQualityNotices(result: AnalysisResult, metrics: {
    baseScore: number
    adjustedScore: number
    criticalProduction: number
    warningProduction: number
    criticalTest: number
    warningTest: number
    productionMethods: number
    testMethods: number
    totalMethods: number
  }): void {
    const {
      baseScore,
      adjustedScore,
      criticalProduction,
      warningProduction,
      productionMethods,
      totalMethods,
    } = metrics

    // Severe score degradation (more than 5 points lost from base score)
    const scoreDrop = baseScore - adjustedScore
    if (scoreDrop > 5) {
      this.addFinding(result, {
        type: 'quality',
        category: 'severe_quality_degradation',
        severity: 'critical',
        location: 'Project Overview',
        description: `Severe quality degradation detected (${scoreDrop.toFixed(1)} point drop from base score)`,
        context: `Code quality has significantly deteriorated. Consider immediate refactoring effort.`,
        metrics: { scoreDrop, baseScore, adjustedScore },
      })
    }

    // Excessive critical issues (more than 20% of production methods have critical issues)
    if (productionMethods > 0) {
      const criticalDensity = criticalProduction / productionMethods
      if (criticalDensity > 0.2) {
        this.addFinding(result, {
          type: 'quality',
          category: 'critical_issue_epidemic',
          severity: 'critical',
          location: 'Project Overview',
          description: `Critical quality issues are widespread (${(criticalDensity * 100).toFixed(1)}% of methods affected)`,
          context: `Urgent: Over 20% of production methods have critical issues. This indicates systemic problems requiring immediate attention.`,
          metrics: { criticalDensity, criticalProduction, productionMethods },
        })
      }
    }

    // Excessive warning density (more than 50% of production methods have warnings)
    if (productionMethods > 0) {
      const warningDensity = warningProduction / productionMethods
      if (warningDensity > 0.5) {
        this.addFinding(result, {
          type: 'quality',
          category: 'warning_saturation',
          severity: 'critical',
          description: `Warning saturation detected (${(warningDensity * 100).toFixed(1)}% of methods affected)`,
          location: 'Project Overview',
          context: `Over half of production methods have quality warnings. This suggests widespread maintainability issues.`,
          metrics: { warningDensity, warningProduction, productionMethods },
        })
      }
    }

    // Absolute critical mass (more than 15 critical issues in production code)
    if (criticalProduction > 15) {
      this.addFinding(result, {
        type: 'quality',
        category: 'critical_mass_exceeded',
        severity: 'critical',
        location: 'Project Overview',
        description: `Critical issue mass exceeded (${criticalProduction} critical issues in production code)`,
        context: `The sheer number of critical issues indicates the codebase needs major architectural review and refactoring.`,
        metrics: { criticalProduction, totalMethods },
      })
    }

    // Technical debt explosion (more than 40 warnings in production code)
    if (warningProduction > 40) {
      this.addFinding(result, {
        type: 'quality',
        category: 'technical_debt_explosion',
        severity: 'critical',
        location: 'Project Overview',
        description: `Technical debt explosion detected (${warningProduction} warnings in production code)`,
        context: `Technical debt has reached critical levels. Consider dedicated sprint(s) for code quality improvement.`,
        metrics: { warningProduction, totalMethods },
      })
    }

    // Quality score in danger zone (below 3.0)
    if (adjustedScore < 3.0) {
      this.addFinding(result, {
        type: 'quality',
        category: 'quality_danger_zone',
        severity: 'critical',
        location: 'Project Overview',
        description: `Code quality in danger zone (score: ${adjustedScore.toFixed(2)}/10)`,
        context: `Quality score below 3.0 indicates severe maintainability risks. New feature development should be paused for quality improvements.`,
        metrics: { adjustedScore, scoreDrop },
      })
    }
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
   * Checks if a file is a test file
   */
  private isTestFile(filePath: string): boolean {
    return filePath.includes('.test.')
      || filePath.includes('.spec.')
      || filePath.includes('/test/')
      || filePath.includes('/tests/')
      || filePath.includes('__tests__')
      || filePath.includes('/fixtures/')
      || filePath.endsWith('test.ts')
      || filePath.endsWith('test.js')
      || filePath.endsWith('spec.ts')
      || filePath.endsWith('spec.js')
  }

  /**
   * Gets appropriate thresholds based on file type
   */
  private getQualityThresholds(filePath: string): {
    complexityWarning: number
    complexityCritical: number
    lengthWarning: number
    lengthCritical: number
    parameterWarning: number
    parameterCritical: number
  } {
    if (this.isTestFile(filePath)) {
      // More lenient thresholds for test files
      return {
        complexityWarning: 15, // Tests can be more complex due to setup/assertions
        complexityCritical: 25,
        lengthWarning: 100, // Test methods can be longer for comprehensive testing
        lengthCritical: 200,
        parameterWarning: 8, // Test methods may need more parameters for fixtures/mocks
        parameterCritical: 12,
      }
    }

    // Standard thresholds for production code
    return {
      complexityWarning: 10,
      complexityCritical: 15,
      lengthWarning: 50,
      lengthCritical: 100,
      parameterWarning: 5,
      parameterCritical: 8,
    }
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
      const thresholds = this.getQualityThresholds(node.path)

      if (complexity > thresholds.complexityWarning) {
        this.addFinding(result, {
          type: 'quality',
          category: 'high_complexity',
          severity: complexity > thresholds.complexityCritical ? 'critical' : 'warning',
          location: `${node.path}:${node.startLine || 0}`,
          description: `Function '${node.name || 'anonymous'}' has high cyclomatic complexity (${complexity})`,
          context: this.isTestFile(node.path)
            ? `Test function is complex - consider breaking into smaller test cases`
            : `Consider breaking down into smaller functions`,
          metrics: { complexity },
        })
      }

      if (length > thresholds.lengthWarning) {
        this.addFinding(result, {
          type: 'quality',
          category: 'long_method',
          severity: length > thresholds.lengthCritical ? 'critical' : 'warning',
          location: `${node.path}:${node.startLine || 0}`,
          description: `Method '${node.name || 'anonymous'}' is very long (${length} lines)`,
          context: this.isTestFile(node.path)
            ? `Test method is long - consider extracting helper functions or splitting test cases`
            : `Consider extracting functionality into separate methods`,
          metrics: { methodLength: length },
        })
      }

      if (params > thresholds.parameterWarning) {
        this.addFinding(result, {
          type: 'quality',
          category: 'parameter_overload',
          severity: params > thresholds.parameterCritical ? 'critical' : 'warning',
          location: `${node.path}:${node.startLine || 0}`,
          description: `Function '${node.name || 'anonymous'}' has too many parameters (${params})`,
          context: this.isTestFile(node.path)
            ? `Test function has many parameters - consider using test fixtures or helper objects`
            : `Consider using object parameters or breaking into smaller functions`,
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