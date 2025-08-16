/**
 * Dead Code Analyzer - Identifies potentially unused code and dependencies
 *
 * This analyzer now uses enhanced language and framework-specific detection
 * for more accurate dead code identification with reduced false positives.
 */

import { DeadCodeCoordinator } from './deadcode/deadcode-coordinator.js'
import type { TreeNode, AnalysisResult } from '../../../types/index.js'

/**
 * Analyzes dead code including unused exports, orphaned files, and unused dependencies
 *
 * Uses language-specific and framework-aware analysis for improved accuracy:
 * - JavaScript/TypeScript with React/Next.js support
 * - Python with proper import resolution
 * - Enhanced package.json analysis
 * - Framework-specific entry point detection
 */
export class DeadCodeAnalyzer {
  private coordinator: DeadCodeCoordinator

  constructor() {
    this.coordinator = new DeadCodeCoordinator()
  }

  async analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void> {
    await this.coordinator.analyze(nodes, result)
  }
}