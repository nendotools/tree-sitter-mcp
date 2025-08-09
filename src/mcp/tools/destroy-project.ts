/**
 * Destroy Project tool implementation
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { SUCCESS } from '../../constants/index.js';
import type { DestroyProjectArgs } from '../../types/index.js';
import { TreeManager } from '../../core/tree-manager.js';
import { BatchFileWatcher } from '../../core/file-watcher.js';
import { getLogger } from '../../utils/logger.js';

export function destroyProject(
  args: DestroyProjectArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher
): TextContent {
  const logger = getLogger();

  try {
    // Check if project exists
    const project = treeManager.getProject(args.projectId);
    if (!project) {
      return {
        type: 'text',
        text: `Project "${args.projectId}" not found.`,
      };
    }

    // Stop file watcher if running
    fileWatcher.stopWatching(args.projectId);

    // Destroy the project
    treeManager.destroyProject(args.projectId);

    return {
      type: 'text',
      text: `✅ ${SUCCESS.PROJECT_DESTROYED}\n\nProject "${args.projectId}" has been removed from memory.\nFile watcher has been stopped.`,
    };
  } catch (error) {
    logger.error('Failed to destroy project:', error);
    throw error;
  }
}