/**
 * Core search execution logic
 */

import type { SearchOptions, SearchResult } from '../../../types/mcp-types.js'
import type { TreeManager } from '../../../core/tree-manager.js'

/**
 * Execute search operation and return raw results
 */
export async function executeSearch(
  treeManager: TreeManager,
  projectId: string,
  query: string,
  options: SearchOptions,
): Promise<SearchResult[]> {
  return await treeManager.search(projectId, query, options)
}

/**
 * Execute search with error handling and context
 */
export async function executeSearchWithContext(
  treeManager: TreeManager,
  projectId: string,
  query: string,
  options: SearchOptions,
): Promise<{ results: SearchResult[], metadata: SearchMetadata }> {
  const startTime = Date.now()

  try {
    const results = await executeSearch(treeManager, projectId, query, options)
    const endTime = Date.now()

    return {
      results,
      metadata: {
        duration: endTime - startTime,
        totalResults: results.length,
        query,
        searchOptions: options,
      },
    }
  }
  catch (error) {
    throw new Error(`Search execution failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Search execution metadata
 */
export interface SearchMetadata {
  duration: number
  totalResults: number
  query: string
  searchOptions: SearchOptions
}