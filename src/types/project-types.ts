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
