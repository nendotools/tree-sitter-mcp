/**
 * Quality notices orchestrator
 */

import type { AnalysisResult } from '../../../../types/index.js'
import type { QualityMetrics, QualityNoticeGenerator, AddFindingFunction } from './types.js'
import { ScoreDegradationNotice } from './score-degradation.js'
import { CriticalEpidemicNotice } from './critical-epidemic.js'
import { WarningSaturationNotice } from './warning-saturation.js'
import { CriticalMassNotice } from './critical-mass.js'
import { TechnicalDebtNotice } from './technical-debt.js'
import { DangerZoneNotice } from './danger-zone.js'

/**
 * All available quality notice generators
 */
const QUALITY_NOTICE_GENERATORS: QualityNoticeGenerator[] = [
  new ScoreDegradationNotice(),
  new CriticalEpidemicNotice(),
  new WarningSaturationNotice(),
  new CriticalMassNotice(),
  new TechnicalDebtNotice(),
  new DangerZoneNotice(),
]

/**
 * Add critical quality notices using modular notice generators
 */
export function addCriticalQualityNotices(
  result: AnalysisResult,
  metrics: QualityMetrics,
  addFinding: AddFindingFunction,
): void {
  for (const generator of QUALITY_NOTICE_GENERATORS) {
    if (generator.shouldTrigger(metrics)) {
      const finding = generator.generateFinding(metrics)
      addFinding(result, finding)
    }
  }
}

// Re-export types for external use
export type { QualityMetrics, QualityNoticeGenerator, AddFindingFunction } from './types.js'