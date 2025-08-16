/**
 * Critical mass exceeded notice generator
 */

import type { QualityMetrics, QualityNoticeGenerator } from './types.js'

/**
 * Detects absolute critical mass (more than 15 critical issues in production code)
 */
export class CriticalMassNotice implements QualityNoticeGenerator {
  shouldTrigger(metrics: QualityMetrics): boolean {
    return metrics.criticalProduction > 15
  }

  generateFinding(metrics: QualityMetrics) {
    return {
      type: 'quality' as const,
      category: 'critical_mass_exceeded',
      severity: 'critical' as const,
      location: 'Project Overview',
      description: `Critical issue mass exceeded (${metrics.criticalProduction} critical issues in production code)`,
      context: `The sheer number of critical issues indicates the codebase needs major architectural review and refactoring.`,
      metrics: {
        criticalProduction: metrics.criticalProduction,
        totalMethods: metrics.totalMethods,
      },
    }
  }
}