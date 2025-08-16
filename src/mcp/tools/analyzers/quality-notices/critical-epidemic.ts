/**
 * Critical issue epidemic notice generator
 */

import type { QualityMetrics, QualityNoticeGenerator } from './types.js'

/**
 * Detects excessive critical issues (more than 20% of production methods have critical issues)
 */
export class CriticalEpidemicNotice implements QualityNoticeGenerator {
  shouldTrigger(metrics: QualityMetrics): boolean {
    if (metrics.productionMethods === 0) return false

    const criticalDensity = metrics.criticalProduction / metrics.productionMethods
    return criticalDensity > 0.2
  }

  generateFinding(metrics: QualityMetrics) {
    const criticalDensity = metrics.criticalProduction / metrics.productionMethods

    return {
      type: 'quality' as const,
      category: 'critical_issue_epidemic',
      severity: 'critical' as const,
      location: 'Project Overview',
      description: `Critical quality issues are widespread (${(criticalDensity * 100).toFixed(1)}% of methods affected)`,
      context: `Urgent: Over 20% of production methods have critical issues. This indicates systemic problems requiring immediate attention.`,
      metrics: {
        criticalDensity,
        criticalProduction: metrics.criticalProduction,
        productionMethods: metrics.productionMethods,
      },
    }
  }
}