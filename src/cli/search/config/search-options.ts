/**
 * SearchOptions parsing and validation
 */

import type { SearchOptions } from '../../../types/mcp-types.js'
import type { NodeType } from '../../../types/tree-types.js'
import type { CLISearchOptions } from './cli-config.js'

/**
 * Convert CLI search options to internal SearchOptions format
 */
export function createSearchOptions(options: CLISearchOptions): SearchOptions {
  return {
    types: parseTypes(options.types),
    languages: parseLanguages(options.languages),
    exactMatch: options.exact || false,
    maxResults: parseMaxResults(options.maxResults),
    includeContext: true,
  }
}

/**
 * Parse comma-separated types string into NodeType array
 */
export function parseTypes(typesString?: string): NodeType[] | undefined {
  if (!typesString) return undefined
  return typesString.split(',').map(t => t.trim()).filter(Boolean) as NodeType[]
}

/**
 * Parse comma-separated languages string into array
 */
export function parseLanguages(languagesString?: string): string[] | undefined {
  if (!languagesString) return undefined
  return languagesString.split(',').map(l => l.trim()).filter(Boolean)
}

/**
 * Parse and validate max results parameter
 */
export function parseMaxResults(maxResultsString?: string): number {
  const defaultMaxResults = 50

  if (!maxResultsString) return defaultMaxResults

  const parsed = parseInt(maxResultsString, 10)
  if (isNaN(parsed) || parsed <= 0) {
    return defaultMaxResults
  }

  return parsed
}

/**
 * Validate search query
 */
export function validateQuery(query: string): void {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty')
  }
}