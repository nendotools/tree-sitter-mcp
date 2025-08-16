/**
 * Results transformation and mapping utilities
 */

import { resolve } from 'path'
import type { SearchResult, SearchOptions } from '../../../types/mcp-types.js'

/**
 * Mapped search result for CLI output
 */
export interface MappedSearchResult {
  name: string
  type: string
  path: string
  location: {
    startLine: number
    endLine: number
    startColumn: number
    endColumn: number
  }
  score: number
  context: any
  subProject?: string
}

/**
 * Complete search output structure
 */
export interface SearchOutput {
  query: string
  directory: string
  options: {
    exactMatch: boolean
    maxResults: number
    types?: string[]
    languages?: string[]
  }
  results: MappedSearchResult[]
  totalResults: number
}

/**
 * Transform search results into CLI output format
 */
export function mapSearchResults(results: SearchResult[]): MappedSearchResult[] {
  return results.map((result: SearchResult) => ({
    name: result.node.name,
    type: result.node.type,
    path: result.filePath,
    location: {
      startLine: result.node.startLine || 0,
      endLine: result.node.endLine || 0,
      startColumn: result.node.startColumn || 0,
      endColumn: result.node.endColumn || 0,
    },
    score: result.score,
    context: result.context,
    subProject: result.subProject,
  }))
}

/**
 * Create complete search output object
 */
export function createSearchOutput(
  query: string,
  directory: string,
  searchOptions: SearchOptions,
  results: SearchResult[],
): SearchOutput {
  return {
    query,
    directory: resolve(directory),
    options: {
      exactMatch: searchOptions.exactMatch || false,
      maxResults: searchOptions.maxResults || 50,
      types: searchOptions.types,
      languages: searchOptions.languages,
    },
    results: mapSearchResults(results),
    totalResults: results.length,
  }
}