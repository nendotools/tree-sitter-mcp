/**
 * Quality danger zone notice generator
 */

import type { QualityMetrics, QualityNoticeGenerator } from './types.js'

/**
 * Detects quality score in danger zone (below 3.0)
 */
export class DangerZoneNotice implements QualityNoticeGenerator {
  shouldTrigger(metrics: QualityMetrics): boolean {
    return metrics.adjustedScore < 3.0
  }

  generateFinding(metrics: QualityMetrics) {
    const scoreDrop = metrics.baseScore - metrics.adjustedScore

    return {
      type: 'quality' as const,
      category: 'quality_danger_zone',
      severity: 'critical' as const,
      location: 'Project Overview',
      description: `Code quality in danger zone (score: ${metrics.adjustedScore.toFixed(2)}/10)`,
      context: `Quality score below 3.0 indicates severe maintainability risks. New feature development should be paused for quality improvements.`,
      metrics: {
        adjustedScore: metrics.adjustedScore,
        scoreDrop,
      },
    }
  }
}