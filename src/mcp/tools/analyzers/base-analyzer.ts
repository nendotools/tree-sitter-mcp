/**
 * Base analyzer interfaces and utilities for code analysis
 */

import type { TreeNode, AnalysisResult, QualityIssue } from '../../../types/index.js'

/**
 * Base interface for all code analyzers
 */
export interface ICodeAnalyzer {
  /**
   * Performs analysis on the provided AST nodes
   *
   * @param nodes - AST nodes to analyze
   * @param result - Analysis result object to populate
   */
  analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void>
}

/**
 * Base analyzer class with common utilities
 */
export abstract class BaseAnalyzer implements ICodeAnalyzer {
  abstract analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void>

  /**
   * Adds a finding to the analysis result
   *
   * @param result - Analysis result to add finding to
   * @param finding - Quality issue to add
   */
  protected addFinding(result: AnalysisResult, finding: QualityIssue): void {
    result.findings.push(finding)
  }

  /**
   * Filters nodes by type
   *
   * @param nodes - Nodes to filter
   * @param types - Node types to include
   * @returns Filtered nodes
   */
  protected filterNodesByType(nodes: TreeNode[], types: string[]): TreeNode[] {
    return nodes.filter(node => types.includes(node.type))
  }

  /**
   * Gets file nodes from the project
   *
   * @param nodes - All project nodes
   * @returns Array of file nodes
   */
  protected getFileNodes(nodes: TreeNode[]): TreeNode[] {
    return this.filterNodesByType(nodes, ['file'])
  }

  /**
   * Gets function/method nodes from the project
   *
   * @param nodes - All project nodes
   * @returns Array of function and method nodes
   */
  protected getFunctionNodes(nodes: TreeNode[]): TreeNode[] {
    return this.filterNodesByType(nodes, ['function', 'method'])
  }

  /**
   * Escapes special regex characters in a string
   *
   * @param string - String to escape
   * @returns Escaped string safe for regex
   */
  protected escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Finds the parent file node for a given node
   *
   * @param node - Node to find parent file for
   * @returns Parent file node or null
   */
  protected findParentFile(node: TreeNode): TreeNode | null {
    let current = node.parent
    while (current) {
      if (current.type === 'file') {
        return current
      }
      current = current.parent
    }
    return null
  }

  /**
   * Gets the file name without extension from a file path
   *
   * @param filePath - Full file path
   * @returns File name without extension
   */
  protected getFileNameWithoutExtension(filePath: string): string {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
    const dotIndex = fileName.lastIndexOf('.')
    return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName
  }

  /**
   * Finds the project root directory from the analyzed nodes
   *
   * @param nodes - All nodes in the project
   * @returns Project root path or null
   */
  protected findProjectRoot(nodes: TreeNode[]): string | null {
    const filePaths = nodes
      .filter(node => node.type === 'file')
      .map(node => node.path)

    if (filePaths.length === 0) return null

    // Find the common parent directory
    let commonPath = filePaths[0]?.substring(0, filePaths[0].lastIndexOf('/')) || ''

    for (const path of filePaths.slice(1)) {
      const pathDir = path.substring(0, path.lastIndexOf('/'))
      while (commonPath && !pathDir.startsWith(commonPath)) {
        commonPath = commonPath.substring(0, commonPath.lastIndexOf('/'))
      }
    }

    return commonPath || null
  }
}