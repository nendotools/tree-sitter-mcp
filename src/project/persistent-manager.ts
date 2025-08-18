/**
 * Persistent project manager with dual mapping and collision-safe projectId generation
 */

import { resolve, basename } from 'path'
import { createHash } from 'crypto'
import { access, constants } from 'fs/promises'
import { createMemoryManager, addProject, getProject, removeProject, type MemoryManager } from './memory.js'
import { createProject, parseProject, watchProject } from './manager.js'
import { getLogger } from '../utils/logger.js'
import { PROJECT_ID_PATTERNS } from '../constants/persistence.js'
import type { Project, ProjectConfig, FileChange } from '../types/core.js'

export interface PersistentProjectManager {
  memory: MemoryManager
  directoryToProject: Map<string, string>
  projectToDirectory: Map<string, string>
  watchers: Map<string, () => void>
}

export function createPersistentManager(maxProjects = 10): PersistentProjectManager {
  return {
    memory: createMemoryManager(maxProjects),
    directoryToProject: new Map(),
    projectToDirectory: new Map(),
    watchers: new Map(),
  }
}

export async function getOrCreateProject(
  manager: PersistentProjectManager,
  config: ProjectConfig,
  projectId?: string,
): Promise<Project> {
  const logger = getLogger()
  const directory = resolve(config.directory)

  // Validate directory exists and is accessible
  try {
    await access(directory, constants.R_OK)
  }
  catch (error) {
    const message = `Directory does not exist or is not accessible: ${directory}`
    logger.error(message, error)
    throw new Error(message)
  }

  // Determine final projectId with sanitization
  const rawProjectId = projectId || generateProjectId(manager, directory)
  const finalProjectId = sanitizeProjectId(rawProjectId)

  // Check if project exists
  let project = getProject(manager.memory, finalProjectId)
  if (project) {
    // Validate directory matches
    if (project.config.directory !== directory) {
      logger.info(`Project ${finalProjectId} directory changed, reparsing`)
      await updateProjectDirectory(manager, project, directory, config)
    }
    return project
  }

  // Create new project
  logger.info(`Creating new project: ${finalProjectId}`)
  project = createProject({
    ...config,
    directory,
  })
  project.id = finalProjectId

  // Parse project
  await parseProject(project)

  // Store mappings
  addProject(manager.memory, project)
  manager.directoryToProject.set(directory, finalProjectId)
  manager.projectToDirectory.set(finalProjectId, directory)

  // Start watching if auto-watch explicitly enabled
  if (config.autoWatch === true) {
    startWatching(manager, project)
  }

  return project
}

export function generateProjectId(
  manager: PersistentProjectManager,
  directory: string,
): string {
  const dirName = basename(directory)

  // Check if directory already has a project
  const existingProjectId = manager.directoryToProject.get(directory)
  if (existingProjectId) {
    return existingProjectId
  }

  // Check for collision with directory name
  const existingDirectory = manager.projectToDirectory.get(dirName)
  if (!existingDirectory || existingDirectory === directory) {
    return dirName
  }

  // Collision detected - append directory hash
  const hash = createHash('md5').update(directory).digest('hex').substring(0, 8)
  return `${dirName}-${hash}`
}

export function sanitizeProjectId(projectId: string): string {
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID must be a non-empty string')
  }

  // Remove invalid characters and replace with hyphens
  let sanitized = projectId
    .replace(PROJECT_ID_PATTERNS.INVALID_CHARS, '-')
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens

  // Ensure minimum length
  if (sanitized.length === 0) {
    sanitized = 'project'
  }

  // Enforce maximum length
  if (sanitized.length > PROJECT_ID_PATTERNS.MAX_LENGTH) {
    const hash = createHash('md5').update(projectId).digest('hex').substring(0, 8)
    sanitized = sanitized.substring(0, PROJECT_ID_PATTERNS.MAX_LENGTH - 9) + '-' + hash
  }

  return sanitized
}

export function listProjects(manager: PersistentProjectManager): Array<{
  projectId: string
  directory: string
  lastAccessed: number
  isWatched: boolean
}> {
  const projects: Array<{
    projectId: string
    directory: string
    lastAccessed: number
    isWatched: boolean
  }> = []

  for (const [projectId, project] of manager.memory.projects) {
    projects.push({
      projectId,
      directory: project.config.directory,
      lastAccessed: manager.memory.lastAccessed.get(projectId) || 0,
      isWatched: manager.watchers.has(projectId),
    })
  }

  return projects.sort((a, b) => b.lastAccessed - a.lastAccessed)
}

export function removeProjectFromManager(
  manager: PersistentProjectManager,
  projectId: string,
): void {
  const project = manager.memory.projects.get(projectId)
  if (!project) return

  // Stop watching
  stopWatching(manager, projectId)

  // Remove mappings
  const directory = project.config.directory
  manager.directoryToProject.delete(directory)
  manager.projectToDirectory.delete(projectId)

  // Remove from memory
  removeProject(manager.memory, projectId)
}

export function clearAllProjects(manager: PersistentProjectManager): void {
  const logger = getLogger()
  const projectCount = manager.memory.projects.size

  // Stop all watchers
  for (const projectId of manager.memory.projects.keys()) {
    stopWatching(manager, projectId)
  }

  // Clear all mappings
  manager.directoryToProject.clear()
  manager.projectToDirectory.clear()

  // Clear memory
  manager.memory.projects.clear()
  manager.memory.lastAccessed.clear()

  logger.info(`Cleared ${projectCount} projects from persistent manager`)
}

async function updateProjectDirectory(
  manager: PersistentProjectManager,
  project: Project,
  newDirectory: string,
  config: ProjectConfig,
): Promise<void> {
  // Stop current watching
  stopWatching(manager, project.id)

  // Update directory mappings
  const oldDirectory = project.config.directory
  manager.directoryToProject.delete(oldDirectory)
  manager.directoryToProject.set(newDirectory, project.id)
  manager.projectToDirectory.set(project.id, newDirectory)

  // Update project config
  project.config = { ...config, directory: newDirectory }

  // Reparse project
  await parseProject(project)

  // Restart watching if enabled
  if (config.autoWatch !== false) {
    startWatching(manager, project)
  }
}

function startWatching(
  manager: PersistentProjectManager,
  project: Project,
): void {
  if (manager.watchers.has(project.id)) return

  const logger = getLogger()
  const stopWatcher = watchProject(project, (changes: FileChange[]) => {
    logger.debug(`Project ${project.id} file changes: ${changes.length}`)
  })

  manager.watchers.set(project.id, stopWatcher)
  logger.debug(`Started watching project: ${project.id}`)
}

function stopWatching(
  manager: PersistentProjectManager,
  projectId: string,
): void {
  const stopWatcher = manager.watchers.get(projectId)
  if (stopWatcher) {
    stopWatcher()
    manager.watchers.delete(projectId)

    const logger = getLogger()
    logger.debug(`Stopped watching project: ${projectId}`)
  }
}