/**
 * Types for project initialization modules
 */

import type { Config } from '../../../types/index.js'
import type { TreeManager } from '../../../core/tree-manager.js'
import type { BatchFileWatcher } from '../../../core/file-watcher.js'

/**
 * Project initialization arguments
 */
export interface InitializeProjectArgs {
  projectId: string
  directory?: string
  languages?: string[]
  maxDepth?: number
  ignoreDirs?: string[]
  autoWatch?: boolean
}

/**
 * Project initialization context
 */
export interface ProjectInitContext {
  args: InitializeProjectArgs
  treeManager: TreeManager
  fileWatcher: BatchFileWatcher
  projectDir: string
  config: Config
}

/**
 * Mono-repo information
 */
export interface MonoRepoInfo {
  isMonoRepo: boolean
  subProjects: SubProject[]
}

/**
 * Sub-project information
 */
export interface SubProject {
  path: string
  languages: string[]
}

/**
 * Project validation result
 */
export interface ProjectValidationResult {
  isValid: boolean
  reason?: string
  projectDir?: string
}

/**
 * Project statistics for output
 */
export interface ProjectStats {
  totalFiles: number
  totalNodes: number
  memoryUsage: number
  languages: Record<string, number>
}