/**
 * Initialize Project tool implementation
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { resolve } from 'path'
import chalk from 'chalk'
import { DIRECTORIES, DEFAULT_IGNORE_DIRS } from '../../constants/service-constants.js'
import { SUCCESS } from '../../constants/messages.js'
import type { InitializeProjectArgs, Config } from '../../types/index.js'
import { TreeManager } from '../../core/tree-manager.js'
import { BatchFileWatcher } from '../../core/file-watcher.js'
import { getLogger } from '../../utils/logger.js'
import { formatBytes } from '../../utils/helpers.js'

export async function initializeProject(
  args: InitializeProjectArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): Promise<TextContent> {
  const logger = getLogger()

  try {
    // Prepare configuration
    const config: Config = {
      workingDir: resolve(args.directory || '.'),
      languages: args.languages || [],
      maxDepth: args.maxDepth || DIRECTORIES.DEFAULT_MAX_DEPTH,
      ignoreDirs: args.ignoreDirs || DEFAULT_IGNORE_DIRS,
    }

    // Create or get project
    const project = await treeManager.createProject(args.projectId, config)

    // Initialize if not already initialized
    if (!project.initialized) {
      await treeManager.initializeProject(args.projectId)
    }

    // Start file watching if requested
    if (args.autoWatch !== false) {
      await fileWatcher.startWatching(args.projectId, config)
    }

    // Get stats for response
    const stats = treeManager.getProjectStats(args.projectId)

    // Format response
    const lines = [
      `${chalk.green('[OK]')} ${SUCCESS.PROJECT_INITIALIZED}`,
      '',
      `Project ID: ${args.projectId}`,
      `Directory: ${config.workingDir}`,
      `Files: ${stats.totalFiles}`,
      `Code Elements: ${stats.totalNodes}`,
      `Memory Usage: ${formatBytes(stats.memoryUsage)}`,
      '',
      'Languages detected:',
    ]

    for (const [lang, count] of Object.entries(stats.languages)) {
      lines.push(`  • ${lang}: ${count} files`)
    }

    if (args.autoWatch !== false) {
      lines.push('', chalk.green('[WATCH] File watching: ENABLED'))
    }

    lines.push('', 'You can now use search_code to find any code element instantly!')

    return {
      type: 'text',
      text: lines.join('\n'),
    }
  }
  catch (error) {
    logger.error('Failed to initialize project:', error)
    throw error
  }
}
