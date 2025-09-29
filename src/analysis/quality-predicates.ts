/**
 * Quality analysis predicates and classification utilities
 */

import { QUALITY_CATEGORIES, isTestFile } from '../constants/index.js'
import type { TreeNode } from '../types/core.js'
import type { Finding } from '../types/analysis.js'

/**
 * Quality thresholds interface
 */
export interface QualityThresholds {
  complexityWarning: number
  complexityCritical: number
  lengthWarning: number
  lengthCritical: number
  parameterWarning: number
  parameterCritical: number
}

/**
 * Determines if a function node should be checked for unnecessary abstraction
 */
export function shouldCheckForUnnecessaryAbstraction(node: TreeNode, length: number): boolean {
  return !isTestFile(node.path)
    && node.name !== undefined
    && !isAnonymousFunction(node)
    && length <= 3
    && !isSpecialFunction(node)
}

/**
 * Creates a finding for unnecessary abstraction issues
 */
export function createAbstractionFinding(node: TreeNode, length: number, usageCount: number): Finding {
  const usageDescription = usageCount === 0 ? 'never used' : 'only used once'

  return {
    type: 'quality',
    category: QUALITY_CATEGORIES.UNNECESSARY_ABSTRACTION,
    severity: 'critical',
    location: `${node.path}:${node.startLine || 0}`,
    description: `Inline short function: ${node.name} (${length} lines, ${usageDescription})`,
    metrics: { methodLength: length, usageCount },
  }
}

/**
 * Gets quality thresholds based on file type (test vs production)
 */
export function getQualityThresholds(filePath: string): QualityThresholds {
  if (isTestFile(filePath)) {
    return {
      complexityWarning: 15,
      complexityCritical: 25,
      lengthWarning: 100,
      lengthCritical: 200,
      parameterWarning: 8,
      parameterCritical: 12,
    }
  }

  return {
    complexityWarning: 10,
    complexityCritical: 15,
    lengthWarning: 50,
    lengthCritical: 100,
    parameterWarning: 5,
    parameterCritical: 8,
  }
}

/**
 * Checks if a function node represents an anonymous function
 */
export function isAnonymousFunction(node: TreeNode): boolean {
  if (!node.name) return true // No name = anonymous

  const name = node.name.toLowerCase()

  return name === 'anonymous'
    || name === ''
    || /^function\d*$/.test(name) // function, function1, function2, etc.
    || /^arrow\d*$/.test(name) // arrow, arrow1, arrow2, etc.
    || /^\$\d+$/.test(name) // $1, $2, etc. (common in some parsers)
    || /^_+\d*$/.test(name) // _, __, ___1, etc.
}

/**
 * Checks if a function node represents a special function that should be excluded from certain checks
 */
export function isSpecialFunction(node: TreeNode): boolean {
  if (!node.name || !node.content) return false

  const name = node.name.toLowerCase()
  const content = node.content.toLowerCase()

  if (name === 'constructor' || name.includes('constructor')) {
    return true
  }

  if (name.startsWith('init') || name.startsWith('setup') || name.startsWith('create')) {
    return true
  }

  if (name.startsWith('get') || name.startsWith('set') || name.startsWith('is') || name.startsWith('has')) {
    return true
  }

  if (name.includes('factory') || name.includes('builder') || name.includes('make')) {
    return true
  }

  if (name.includes('handler') || name.includes('callback') || name.includes('listener')) {
    return true
  }

  if (content.includes('return ') && content.split('\n').length <= 3) {
    return true
  }

  return false
}