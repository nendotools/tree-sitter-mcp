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

  try {
    await access(directory, constants.R_OK)
  }
  catch (error) {
    const message = `Directory does not exist or is not accessible: ${directory}`
    logger.error(message, error)
    throw new Error(message)
  }

  const rawProjectId = projectId || generateProjectId(manager, directory)
  const finalProjectId = sanitizeProjectId(rawProjectId)

  let project = getProject(manager.memory, finalProjectId)
  if (project) {
    if (project.config.directory !== directory) {
      logger.info(`Project ${finalProjectId} directory changed, reparsing`)
      await updateProjectDirectory(manager, project, directory, config)
    }
    return project
  }

  logger.info(`Creating new project: ${finalProjectId}`)
  project = createProject({
    ...config,
    directory,
  })
  project.id = finalProjectId

  await parseProject(project)

  addProject(manager.memory, project)
  manager.directoryToProject.set(directory, finalProjectId)
  manager.projectToDirectory.set(finalProjectId, directory)

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

  const existingProjectId = manager.directoryToProject.get(directory)
  if (existingProjectId) {
    return existingProjectId
  }

  const existingDirectory = manager.projectToDirectory.get(dirName)
  if (!existingDirectory || existingDirectory === directory) {
    return dirName
  }

  const hash = createHash('md5').update(directory).digest('hex').substring(0, 8)
  return `${dirName}-${hash}`
}

export function sanitizeProjectId(projectId: string): string {
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID must be a non-empty string')
  }

  let sanitized = projectId
    .replace(PROJECT_ID_PATTERNS.INVALID_CHARS, '-')
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens

  if (sanitized.length === 0) {
    sanitized = 'project'
  }

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

  stopWatching(manager, projectId)

  const directory = project.config.directory
  manager.directoryToProject.delete(directory)
  manager.projectToDirectory.delete(projectId)

  removeProject(manager.memory, projectId)
}

export function clearAllProjects(manager: PersistentProjectManager): void {
  const logger = getLogger()
  const projectCount = manager.memory.projects.size

  for (const projectId of manager.memory.projects.keys()) {
    stopWatching(manager, projectId)
  }

  manager.directoryToProject.clear()
  manager.projectToDirectory.clear()

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
  stopWatching(manager, project.id)

  const oldDirectory = project.config.directory
  manager.directoryToProject.delete(oldDirectory)
  manager.directoryToProject.set(newDirectory, project.id)
  manager.projectToDirectory.set(project.id, newDirectory)

  project.config = { ...config, directory: newDirectory }

  await parseProject(project)

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