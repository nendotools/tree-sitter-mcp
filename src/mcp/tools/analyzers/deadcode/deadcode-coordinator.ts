/**
 * Enhanced dead code analyzer coordinator
 */

import { BaseAnalyzer } from '../base-analyzer.js'
import type { TreeNode, AnalysisResult } from '../../../../types/index.js'

// New traversal-based detector
import { TraversalDeadCodeDetector } from './traversal-deadcode-detector.js'

/**
 * Enhanced dead code analyzer using top-down traversal approach
 *
 * Instead of regex-based import detection, this uses:
 * 1. Comprehensive entry point detection
 * 2. AST-based dependency graph traversal
 * 3. Reachability analysis from entry points
 */
export class DeadCodeCoordinator extends BaseAnalyzer {
  private traversalDetector: TraversalDeadCodeDetector

  constructor() {
    super()
    this.traversalDetector = new TraversalDeadCodeDetector()
  }

  async analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void> {
    const fileNodes = this.getFileNodes(nodes)

    if (fileNodes.length === 0) {
      result.metrics.deadCode = {
        orphanedFiles: 0,
        unusedExports: 0,
        unusedDependencies: 0,
      }
      return
    }

    // Use the new traversal-based approach
    await this.traversalDetector.analyze(fileNodes, result)
  }

  // getFileNodes is inherited from BaseAnalyzer
}