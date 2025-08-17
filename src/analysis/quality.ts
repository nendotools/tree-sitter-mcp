/**
 * Quality analysis - simplified from complex QualityAnalyzer class
 */

import { isTestFile, QUALITY_CATEGORIES } from '../constants/index.js'
import { calculateComplexity, calculateMethodLength, getParameterCount, calculateAverage, calculateQualityScore, adjustScoreForIssues } from './quality-metrics.js'
import { shouldCheckForUnnecessaryAbstraction, createAbstractionFinding, getQualityThresholds } from './quality-predicates.js'
import { detectMagicValues, detectDeepNesting, detectGodClasses, analyzeFunctionUsage, analyzeMicroFunctionPatterns } from './quality-patterns.js'
import type { TreeNode } from '../types/core.js'
import type { Finding, QualityMetrics } from '../types/analysis.js'

export interface QualityResult {
  metrics: QualityMetrics
  findings: Finding[]
}

export function analyzeQuality(nodes: TreeNode[]): QualityResult {
  const functionNodes = nodes.filter(node =>
    node.type === 'function'
    || node.type === 'method'
    || node.name?.includes('function'),
  )

  if (functionNodes.length === 0) {
    return {
      metrics: {
        avgComplexity: 0,
        avgMethodLength: 0,
        avgParameters: 0,
        totalMethods: 0,
        codeQualityScore: 7,
      },
      findings: [],
    }
  }

  const productionNodes = functionNodes.filter(node => !isTestFile(node.path))
  const testNodes = functionNodes.filter(node => isTestFile(node.path))
  const primaryNodes = productionNodes.length > 0 ? productionNodes : functionNodes

  const complexities = primaryNodes.map(calculateComplexity)
  const methodLengths = primaryNodes.map(calculateMethodLength)
  const parameterCounts = primaryNodes.map(getParameterCount)

  const avgComplexity = calculateAverage(complexities)
  const avgMethodLength = calculateAverage(methodLengths)
  const avgParameters = calculateAverage(parameterCounts)

  const findings = analyzeQualityIssues(functionNodes)
  const baseScore = calculateQualityScore(avgComplexity, avgMethodLength, avgParameters)
  const finalScore = adjustScoreForIssues(baseScore, findings, functionNodes.length, testNodes.length)

  return {
    metrics: {
      avgComplexity,
      avgMethodLength,
      avgParameters,
      totalMethods: functionNodes.length,
      codeQualityScore: finalScore,
    },
    findings,
  }
}

function analyzeQualityIssues(functionNodes: TreeNode[]): Finding[] {
  const functionUsage = analyzeFunctionUsage(functionNodes)
  const findings: Finding[] = []

  // Basic metrics analysis (consolidate thin wrappers)
  functionNodes.forEach((node) => {
    const complexity = calculateComplexity(node)
    const length = calculateMethodLength(node)
    const params = getParameterCount(node)
    const thresholds = getQualityThresholds(node.path)

    // Inline complexity check
    if (complexity > thresholds.complexityWarning) {
      findings.push({
        type: 'quality' as const,
        category: QUALITY_CATEGORIES.HIGH_COMPLEXITY,
        severity: complexity > thresholds.complexityCritical ? 'critical' as const : 'warning' as const,
        location: `${node.path}:${node.startLine || 0}`,
        description: `Function '${node.name || 'anonymous'}' has high cyclomatic complexity (${complexity})`,
        context: isTestFile(node.path)
          ? 'Test function is complex - consider breaking into smaller test cases'
          : 'Consider breaking down into smaller functions',
        metrics: { complexity },
      })
    }

    // Inline method length check
    if (length > thresholds.lengthWarning) {
      findings.push({
        type: 'quality' as const,
        category: QUALITY_CATEGORIES.LONG_METHOD,
        severity: length > thresholds.lengthCritical ? 'critical' as const : 'warning' as const,
        location: `${node.path}:${node.startLine || 0}`,
        description: `Method '${node.name || 'anonymous'}' is very long (${length} lines)`,
        context: isTestFile(node.path)
          ? 'Test method is long - consider extracting helper functions'
          : 'Consider extracting functionality into separate methods',
        metrics: { methodLength: length },
      })
    }

    // Inline parameter count check
    if (params > thresholds.parameterWarning) {
      findings.push({
        type: 'quality' as const,
        category: QUALITY_CATEGORIES.PARAMETER_OVERLOAD,
        severity: params > thresholds.parameterCritical ? 'critical' as const : 'warning' as const,
        location: `${node.path}:${node.startLine || 0}`,
        description: `Function '${node.name || 'anonymous'}' has too many parameters (${params})`,
        context: isTestFile(node.path)
          ? 'Test function has many parameters - consider using test fixtures'
          : 'Consider using object parameters or breaking into smaller functions',
        metrics: { parameterCount: params },
      })
    }

    // Abstraction analysis (inline simple check)
    if (shouldCheckForUnnecessaryAbstraction(node, length)) {
      const usageCount = functionUsage.get(node.name!) || 0
      if (usageCount <= 1) {
        findings.push(createAbstractionFinding(node, length, usageCount))
      }
    }
  })

  // Complex pattern analysis (keep substantial functions)
  functionNodes.forEach((node) => {
    if (!isTestFile(node.path) && node.content) {
      findings.push(...detectMagicValues(node))
      findings.push(...detectDeepNesting(node))
    }
  })

  // Usage pattern analysis (substantial functions)
  findings.push(...analyzeMicroFunctionPatterns(functionUsage, functionNodes))
  findings.push(...detectGodClasses(functionNodes))

  return findings
}
