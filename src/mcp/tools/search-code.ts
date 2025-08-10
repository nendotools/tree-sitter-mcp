/**
 * Search Code tool implementation
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { DIRECTORIES, DEFAULT_IGNORE_DIRS } from '../../constants/service-constants.js'
import { SEARCH } from '../../constants/tree-constants.js'
import type { SearchCodeArgs, Config, SearchOptions, NodeType } from '../../types/index.js'
import { TreeManager } from '../../core/tree-manager.js'
import { BatchFileWatcher } from '../../core/file-watcher.js'
import { getLogger } from '../../utils/logger.js'
import { findProjectRoot } from '../../utils/project-detection.js'

export async function searchCode(
  args: SearchCodeArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): Promise<TextContent> {
  const logger = getLogger()

  try {
    // Check if project exists
    let project = treeManager.getProject(args.projectId)

    // Auto-initialize if needed
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

      // Start watcher
      await fileWatcher.startWatching(args.projectId, config)
    }
    else if (!project.initialized) {
      await treeManager.initializeProject(args.projectId)
    }

    // Ensure watcher is running
    if (!fileWatcher.getWatcher(args.projectId)) {
      await fileWatcher.startWatching(args.projectId, project.config)
    }

    // Prepare search options
    const searchOptions: SearchOptions = {
      maxResults: args.maxResults || SEARCH.DEFAULT_MAX_RESULTS,
      types: args.types as NodeType[],
      languages: args.languages,
      pathPattern: args.pathPattern,
      exactMatch: args.exactMatch,
      caseSensitive: args.caseSensitive,
      includeContext: true,
    }

    // Perform search
    const results = await treeManager.search(args.projectId, args.query, searchOptions)

    // Format results
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
    throw error
  }
}
