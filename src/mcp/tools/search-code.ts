/**
 * Search Code MCP tool - Provides fast semantic search across indexed code elements
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { DIRECTORIES, DEFAULT_IGNORE_DIRS } from '../../constants/service-constants.js'
import { SEARCH } from '../../constants/tree-constants.js'
import type { SearchCodeArgs, Config, SearchOptions, NodeType } from '../../types/index.js'
import { ErrorFactory } from '../../types/error-types.js'
import { TreeManager } from '../../core/tree-manager.js'
import { BatchFileWatcher } from '../../core/file-watcher.js'
import { getLogger } from '../../utils/logger.js'
import { findProjectRoot } from '../../utils/project-detection.js'

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
  const logger = getLogger()

  try {
    // Validate required parameters
    if (!args.projectId || args.projectId.trim().length === 0) {
      throw ErrorFactory.validationError('projectId', args.projectId)
    }

    if (!args.query || args.query.trim().length === 0) {
      throw ErrorFactory.invalidQuery(args.query || 'empty')
    }

    let project = treeManager.getProject(args.projectId)

    if (!project) {
      logger.info(`Auto-initializing project ${args.projectId}`)

      const config: Config = {
        workingDir: findProjectRoot(),
        languages: args.languages || [],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      project = await treeManager.createProject(args.projectId, config)
      await treeManager.initializeProject(args.projectId)

      await fileWatcher.startWatching(args.projectId, config)
    }
    else if (!project.initialized) {
      await treeManager.initializeProject(args.projectId)
    }

    if (!fileWatcher.getWatcher(args.projectId)) {
      await fileWatcher.startWatching(args.projectId, project.config)
    }

    const searchOptions: SearchOptions = {
      maxResults: args.maxResults || SEARCH.DEFAULT_MAX_RESULTS,
      types: args.types as NodeType[],
      languages: args.languages,
      pathPattern: args.pathPattern,
      exactMatch: args.exactMatch,
      caseSensitive: args.caseSensitive,
      priorityType: args.priorityType,
      fuzzyThreshold: args.fuzzyThreshold,
      includeContext: true,
      scope: {
        subProjects: args.subProjects,
        excludeSubProjects: args.excludeSubProjects,
        crossProjectSearch: args.crossProjectSearch,
      },
    }

    const results = await treeManager.search(args.projectId, args.query, searchOptions)

    if (results.length === 0) {
      return {
        type: 'text',
        text: `No matches found for "${args.query}"\n\nTry:\n• Using a broader search term\n• Checking if the project is in the right directory\n• Removing type or language filters`,
      }
    }

    const lines = [
      `Found ${results.length} match${results.length === 1 ? '' : 'es'} for "${args.query}":\n`,
    ]

    results.forEach((result, index) => {
      lines.push(`${index + 1}. ${result.node.name} (${result.node.type})`)
      lines.push(`   File: ${result.filePath}`)

      if (result.subProject) {
        lines.push(`   Sub-project: ${result.subProject}`)
      }

      if (result.node.startLine) {
        lines.push(
          `   Lines: ${result.node.startLine}-${result.node.endLine || result.node.startLine}`,
        )
      }

      if (result.context?.parentName) {
        lines.push(`   In: ${result.context.parentType} ${result.context.parentName}`)
      }

      if (result.node.parameters && result.node.parameters.length > 0) {
        lines.push(`   Parameters: ${result.node.parameters.join(', ')}`)
      }

      if (result.node.returnType) {
        lines.push(`   Returns: ${result.node.returnType}`)
      }

      lines.push('')
    })

    return {
      type: 'text',
      text: lines.join('\n'),
    }
  }
  catch (error) {
    logger.error('Search failed:', error)

    // Re-throw structured errors as-is
    if (error instanceof Error && error.name === 'McpOperationError') {
      throw error
    }

    // Wrap other errors in a system error
    throw ErrorFactory.systemError(
      'code search',
      error instanceof Error ? error.message : String(error),
    )
  }
}
