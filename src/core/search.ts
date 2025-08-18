/**
 * Code search functionality - simplified from complex SearchEngine class
 */

import type { TreeNode, SearchOptions, SearchResult, FindUsageResult } from '../types/core.js'
import { escapeRegExp } from '../utils/string-analysis.js'

/**
 * Searches for code elements matching the query
 */
export function searchCode(
  query: string,
  nodes: TreeNode[],
  options: SearchOptions = {},
): SearchResult[] {
  const {
    maxResults = 20,
    fuzzyThreshold = 30,
    exactMatch = false,
    types = [],
    pathPattern,
  } = options

  const results: SearchResult[] = []

  for (const node of nodes) {
    if (types.length > 0 && !types.includes(node.type)) continue

    if (pathPattern && !node.path.includes(pathPattern)) continue

    const score = calculateScore(query, node, exactMatch, fuzzyThreshold)
    if (score > 0) {
      results.push({
        node,
        score,
        matches: getMatches(query, node),
      })
    }

    if (node.children) {
      const childResults = searchCode(query, node.children, options)
      results.push(...childResults)
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}

function calculateScore(query: string, node: TreeNode, exactMatch: boolean, fuzzyThreshold: number): number {
  const name = node.name || ''
  const queryLower = query.toLowerCase()
  const nameLower = name.toLowerCase()

  if (exactMatch) {
    return name === query ? 100 : 0
  }

  if (name === query) return 100

  if (nameLower === queryLower) return 95

  if (nameLower.startsWith(queryLower)) return 85

  if (nameLower.includes(queryLower)) return 70

  const fuzzyScore = calculateFuzzyScore(queryLower, nameLower)
  return fuzzyScore >= fuzzyThreshold ? fuzzyScore : 0
}

function calculateFuzzyScore(query: string, target: string): number {
  if (query.length === 0) return 100
  if (target.length === 0) return 0

  let queryIndex = 0
  let targetIndex = 0
  let matchCount = 0

  while (queryIndex < query.length && targetIndex < target.length) {
    if (query[queryIndex] === target[targetIndex]) {
      matchCount++
      queryIndex++
    }
    targetIndex++
  }

  const ratio = matchCount / query.length
  return Math.round(ratio * 80) // Max 80 for fuzzy matches
}

function getMatches(query: string, node: TreeNode): string[] {
  const matches: string[] = []
  const queryLower = query.toLowerCase()

  if (node.name && node.name.toLowerCase().includes(queryLower)) {
    matches.push('name')
  }

  if (node.content && node.content.toLowerCase().includes(queryLower)) {
    matches.push('content')
  }

  if (node.path && node.path.toLowerCase().includes(queryLower)) {
    matches.push('path')
  }

  return matches
}

/**
 * Finds usage of an identifier across nodes with enhanced context
 */
export function findUsage(
  identifier: string,
  nodes: TreeNode[],
  options: { caseSensitive?: boolean, exactMatch?: boolean, pathPattern?: string } = {},
): FindUsageResult[] {
  const { caseSensitive = false, exactMatch = true, pathPattern } = options
  const results: FindUsageResult[] = []

  function searchInNode(node: TreeNode) {
    if (!node.content) return

    if (pathPattern && !node.path.includes(pathPattern)) return

    const searchText = caseSensitive ? node.content : node.content.toLowerCase()
    const searchId = caseSensitive ? identifier : identifier.toLowerCase()

    const regex = exactMatch
      ? new RegExp(`\\b${escapeRegExp(searchId)}\\b`, caseSensitive ? 'g' : 'gi')
      : new RegExp(escapeRegExp(searchId), caseSensitive ? 'g' : 'gi')

    let match
    while ((match = regex.exec(searchText)) !== null) {
      const matchIndex = match.index
      const lines = node.content.split('\n')

      let currentIndex = 0
      let lineNumber = 0
      let columnNumber = 0

      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i]!.length + 1 // +1 for newline
        if (currentIndex + lineLength > matchIndex) {
          lineNumber = i
          columnNumber = matchIndex - currentIndex
          break
        }
        currentIndex += lineLength
      }

      const context = getUsageContext(node, lineNumber, lines)

      results.push({
        node,
        context,
        startLine: (node.startLine || 1) + lineNumber,
        endLine: (node.startLine || 1) + lineNumber,
        startColumn: columnNumber,
        endColumn: columnNumber + identifier.length,
      })
    }

    if (node.children) {
      node.children.forEach(searchInNode)
    }
  }

  nodes.forEach(searchInNode)
  return results
}

/**
 * Get contextual information around a usage
 */
function getUsageContext(node: TreeNode, lineNumber: number, lines: string[]): string {
  if (node.type === 'function') {
    const content = lines.join('\n')
    if (content.length <= 500) {
      return content
    }
    return content.substring(0, 500) + '...'
  }

  const startLine = Math.max(0, lineNumber - 10)
  const endLine = Math.min(lines.length - 1, lineNumber + 3)

  const contextLines = lines.slice(startLine, endLine + 1)

  return contextLines
    .map((line, index) => {
      const actualLineNum = startLine + index + 1
      const prefix = actualLineNum === lineNumber + 1 ? '→ ' : '  '
      return `${prefix}${actualLineNum}: ${line}`
    })
    .join('\n')
}
