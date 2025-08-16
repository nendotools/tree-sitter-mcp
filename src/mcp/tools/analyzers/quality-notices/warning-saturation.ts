/**
 * Warning saturation notice generator
 */

import type { QualityMetrics, QualityNoticeGenerator } from './types.js'

/**
 * Detects excessive warning density (more than 50% of production methods have warnings)
 */
export class WarningSaturationNotice implements QualityNoticeGenerator {
  shouldTrigger(metrics: QualityMetrics): boolean {
    if (metrics.productionMethods === 0) return false

    const warningDensity = metrics.warningProduction / metrics.productionMethods
    return warningDensity > 0.5
  }

  generateFinding(metrics: QualityMetrics) {
    const warningDensity = metrics.warningProduction / metrics.productionMethods

    return {
      type: 'quality' as const,
      category: 'warning_saturation',
      severity: 'critical' as const,
      location: 'Project Overview',
      description: `Warning saturation detected (${(warningDensity * 100).toFixed(1)}% of methods affected)`,
      context: `Over half of production methods have quality warnings. This suggests widespread maintainability issues.`,
      metrics: {
        warningDensity,
        warningProduction: metrics.warningProduction,
        productionMethods: metrics.productionMethods,
      },
    }
  }
}