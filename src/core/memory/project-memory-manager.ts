/**
 * Project Memory Manager - Handles memory estimation, tracking, and LRU eviction
 *
 * Extracted from TreeManager to provide focused memory management functionality.
 * Implements LRU (Least Recently Used) eviction strategy and memory limit enforcement.
 */

import { MEMORY } from '../../constants/service-constants.js'
import type { ProjectTree } from '../../types/index.js'
import type { Logger } from '../../types/cli-types.js'

export interface MemoryStats {
  currentMemoryMB: number
  maxMemoryMB: number
  projectCount: number
  utilizationPercentage: number
}

export interface ProjectDestroyCallback {
  (projectId: string): void
}

/**
 * Manages memory usage across projects with LRU eviction
 */
export class ProjectMemoryManager {
  private currentMemoryMB: number = 0
  private maxMemoryMB: number = MEMORY.MAX_MEMORY_MB
  private logger: Logger

  constructor(logger: Logger, maxMemoryMB?: number) {
    this.logger = logger
    if (maxMemoryMB) {
      this.maxMemoryMB = maxMemoryMB
    }
  }

  /**
   * Estimates memory usage for a project in bytes
   */
  estimateProjectMemory(project: ProjectTree): number {
    const nodeCount = project.nodeIndex.size
    const fileCount = project.fileIndex.size

    return (
      nodeCount * MEMORY.DEFAULT_NODE_SIZE_BYTES
      + fileCount * 1024
      + project.nodeIndex.size * MEMORY.DEFAULT_INDEX_ENTRY_BYTES
    )
  }

  /**
   * Tracks memory usage when a project is added
   */
  trackProjectAdded(project: ProjectTree): void {
    const memoryUsage = this.estimateProjectMemory(project)
    project.memoryUsage = memoryUsage
    this.currentMemoryMB += memoryUsage / (1024 * 1024)
  }

  /**
   * Untracks memory usage when a project is removed
   */
  trackProjectRemoved(project: ProjectTree): void {
    this.currentMemoryMB -= project.memoryUsage / (1024 * 1024)
  }

  /**
   * Updates memory tracking when a project is modified
   */
  updateProjectMemory(project: ProjectTree): void {
    // Remove old memory usage
    this.currentMemoryMB -= project.memoryUsage / (1024 * 1024)

    // Calculate and add new memory usage
    const newMemoryUsage = this.estimateProjectMemory(project)
    project.memoryUsage = newMemoryUsage
    this.currentMemoryMB += newMemoryUsage / (1024 * 1024)
  }

  /**
   * Finds the least recently used project from a collection
   */
  findLRUProject(projects: Map<string, ProjectTree>): ProjectTree | null {
    let oldestProject: ProjectTree | null = null
    let oldestTime = new Date()

    for (const project of projects.values()) {
      if (project.accessedAt < oldestTime) {
        oldestTime = project.accessedAt
        oldestProject = project
      }
    }

    return oldestProject
  }

  /**
   * Checks if memory limits are exceeded and evicts projects if necessary
   */
  enforceMemoryLimits(
    projects: Map<string, ProjectTree>,
    destroyProjectCallback: ProjectDestroyCallback,
  ): void {
    if (this.currentMemoryMB > this.maxMemoryMB) {
      this.logger.warn('Memory limit exceeded, evicting projects...')

      while (this.currentMemoryMB > this.maxMemoryMB && projects.size > 1) {
        const lruProject = this.findLRUProject(projects)
        if (lruProject) {
          destroyProjectCallback(lruProject.projectId)
          this.logger.info(`Evicted LRU project: ${lruProject.projectId}`)
        }
        else {
          break // Safety break if no project can be found
        }
      }
    }
  }

  /**
   * Gets current memory statistics
   */
  getMemoryStats(projectCount: number): MemoryStats {
    return {
      currentMemoryMB: this.currentMemoryMB,
      maxMemoryMB: this.maxMemoryMB,
      projectCount,
      utilizationPercentage: (this.currentMemoryMB / this.maxMemoryMB) * 100,
    }
  }

  /**
   * Checks if adding a project would exceed memory limits
   */
  wouldExceedMemoryLimit(estimatedMemoryMB: number): boolean {
    return (this.currentMemoryMB + estimatedMemoryMB) > this.maxMemoryMB
  }

  /**
   * Gets current memory usage in MB
   */
  getCurrentMemoryMB(): number {
    return this.currentMemoryMB
  }

  /**
   * Gets maximum memory limit in MB
   */
  getMaxMemoryMB(): number {
    return this.maxMemoryMB
  }

  /**
   * Updates the maximum memory limit
   */
  setMaxMemoryMB(maxMemoryMB: number): void {
    this.maxMemoryMB = maxMemoryMB
  }

  /**
   * Resets memory tracking (useful for testing)
   */
  reset(): void {
    this.currentMemoryMB = 0
  }
}