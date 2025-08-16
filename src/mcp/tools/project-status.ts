/**
 * Project Status tool implementation
 */

import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { ProjectStatusArgs } from '../../types/index.js'
import type { TreeManager } from '../../core/tree-manager.js'
import type { BatchFileWatcher } from '../../core/file-watcher.js'
import { projectStatus as modularProjectStatus } from './project-status/index.js'

export function projectStatus(
  args: ProjectStatusArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): TextContent {
  return modularProjectStatus(args, treeManager, fileWatcher)
}
