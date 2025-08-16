/**
 * Technical debt explosion notice generator
 */

import type { QualityMetrics, QualityNoticeGenerator } from './types.js'

/**
 * Detects technical debt explosion (more than 40 warnings in production code)
 */
export class TechnicalDebtNotice implements QualityNoticeGenerator {
  shouldTrigger(metrics: QualityMetrics): boolean {
    return metrics.warningProduction > 40
  }

  generateFinding(metrics: QualityMetrics) {
    return {
      type: 'quality' as const,
      category: 'technical_debt_explosion',
      severity: 'critical' as const,
      location: 'Project Overview',
      description: `Technical debt explosion detected (${metrics.warningProduction} warnings in production code)`,
      context: `Technical debt has reached critical levels. Consider dedicated sprint(s) for code quality improvement.`,
      metrics: {
        warningProduction: metrics.warningProduction,
        totalMethods: metrics.totalMethods,
      },
    }
  }
}