/**
 * Types for quality notices system
 */

import type { AnalysisResult } from '../../../../types/index.js'

/**
 * Quality metrics for notice evaluation
 */
export interface QualityMetrics {
  baseScore: number
  adjustedScore: number
  criticalProduction: number
  warningProduction: number
  criticalTest: number
  warningTest: number
  productionMethods: number
  testMethods: number
  totalMethods: number
}

/**
 * Quality notice generator interface
 */
export interface QualityNoticeGenerator {
  /**
   * Check if this notice should be triggered
   */
  shouldTrigger(metrics: QualityMetrics): boolean

  /**
   * Generate the finding to add to results
   */
  generateFinding(metrics: QualityMetrics): {
    type: 'quality'
    category: string
    severity: 'critical'
    location: string
    description: string
    context: string
    metrics: Record<string, number>
  }
}

/**
 * Function to add finding to analysis result
 */
export type AddFindingFunction = (result: AnalysisResult, finding: {
  type: 'quality'
  category: string
  severity: 'critical'
  location: string
  description: string
  context: string
  metrics: Record<string, number>
}) => void