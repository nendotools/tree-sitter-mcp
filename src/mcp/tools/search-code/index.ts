/**
 * Search Code MCP tool - Provides fast semantic search across indexed code elements
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { SearchCodeArgs } from '../../../types/index.js'
import { withErrorHandling } from '../../../core/error-handling/index.js'
import { TreeManager } from '../../../core/tree-manager.js'
import { BatchFileWatcher } from '../../../core/file-watcher.js'
import { validateSearchArgs, validateProject } from './validation.js'
import { buildSearchOptions } from './options.js'
import { ensureFileWatching, executeSearch } from './execution.js'
import { formatSearchResults } from './formatting.js'

/**
 * Performs semantic search across project code elements
 *
 * Features:
 * - Auto-initialization of projects on first search
 * - Mono-repo support with sub-project filtering
 * - Type, language, and path pattern filtering
 * - Formatted results with context information
 * - Automatic file watching setup
 *
 * @param args - Search parameters including query, filters, and scope
 * @param treeManager - Tree manager for search operations
 * @param fileWatcher - File watcher for monitoring changes
 * @returns Formatted search results as text content
 * @throws Error if search operation fails
 */
export async function searchCode(
  args: SearchCodeArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): Promise<TextContent> {
  return withErrorHandling(async () => {
    // Validate arguments and project
    validateSearchArgs(args)
    const project = validateProject(args, treeManager)

    // Ensure file watching is active
    await ensureFileWatching(args, project, fileWatcher)

    // Build search options and execute search
    const searchOptions = buildSearchOptions(args)
    const results = await executeSearch(args, searchOptions, treeManager)

    // Format and return results
    return formatSearchResults(args, results)
  }, {
    operation: 'search-code',
    tool: 'search-code',
  })
}