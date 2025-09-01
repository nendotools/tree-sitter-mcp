/**
 * Code search functionality - simplified from complex SearchEngine class
 */

import type { TreeNode, SearchOptions, SearchResult, FindUsageResult } from '../types/core.js'
import { createLightweightTreeNode } from '../types/core.js'
import { escapeRegExp } from '../utils/string-analysis.js'
import { getUsageContext, extractContent } from '../utils/content-extraction.js'

/**
 * Searches for code elements matching the query with progressive content inclusion
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
    forceContentInclusion = false,
    maxContentLines = 150,
    disableContentInclusion = false,
  } = options

  // First pass: collect all matching results without content
  const initialResults: Omit<SearchResult, 'contentIncluded' | 'content' | 'contentTruncated' | 'contentLines'>[] = []

  function collectMatches(currentNodes: TreeNode[]) {
    for (const node of currentNodes) {
      if (types.length > 0 && !types.includes(node.type)) continue
      if (pathPattern && !node.path.includes(pathPattern)) continue

      const score = calculateScore(query, node, exactMatch, fuzzyThreshold)
      if (score > 0) {
        initialResults.push({
          node: createLightweightTreeNode(node),
          score,
          matches: getMatches(query, node),
        })
      }

      if (node.children) {
        collectMatches(node.children)
      }
    }
  }

  collectMatches(nodes)

  // Remove duplicates by node ID (same node can appear multiple times due to different match paths)
  const seenNodeIds = new Set<string>()
  const uniqueResults = initialResults.filter((result) => {
    if (seenNodeIds.has(result.node.id)) {
      return false
    }
    seenNodeIds.add(result.node.id)
    return true
  })

  // Sort and slice to get final result set
  const sortedResults = uniqueResults
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  // Apply progressive content inclusion based on result count
  return includeContentInResults(sortedResults, {
    forceContentInclusion,
    maxContentLines,
    disableContentInclusion,
    explicitMaxContentLines: 'maxContentLines' in options,
  })
}

/**
 * Applies progressive content inclusion logic based on result count
 */
function includeContentInResults(
  results: Omit<SearchResult, 'contentIncluded' | 'content' | 'contentTruncated' | 'contentLines'>[],
  options: {
    forceContentInclusion?: boolean
    maxContentLines?: number
    disableContentInclusion?: boolean
    explicitMaxContentLines?: boolean
  } = {},
): SearchResult[] {
  const { forceContentInclusion = false, maxContentLines = 150, disableContentInclusion = false, explicitMaxContentLines = false } = options
  const resultCount = results.length

  // If content inclusion is disabled, return metadata only
  if (disableContentInclusion && !forceContentInclusion) {
    return results.map(r => ({
      ...r,
      contentIncluded: false,
      content: undefined,
      contentTruncated: undefined,
      contentLines: undefined,
    }))
  }

  // Progressive content inclusion rules
  if (resultCount >= 4 && !forceContentInclusion) {
    // 4+ results: metadata only (discovery mode)
    return results.map(r => ({
      ...r,
      contentIncluded: false,
      content: undefined,
      contentTruncated: undefined,
      contentLines: undefined,
    }))
  }

  // 1-3 results: include content with appropriate limits
  return results.map((result) => {
    const node = result.node
    if (!node.content) {
      return {
        ...result,
        contentIncluded: false,
        content: undefined,
        contentTruncated: undefined,
        contentLines: undefined,
      }
    }

    if (resultCount === 1) {
      // Single result: full content unless maxContentLines is explicitly set and smaller than content
      const isExplicitLimit = explicitMaxContentLines && maxContentLines < node.content.split('\n').length

      if (isExplicitLimit) {
        // Respect explicit maxContentLines even for single results
        const extracted = extractContent(node.content, {
          maxLines: maxContentLines,
          truncationMessage: '',
        })
        return {
          ...result,
          contentIncluded: true,
          content: extracted.content,
          contentTruncated: extracted.truncated,
          contentLines: extracted.originalLines,
        }
      }
      else {
        // Full content when no explicit limit or content is short
        return {
          ...result,
          contentIncluded: true,
          content: node.content,
          contentTruncated: false,
          contentLines: node.content.split('\n').length,
        }
      }
    }

    if (forceContentInclusion) {
      // When forced, always give full content (ignore maxContentLines)
      return {
        ...result,
        contentIncluded: true,
        content: node.content,
        contentTruncated: false,
        contentLines: node.content.split('\n').length,
      }
    }

    // 2-3 results: limited content (maxContentLines limit)
    const extracted = extractContent(node.content, {
      maxLines: maxContentLines,
      truncationMessage: '', // Don't add corruption markers to code content
    })

    return {
      ...result,
      contentIncluded: true,
      content: extracted.content,
      contentTruncated: extracted.truncated,
      contentLines: extracted.originalLines,
    }
  })
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
        node: createLightweightTreeNode(node),
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
