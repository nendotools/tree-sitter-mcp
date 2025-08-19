/**
 * Quality metrics calculation utilities
 */

import { QUALITY_CATEGORIES, isTestFile } from '../constants/index.js'
import type { TreeNode } from '../types/core.js'
import type { Finding } from '../types/analysis.js'

/**
 * Calculates cyclomatic complexity of a function node
 */
export function calculateComplexity(node: TreeNode): number {
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
 * Calculates the length of a method in lines
 */
export function calculateMethodLength(node: TreeNode): number {
  if (node.startLine && node.endLine) {
    return node.endLine - node.startLine + 1
  }

  if (node.content) {
    return node.content.split('\n').length
  }

  return 1
}

/**
 * Gets the parameter count for a function node
 */
export function getParameterCount(node: TreeNode): number {
  if (node.parameters && node.parameters.length > 0) {
    return node.parameters.length
  }

  if (node.content) {
    const match = node.content.match(/\(([^)]*)\)/)
    if (match && match[1]?.trim()) {
      return match[1].split(',').filter((p: string) => p.trim().length > 0).length
    }
  }

  return 0
}

/**
 * Calculates the average of an array of numbers, rounded to 2 decimal places
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return Math.round((sum / values.length) * 100) / 100
}

/**
 * Calculates a base quality score from average metrics
 */
export function calculateQualityScore(avgComplexity: number, avgMethodLength: number, avgParameters: number): number {
  let score = 10

  if (avgComplexity > 2) {
    if (avgComplexity <= 4) {
      score -= (avgComplexity - 2) * 0.8
    }
    else {
      score -= 1.6 + (avgComplexity - 4) * 1.2
    }
  }

  if (avgMethodLength > 10) {
    if (avgMethodLength <= 15) {
      score -= (avgMethodLength - 10) * 0.3
    }
    else {
      score -= 1.5 + (avgMethodLength - 15) * 0.15
    }
  }

  if (avgParameters > 2) {
    if (avgParameters <= 4) {
      score -= (avgParameters - 2) * 0.5
    }
    else {
      score -= 1.0 + (avgParameters - 4) * 0.8
    }
  }

  return Math.max(0, Math.min(10, Math.round(score * 100) / 100))
}

/**
 * Adjusts the base quality score based on analysis findings and issue density
 */
export function adjustScoreForIssues(baseScore: number, findings: Finding[], totalMethods: number, testMethods: number): number {
  const qualityFindings = findings.filter(f => f.type === 'quality')
  const productionIssues = qualityFindings.filter(f => !isTestFile(f.location))
  const testIssues = qualityFindings.filter(f => isTestFile(f.location))

  const microFunctionIssues = productionIssues.filter(f =>
    (f.category === QUALITY_CATEGORIES.UNNECESSARY_ABSTRACTION || f.category === QUALITY_CATEGORIES.EXCESSIVE_ABSTRACTION)
    && f.severity === 'critical'
    && Number(f.metrics?.usageCount ?? 0) <= 1,
  )

  const otherCriticalProduction = productionIssues.filter(f =>
    f.severity === 'critical'
    && f.category !== QUALITY_CATEGORIES.UNNECESSARY_ABSTRACTION
    && f.category !== QUALITY_CATEGORIES.EXCESSIVE_ABSTRACTION,
  ).length

  const warningProduction = productionIssues.filter(f => f.severity === 'warning').length
  const criticalTest = testIssues.filter(f => f.severity === 'critical').length
  const warningTest = testIssues.filter(f => f.severity === 'warning').length

  if (totalMethods === 0) return baseScore

  const productionMethods = totalMethods - testMethods
  let adjustedScore = baseScore

  if (productionMethods > 0) {
    if (otherCriticalProduction > 0) {
      const criticalDensity = otherCriticalProduction / productionMethods
      adjustedScore -= criticalDensity * 4
    }

    if (microFunctionIssues.length > 0) {
      const microFunctionDensity = microFunctionIssues.length / productionMethods
      adjustedScore -= microFunctionDensity * 3
    }

    if (warningProduction > 0) {
      const warningDensity = warningProduction / productionMethods
      if (warningDensity > 0.1) {
        adjustedScore -= (warningDensity - 0.1) * 2
      }
    }
  }

  if (testMethods > 0) {
    const testCriticalDensity = criticalTest / testMethods
    const testWarningDensity = warningTest / testMethods

    adjustedScore -= testCriticalDensity * 1
    if (testWarningDensity > 0.2) {
      adjustedScore -= (testWarningDensity - 0.2) * 0.5
    }
  }

  return Math.max(0, Math.min(10, Math.round(adjustedScore * 100) / 100))
}