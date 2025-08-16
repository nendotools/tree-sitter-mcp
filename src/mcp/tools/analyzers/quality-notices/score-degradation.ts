/**
 * Severe score degradation notice generator
 */

import type { QualityMetrics, QualityNoticeGenerator } from './types.js'

/**
 * Detects severe quality score degradation (more than 5 points lost from base score)
 */
export class ScoreDegradationNotice implements QualityNoticeGenerator {
  shouldTrigger(metrics: QualityMetrics): boolean {
    const scoreDrop = metrics.baseScore - metrics.adjustedScore
    return scoreDrop > 5
  }

  generateFinding(metrics: QualityMetrics) {
    const scoreDrop = metrics.baseScore - metrics.adjustedScore

    return {
      type: 'quality' as const,
      category: 'severe_quality_degradation',
      severity: 'critical' as const,
      location: 'Project Overview',
      description: `Severe quality degradation detected (${scoreDrop.toFixed(1)} point drop from base score)`,
      context: `Code quality has significantly deteriorated. Consider immediate refactoring effort.`,
      metrics: {
        scoreDrop,
        baseScore: metrics.baseScore,
        adjustedScore: metrics.adjustedScore,
      },
    }
  }
}