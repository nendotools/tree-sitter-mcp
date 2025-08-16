/**
 * Search execution functions
 */

import type { SearchCodeArgs, SearchOptions, Config } from '../../../types/index.js'
import type { TreeManager } from '../../../core/tree-manager.js'
import type { BatchFileWatcher } from '../../../core/file-watcher.js'

export async function ensureFileWatching(
  args: SearchCodeArgs,
  project: { config: Config },
  fileWatcher: BatchFileWatcher,
): Promise<void> {
  if (!fileWatcher.getWatcher(args.projectId)) {
    await fileWatcher.startWatching(args.projectId, project.config)
  }
}

export async function executeSearch(
  args: SearchCodeArgs,
  searchOptions: SearchOptions,
  treeManager: TreeManager,
) {
  const searchQuery = args.query || ''
  return await treeManager.search(args.projectId, searchQuery, searchOptions)
}