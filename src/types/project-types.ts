/**
 * Project and tree management related types
 */

import type { TreeNode } from './tree-types.js'

// Project configuration
export interface Config {
  workingDir: string
  languages: string[]
  maxDepth: number
  ignoreDirs: string[]
  verbose?: boolean
  quiet?: boolean
}

// Sub-project information for mono-repo support
export interface SubProjectInfo {
  name: string
  path: string
  languages: string[]
  indicators: string[]
}

// Mono-repo detection result
export interface MonoRepoInfo {
  projectRoot: string
  isMonoRepo: boolean
  subProjects: SubProject[]
}

// Sub-project discovery data
export interface SubProject {
  path: string
  indicators: string[]
  languages: string[]
}

// Project tree representation
export interface ProjectTree {
  projectId: string
  root: TreeNode
  fileIndex: Map<string, TreeNode>
  nodeIndex: Map<string, TreeNode[]>
  config: Config
  initialized: boolean
  lastUpdate: Date
  createdAt: Date
  accessedAt: Date
  memoryUsage: number
  // Mono-repo support
  isMonoRepo?: boolean
  subProjects?: Map<string, SubProjectInfo>
  subProjectFileIndex?: Map<string, Map<string, TreeNode>> // subProject -> filePath -> TreeNode
  subProjectNodeIndex?: Map<string, Map<string, TreeNode[]>> // subProject -> nodeName -> TreeNode[]
}

// Project statistics
export interface ProjectStats {
  totalFiles: number
  totalNodes: number
  languages: Record<string, number>
  nodeTypes: Record<string, number>
  lastUpdate: Date
  initialized: boolean
  memoryUsage: number
  cacheHits?: number
  cacheMisses?: number
}

// Project information summary
export interface ProjectInfo {
  projectId: string
  workingDir: string
  initialized: boolean
  createdAt: Date
  accessedAt: Date
  memoryUsage: number
  watcherActive: boolean
  stats?: ProjectStats
}

// Memory management statistics
export interface MemoryStats {
  totalProjects: number
  totalMemoryMB: number
  projectsMemory: Record<string, number>
  maxMemoryMB: number
  availableMemoryMB: number
}

// File change event types
export type ChangeEventType = 'created' | 'modified' | 'deleted'

// File change event
export interface ChangeEvent {
  type: ChangeEventType
  path: string
  timestamp: Date
  oldContent?: string
  newContent?: string
}

// File watcher status
export interface WatcherStatus {
  watching: boolean
  projectId: string
  workingDir: string
  pollInterval: number
  filesTracked: number
  lastCheck?: Date
}
