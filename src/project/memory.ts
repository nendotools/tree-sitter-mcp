/**
 * Simple memory management with LRU eviction - simplified from complex ProjectMemoryManager
 */

import { getLogger } from '../utils/logger.js'
import type { Project } from '../types/core.js'

export interface MemoryManager {
  projects: Map<string, Project>
  maxProjects: number
  lastAccessed: Map<string, number>
}

export function createMemoryManager(maxProjects = 10): MemoryManager {
  return {
    projects: new Map(),
    maxProjects,
    lastAccessed: new Map(),
  }
}

export function addProject(manager: MemoryManager, project: Project): void {
  if (manager.projects.size >= manager.maxProjects) {
    const lruProject = findLRUProject(manager)
    if (lruProject) {
      removeProject(manager, lruProject)
    }
  }

  manager.projects.set(project.id, project)
  manager.lastAccessed.set(project.id, Date.now())
}

export function getProject(manager: MemoryManager, projectId: string): Project | null {
  const project = manager.projects.get(projectId)
  if (project) {
    manager.lastAccessed.set(projectId, Date.now())
  }
  return project || null
}

export function removeProject(manager: MemoryManager, projectId: string): void {
  manager.projects.delete(projectId)
  manager.lastAccessed.delete(projectId)

  const logger = getLogger()
  logger.debug(`Removed project from memory: ${projectId}`)
}

export function findLRUProject(manager: MemoryManager): string | null {
  let oldestTime = Date.now()
  let oldestProject: string | null = null

  for (const [projectId, lastAccess] of manager.lastAccessed) {
    if (lastAccess < oldestTime) {
      oldestTime = lastAccess
      oldestProject = projectId
    }
  }

  return oldestProject
}

export function getMemoryStats(manager: MemoryManager): {
  totalProjects: number
  maxProjects: number
  memoryUsage: number
  oldestProject?: string
  newestProject?: string
} {
  let oldestTime = Date.now()
  let newestTime = 0
  let oldestProject: string | undefined
  let newestProject: string | undefined

  for (const [projectId, lastAccess] of manager.lastAccessed) {
    if (lastAccess < oldestTime) {
      oldestTime = lastAccess
      oldestProject = projectId
    }
    if (lastAccess > newestTime) {
      newestTime = lastAccess
      newestProject = projectId
    }
  }

  let memoryUsage = 0
  for (const project of manager.projects.values()) {
    memoryUsage += project.files.size * 1000 // Rough estimate: 1KB per file
    memoryUsage += Array.from(project.nodes.values()).reduce((sum, nodes) => sum + nodes.length, 0) * 100 // 100 bytes per node
  }

  return {
    totalProjects: manager.projects.size,
    maxProjects: manager.maxProjects,
    memoryUsage,
    oldestProject,
    newestProject,
  }
}

export function clearMemory(manager: MemoryManager): void {
  const logger = getLogger()
  const projectCount = manager.projects.size

  manager.projects.clear()
  manager.lastAccessed.clear()

  logger.info(`Cleared ${projectCount} projects from memory`)
}