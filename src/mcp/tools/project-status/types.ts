/**
 * Types for project status system
 */

import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { ProjectStatusArgs } from '../../../types/index.js'
import type { TreeManager } from '../../../core/tree-manager.js'
import type { BatchFileWatcher } from '../../../core/file-watcher.js'

/**
 * Project status context
 */
export interface ProjectStatusContext {
  args: ProjectStatusArgs
  treeManager: TreeManager
  fileWatcher: BatchFileWatcher
}

/**
 * Single project status data
 */
export interface SingleProjectStatus {
  projectId: string
  project: any
  stats: any
  watcherStatus: any
}

/**
 * All projects status data
 */
export interface AllProjectsStatus {
  projects: any[]
}

/**
 * Status formatter interface
 */
export interface StatusFormatter {
  /**
   * Check if this formatter can handle the request
   */
  canHandle(context: ProjectStatusContext): boolean

  /**
   * Format the status output
   */
  format(context: ProjectStatusContext): TextContent
}