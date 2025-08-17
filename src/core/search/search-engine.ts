/**
 * Search Engine - Advanced fuzzy search and ranking for code elements
 *
 * Extracted from TreeManager to provide reusable search functionality.
 * Handles complex fuzzy matching, cross-format word matching, and result ranking.
 */

import type { TreeNode, SearchOptions, SearchResult, ProjectTree } from '../../types/index.js'
import { NODE_TYPES } from '../../constants/analysis-constants.js'
import { minimatch } from 'minimatch'

export interface SearchContext {
  nodeIndex: Map<string, TreeNode[]>
  fileIndex: Map<string, TreeNode>
  subProjectName?: string
}

/**
 * Advanced search engine with fuzzy matching and intelligent ranking
 */
export class SearchEngine {
  /**
   * Performs comprehensive search across project indexes
   */
  search(
    project: ProjectTree,
    query: string,
    options: SearchOptions,
  ): SearchResult[] {
    const results: SearchResult[] = []
    const nodeIndexesToSearch = this.getNodeIndexesToSearch(project, options)

    // Search in node indexes (code elements)
    for (const { nodeIndex, subProjectName } of nodeIndexesToSearch) {
      this.searchInNodeIndex(nodeIndex, query, options, results, subProjectName)
    }

    // Search in file indexes if files are included in types
    if (!options.types || options.types.includes('file')) {
      this.searchInFileIndex(project, query, options, results)
    }

    return this.rankAndLimitResults(results, options.maxResults || 20)
  }

  /**
   * Split identifier into words for cross-format matching
   */
  private splitIntoWords(name: string): string[] {
    // Handle snake_case and ALL_CAPS first
    if (name.includes('_')) {
      return name.split('_').filter(Boolean)
    }

    // Handle camelCase and mixed patterns
    // Split on transitions: lowercase->uppercase, digit->letter, letter->digit
    return name
      .replace(/([a-z])([A-Z])/g, '$1|$2') // camelCase: user|Name
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1|$2') // XMLHttp: XML|Http
      .replace(/([a-zA-Z])(\d)/g, '$1|$2') // letter->digit: user|2
      .replace(/(\d)([a-zA-Z])/g, '$1|$2') // digit->letter: 2|Name
      .split('|')
      .filter(Boolean)
  }

  /**
   * Calculates fuzzy match score between query and name
   */
  private calculateFuzzyScore(name: string, query: string, options: SearchOptions): number {
    if (query.length === 0) return 0
    if (options.exactMatch) {
      return name.toLowerCase() === query.toLowerCase() ? 100 : 0
    }

    const nameLower = name.toLowerCase()
    const queryLower = query.toLowerCase()

    let baseScore = this.calculateBaseMatchScore(name, query, nameLower, queryLower)

    if (baseScore === 0) {
      baseScore = this.calculateFallbackMatches(name, query, nameLower, queryLower)
    }

    return baseScore > 0 ? this.applyMatchBonuses(baseScore, nameLower, queryLower, query, name) : 0
  }

  /**
   * Calculate primary match scores (exact, prefix, word matching)
   */
  private calculateBaseMatchScore(name: string, query: string, nameLower: string, queryLower: string): number {
    // 1. Exact match
    if (nameLower === queryLower) {
      return name === query ? 100 : 95
    }

    // 2. Prefix match
    if (nameLower.startsWith(queryLower)) {
      return name.startsWith(query) ? 85 : 75
    }

    // 3. Cross-format word matching
    return this.calculateWordMatching(name, query)
  }

  /**
   * Calculate word-based matching scores (camelCase <-> snake_case)
   */
  private calculateWordMatching(name: string, query: string): number {
    const nameWords = this.splitIntoWords(name)
    const queryWords = this.splitIntoWords(query)

    if (nameWords.length <= 1 && queryWords.length <= 1) {
      return 0
    }

    const nameWordsLower = nameWords.map(w => w.toLowerCase())
    const queryWordsLower = queryWords.map(w => w.toLowerCase())

    const matchCounts = this.countWordMatches(nameWordsLower, queryWordsLower)
    const wordBoundaryScore = this.calculateWordBoundaryScore(nameWords, query)

    return Math.max(this.scoreWordMatches(matchCounts, queryWordsLower.length), wordBoundaryScore)
  }

  /**
   * Count different types of word matches
   */
  private countWordMatches(nameWordsLower: string[], queryWordsLower: string[]) {
    const exactMatches = queryWordsLower.filter(qWord =>
      nameWordsLower.some(nWord => nWord === qWord),
    )

    const prefixMatches = queryWordsLower.filter(qWord =>
      !exactMatches.includes(qWord)
      && nameWordsLower.some(nWord => nWord.startsWith(qWord) && qWord.length >= 3),
    )

    const suffixMatches = queryWordsLower.filter(qWord =>
      !exactMatches.includes(qWord) && !prefixMatches.includes(qWord)
      && nameWordsLower.some(nWord => nWord.endsWith(qWord) && qWord.length >= 3),
    )

    return {
      exact: exactMatches.length,
      prefix: prefixMatches.length,
      suffix: suffixMatches.length,
      total: exactMatches.length + prefixMatches.length + suffixMatches.length,
    }
  }

  /**
   * Score word matches based on quality and coverage
   */
  private scoreWordMatches(matchCounts: ReturnType<typeof this.countWordMatches>, totalQueryWords: number): number {
    if (matchCounts.exact === totalQueryWords && totalQueryWords > 0) {
      return 85 // All exact matches
    }

    if (matchCounts.total === totalQueryWords && totalQueryWords > 0) {
      return 80 // All words match (exact + prefix + suffix)
    }

    if (matchCounts.total > 0) {
      const exactRatio = matchCounts.exact / totalQueryWords
      const totalRatio = matchCounts.total / totalQueryWords
      const qualityScore = (exactRatio * 0.8) + (totalRatio * 0.6)
      return Math.floor(75 * qualityScore)
    }

    return 0
  }

  /**
   * Calculate word boundary matching score
   */
  private calculateWordBoundaryScore(nameWords: string[], query: string): number {
    const queryLower = query.toLowerCase()

    for (const nameWord of nameWords) {
      if (nameWord.toLowerCase().startsWith(queryLower)) {
        return nameWord.startsWith(query) ? 70 : 60
      }

      if (nameWord.toLowerCase() === queryLower) {
        return nameWord === query ? 75 : 65
      }
    }

    return 0
  }

  /**
   * Calculate fallback matches (substring, sequence)
   */
  private calculateFallbackMatches(name: string, query: string, nameLower: string, queryLower: string): number {
    // Substring match
    if (nameLower.includes(queryLower)) {
      return name.includes(query) ? 55 : 50
    }

    // Character sequence match (fuzzy)
    const sequenceScore = this.calculateSequenceMatch(nameLower, queryLower)
    return sequenceScore > 0 ? Math.min(40, sequenceScore) : 0
  }

  /**
   * Apply position and length bonuses to base score
   */
  private applyMatchBonuses(baseScore: number, nameLower: string, queryLower: string, query: string, name: string): number {
    let score = baseScore

    // Position bonus
    const queryPos = nameLower.indexOf(queryLower)
    if (queryPos === 0) {
      score += 5 // Start of string bonus
    }
    else if (queryPos <= 2) {
      score += 2 // Near start bonus
    }

    // Length ratio bonus
    const lengthRatio = query.length / name.length
    if (lengthRatio >= 0.5 && lengthRatio <= 1.0) {
      score += Math.floor(5 * lengthRatio)
    }

    return Math.min(100, score)
  }

  /**
   * Calculate character sequence match score for fuzzy matching
   */
  private calculateSequenceMatch(name: string, query: string): number {
    if (query.length === 0) return 0
    if (query.length > name.length) return 0

    let nameIndex = 0
    let queryIndex = 0
    let matchStart = -1

    while (nameIndex < name.length && queryIndex < query.length) {
      if (name[nameIndex] === query[queryIndex]) {
        if (matchStart === -1) matchStart = nameIndex
        queryIndex++
      }
      nameIndex++
    }

    if (queryIndex < query.length) {
      return 0 // Didn't match all query characters
    }

    // Calculate match quality based on how much of the string was used
    const matchPercentage = queryIndex / query.length * 100
    const compactness = query.length / (nameIndex - queryIndex + query.length)

    return Math.floor(matchPercentage * compactness * 40)
  }

  /**
   * Check if name matches the search query
   */
  private matchesQuery(name: string, query: string, options: SearchOptions): number {
    // Handle empty query case - but allow it if we have filters that make it meaningful
    if (!query || query.trim().length === 0) {
      // If we have a path pattern filter or specific type filter, allow empty query to match all with default score
      if (options.pathPattern || (options.types && options.types.length > 0)) {
        return 50 // Default score for filter-only matching
      }
      return 0
    }
    return this.calculateFuzzyScore(name, query, options)
  }

  /**
   * Check if node matches search filters
   */
  private matchesFilters(node: TreeNode, options: SearchOptions): boolean {
    if (options.types && options.types.length > 0) {
      if (!options.types.includes(node.type)) {
        return false
      }
    }

    if (options.languages && options.languages.length > 0) {
      if (!node.language || !options.languages.includes(node.language)) {
        return false
      }
    }

    if (options.pathPattern) {
      // Use minimatch for glob-style pattern matching
      if (!minimatch(node.path, options.pathPattern)) {
        return false
      }
    }

    return true
  }

  /**
   * Create search result with context information
   */
  private createSearchResult(
    node: TreeNode,
    fuzzyScore: number,
    options: SearchOptions,
    subProjectName?: string,
  ): SearchResult {
    return {
      node,
      filePath: node.path,
      score: this.calculateScore(node, fuzzyScore, options),
      context: {
        parentName: node.parent?.name,
        parentType: node.parent?.type,
      },
      subProject: subProjectName,
    }
  }

  /**
   * Calculate final search result score with bonuses
   */
  private calculateScore(node: TreeNode, fuzzyScore: number, options: SearchOptions): number {
    let score = fuzzyScore

    // Node type bonuses (as before)
    if (node.type === NODE_TYPES.CLASS || node.type === NODE_TYPES.INTERFACE) {
      score += 5
    }
    else if (node.type === NODE_TYPES.FUNCTION || node.type === NODE_TYPES.METHOD) {
      score += 3
    }

    // Priority type bonus
    if (options.priorityType && node.type === options.priorityType) {
      score += 10
    }

    return Math.min(110, score)
  }

  /**
   * Sort and limit search results
   */
  private rankAndLimitResults(results: SearchResult[], maxResults: number): SearchResult[] {
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, maxResults)
  }

  /**
   * Search within node index for code elements
   */
  private searchInNodeIndex(
    nodeIndex: Map<string, TreeNode[]>,
    query: string,
    options: SearchOptions,
    results: SearchResult[],
    subProjectName?: string,
  ): void {
    const threshold = options.fuzzyThreshold || 30

    for (const [name, nodes] of nodeIndex) {
      const fuzzyScore = this.matchesQuery(name, query, options)

      if (fuzzyScore >= threshold) {
        for (const node of nodes) {
          if (this.matchesFilters(node, options)) {
            const result = this.createSearchResult(node, fuzzyScore, options, subProjectName)
            if (result) {
              results.push(result)
            }
          }
        }
      }
    }
  }

  /**
   * Search within file index for file matches
   */
  private searchInFileIndex(
    project: ProjectTree,
    query: string,
    options: SearchOptions,
    results: SearchResult[],
  ): void {
    const threshold = options.fuzzyThreshold || 30

    // Search main project files
    this.searchFileIndexMap(project.fileIndex, query, options, results, threshold)

    // Search mono-repo sub-project files
    if (project.isMonoRepo && project.subProjectFileIndex) {
      for (const [subProjectName, fileIndex] of project.subProjectFileIndex) {
        // Check if this sub-project should be included based on scope options
        if (this.shouldIncludeSubProject(subProjectName, options.scope)) {
          this.searchFileIndexMap(fileIndex, query, options, results, threshold, subProjectName)
        }
      }
    }
  }

  /**
   * Search a specific file index map
   */
  private searchFileIndexMap(
    fileIndex: Map<string, TreeNode>,
    query: string,
    options: SearchOptions,
    results: SearchResult[],
    threshold: number,
    subProjectName?: string,
  ): void {
    for (const [, fileNode] of fileIndex) {
      // Fast path: check filters first (especially path pattern) before expensive fuzzy matching
      if (!this.matchesFilters(fileNode, options)) {
        continue
      }

      // Match against filename (basename) and full path
      const filename = fileNode.name
      const fullPath = fileNode.path

      const filenameScore = this.matchesQuery(filename, query, options)
      const pathScore = this.matchesQuery(fullPath, query, options)
      const bestScore = Math.max(filenameScore, pathScore)

      if (bestScore >= threshold) {
        const result = this.createSearchResult(fileNode, bestScore, options, subProjectName)
        if (result) {
          results.push(result)
        }
      }
    }
  }

  /**
   * Check if sub-project should be included based on scope options
   */
  private shouldIncludeSubProject(subProjectName: string, scope?: any): boolean {
    if (!scope) return true

    if (scope.subProjects && scope.subProjects.length > 0) {
      return scope.subProjects.includes(subProjectName)
    }

    if (scope.excludeSubProjects && scope.excludeSubProjects.length > 0) {
      return !scope.excludeSubProjects.includes(subProjectName)
    }

    return true
  }

  /**
   * Get node indexes to search based on scope options
   */
  private getNodeIndexesToSearch(
    project: ProjectTree,
    options: SearchOptions,
  ): Array<{ nodeIndex: Map<string, TreeNode[]>, subProjectName?: string }> {
    const indexesToSearch: Array<{ nodeIndex: Map<string, TreeNode[]>, subProjectName?: string }> = []
    const scope = options.scope

    // If not a mono-repo or no specific scope, search main project
    if (!project.isMonoRepo || !scope) {
      indexesToSearch.push({ nodeIndex: project.nodeIndex })
      return indexesToSearch
    }

    // Search specific sub-projects if specified
    if (scope.subProjects && scope.subProjects.length > 0) {
      for (const subProjectName of scope.subProjects) {
        const subProjectNodeIndex = project.subProjectNodeIndex?.get(subProjectName)
        if (subProjectNodeIndex) {
          indexesToSearch.push({
            nodeIndex: subProjectNodeIndex,
            subProjectName,
          })
        }
      }
      return indexesToSearch
    }

    // Cross-project search
    if (scope.crossProjectSearch && project.subProjectNodeIndex) {
      for (const [subProjectName, nodeIndex] of project.subProjectNodeIndex) {
        if (scope.excludeSubProjects?.includes(subProjectName)) {
          continue
        }
        indexesToSearch.push({
          nodeIndex,
          subProjectName,
        })
      }
      return indexesToSearch
    }

    // Default: search main project
    indexesToSearch.push({ nodeIndex: project.nodeIndex })
    return indexesToSearch
  }
}