/**
 * Quality pattern detection utilities
 */

import { NESTING_THRESHOLD, isTestFile, QUALITY_CATEGORIES } from '../constants/index.js'
import { isInComment, isInTypeDefinition, isInSuspiciousContext, isCommonString, escapeRegExp } from '../utils/string-analysis.js'
import { calculateMethodLength } from './quality-metrics.js'
import { isAnonymousFunction, isSpecialFunction } from './quality-predicates.js'
import type { TreeNode } from '../types/core.js'
import type { Finding } from '../types/analysis.js'

/**
 * Detects magic numbers and strings in function content
 */
export function detectMagicValues(node: TreeNode): Finding[] {
  if (!node.content || !node.name) return []

  const findings: Finding[] = []
  const content = node.content

  const magicNumberPattern = /\b(\d{3,})\b/g
  const acceptableNumbers = new Set([
    '100', '200', '201', '400', '401', '403', '404', '500', '1000', // HTTP codes
    '255', '256', '512', '1024', '2048', '4096', // Powers of 2
    '365', '366', '604800', '86400', '3600', '1000', // Time values
  ])

  let match
  while ((match = magicNumberPattern.exec(content)) !== null) {
    const number = match[1]
    if (number && !acceptableNumbers.has(number)
      && !isInComment(content, match.index)
      && !isInTypeDefinition(content, match.index)) {
      const numValue = parseInt(number)
      if (numValue > 10000 || isInSuspiciousContext(content, match.index)) {
        findings.push({
          type: 'quality',
          category: QUALITY_CATEGORIES.MAGIC_NUMBER,
          severity: 'warning',
          location: `${node.path}:${node.startLine || 0}`,
          description: `Extract magic number: ${number}`,
          metrics: { magicValue: number },
        })
      }
    }
  }

  const magicStringPattern = /(["'`])([^"'`\n]{4,})\1/g
  while ((match = magicStringPattern.exec(content)) !== null) {
    const str = match[2]
    if (str && !isCommonString(str)
      && !isInComment(content, match.index)
      && !isInTypeDefinition(content, match.index)) {
      findings.push({
        type: 'quality',
        category: QUALITY_CATEGORIES.MAGIC_STRING,
        severity: 'warning',
        location: `${node.path}:${node.startLine || 0}`,
        description: `Extract magic string: ${str.substring(0, 20)}...`,
        metrics: { magicValue: str },
      })
    }
  }

  return findings
}

/**
 * Detects excessive nesting in function content with loop tolerance
 */
export function detectDeepNesting(node: TreeNode): Finding[] {
  if (!node.content || !node.name) return []

  const findings: Finding[] = []
  const content = node.content
  const lines = content.split('\n')

  let maxNesting = 0
  let currentNesting = 0
  let loopNesting = 0
  let lineNumber = node.startLine || 0

  for (const line of lines) {
    lineNumber++
    const trimmed = line.trim()

    const loopOpenings = (trimmed.match(/\b(for|while)\s*\(/g) || []).length
    const otherOpenings = (trimmed.match(/\b(if|switch|try)\s*\(|{/g) || []).length
    const closings = (trimmed.match(/}/g) || []).length

    loopNesting += loopOpenings - Math.min(closings, loopNesting)
    currentNesting += (loopOpenings + otherOpenings) - closings
    maxNesting = Math.max(maxNesting, currentNesting)

    const adjustedNesting = Math.max(0, currentNesting - loopNesting)

    if (adjustedNesting >= NESTING_THRESHOLD.MODERATE) {
      const severity = adjustedNesting >= NESTING_THRESHOLD.DEEP ? 'critical' : 'warning'

      findings.push({
        type: 'quality',
        category: QUALITY_CATEGORIES.DEEP_NESTING,
        severity,
        location: `${node.path}:${lineNumber}`,
        description: `Reduce nesting: ${adjustedNesting} levels`,
        metrics: { nestingLevel: currentNesting },
      })
      break // Only report once per function
    }
  }

  return findings
}

/**
 * Detects God class anti-pattern by counting functions per file
 */
export function detectGodClasses(functionNodes: TreeNode[]): Finding[] {
  const findings: Finding[] = []

  const functionsByFile = new Map<string, TreeNode[]>()

  functionNodes.forEach((node) => {
    if (!isTestFile(node.path) && node.type === 'function') {
      if (!functionsByFile.has(node.path)) {
        functionsByFile.set(node.path, [])
      }
      functionsByFile.get(node.path)!.push(node)
    }
  })

  functionsByFile.forEach((functions, filePath) => {
    const fileName = filePath.split('/').pop()?.toLowerCase() || ''
    if (fileName.includes('util') || fileName.includes('helper') || fileName.includes('constants')) {
      return
    }

    if (functions.length >= 20) {
      findings.push({
        type: 'quality',
        category: QUALITY_CATEGORIES.GOD_CLASS,
        severity: 'critical',
        location: filePath,
        description: `Split large file: ${functions.length} functions`,
        metrics: { functionCount: functions.length },
      })
    }
    else if (functions.length >= 12) {
      findings.push({
        type: 'quality',
        category: QUALITY_CATEGORIES.GOD_CLASS,
        severity: 'warning',
        location: filePath,
        description: `Consider splitting: ${functions.length} functions`,
        metrics: { functionCount: functions.length },
      })
    }
  })

  return findings
}

/**
 * Analyzes function usage patterns to detect thin wrappers and micro-functions
 */
export function analyzeFunctionUsage(functionNodes: TreeNode[]): Map<string, number> {
  const usage = new Map<string, number>()
  const functionNames = new Set(functionNodes.map(node => node.name).filter(Boolean))

  functionNodes.forEach((node) => {
    if (!node.content) return

    functionNames.forEach((funcName) => {
      if (!funcName) return

      const callPatterns = [
        new RegExp(`\\b${escapeRegExp(funcName)}\\s*\\(`, 'g'),
        new RegExp(`\\.${escapeRegExp(funcName)}\\s*\\(`, 'g'),
        new RegExp(`${escapeRegExp(funcName)}\\s*:`, 'g'), // object method references
      ]

      let count = 0
      callPatterns.forEach((pattern) => {
        const matches = node.content!.match(pattern)
        if (matches) {
          count += matches.length
        }
      })

      if (node.name === funcName) {
        count = Math.max(0, count - 1)
      }

      usage.set(funcName, (usage.get(funcName) || 0) + count)
    })
  })

  return usage
}

/**
 * Detects excessive micro-function patterns that may indicate over-abstraction
 */
export function analyzeMicroFunctionPatterns(functionUsage: Map<string, number>, functionNodes: TreeNode[]): Finding[] {
  const findings: Finding[] = []

  const shortFunctionsByFile = new Map<string, TreeNode[]>()

  functionNodes.forEach((node) => {
    if (isTestFile(node.path) || !node.name || isAnonymousFunction(node) || isSpecialFunction(node)) {
      return
    }

    const length = calculateMethodLength(node)
    const usageCount = functionUsage.get(node.name) || 0

    if (length <= 3 && usageCount <= 1) {
      if (!shortFunctionsByFile.has(node.path)) {
        shortFunctionsByFile.set(node.path, [])
      }
      shortFunctionsByFile.get(node.path)!.push(node)
    }
  })

  shortFunctionsByFile.forEach((functions, filePath) => {
    if (functions.length >= 3) {
      findings.push({
        type: 'quality',
        category: QUALITY_CATEGORIES.EXCESSIVE_ABSTRACTION,
        severity: 'critical',
        location: filePath,
        description: `Inline micro-functions: ${functions.length} short/unused`,
        metrics: { microFunctionCount: functions.length },
      })
    }
  })

  return findings
}