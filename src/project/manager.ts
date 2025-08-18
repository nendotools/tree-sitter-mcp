/**
 * Simplified project management - streamlined from complex TreeManager class
 */

import { resolve } from 'path'
import { parseFile } from '../core/parser.js'
import { findProjectFiles } from '../core/file-walker.js'
import { createFileWatcher } from '../core/watcher.js'
import { generateId } from '../utils/helpers.js'
import { getLogger } from '../utils/logger.js'
import { handleError } from '../utils/errors.js'
import type { Project, ProjectConfig, TreeNode, FileChange } from '../types/core.js'
import { detectMonorepo } from './monorepo.js'

export function createProject(config: ProjectConfig, isSubProject = false): Project {
  const project: Project = {
    id: generateId(),
    config: {
      ...config,
      directory: resolve(config.directory),
      languages: config.languages || [],
      ignoreDirs: config.ignoreDirs || [],
      maxDepth: config.maxDepth || 10,
    },
    files: new Map(),
    nodes: new Map(),
  }

  if (!isSubProject) {
    const monorepoInfo = detectMonorepo(project.config.directory)
    if (monorepoInfo.isMonorepo) {
      project.isMonorepo = true
      project.subProjects = monorepoInfo.subProjects.map(subPath =>
        createProject({ ...config, directory: subPath }, true),
      )
    }
  }

  return project
}

export async function parseProject(project: Project): Promise<Project> {
  const logger = getLogger()

  try {
    logger.info(`Parsing project: ${project.config.directory}`)

    if (project.subProjects && project.subProjects.length > 0) {
      logger.info(`Parsing ${project.subProjects.length} sub-projects`)
      for (const subProject of project.subProjects) {
        try {
          await parseProject(subProject)
        }
        catch (error) {
          logger.error(`Failed to parse sub-project ${subProject.config.directory}:`, error)
        }
      }
    }
    else {
      const files = await findProjectFiles(
        project.config.directory,
        project.config.languages,
      )

      logger.info(`Found ${files.length} files to parse`)

      for (const filePath of files) {
        try {
          const fileNode = await parseFile(filePath)
          project.files.set(filePath, fileNode)

          const allNodes = extractAllNodes(fileNode)
          project.nodes.set(filePath, allNodes)
        }
        catch (error) {
          logger.warn(`Failed to parse ${filePath}:`, error)
        }
      }
    }

    logger.info(`Project parsed successfully: ${project.files.size} files`)
    return project
  }
  catch (error) {
    throw handleError(error, `Failed to parse project ${project.config.directory}`)
  }
}

export async function updateProject(project: Project, changes: FileChange[]): Promise<void> {
  const logger = getLogger()

  for (const change of changes) {
    switch (change.type) {
      case 'created':
      case 'modified':
        try {
          const fileNode = await parseFile(change.path)
          project.files.set(change.path, fileNode)

          const allNodes = extractAllNodes(fileNode)
          project.nodes.set(change.path, allNodes)

          logger.debug(`Updated file: ${change.path}`)
        }
        catch (error) {
          logger.warn(`Failed to update ${change.path}:`, error)
        }
        break

      case 'deleted':
        project.files.delete(change.path)
        project.nodes.delete(change.path)
        logger.debug(`Removed file: ${change.path}`)
        break
    }
  }
}

export function watchProject(project: Project, onUpdate?: (changes: FileChange[]) => void): () => void {
  const watcher = createFileWatcher(
    project.config.directory,
    (changes) => {
      updateProject(project, changes)
      onUpdate?.(changes)
    },
  )

  watcher.start()

  return () => watcher.stop()
}

export function getAllNodes(project: Project): TreeNode[] {
  const allNodes: TreeNode[] = []

  for (const fileNode of project.files.values()) {
    allNodes.push(fileNode)
  }

  for (const elementNodes of project.nodes.values()) {
    allNodes.push(...elementNodes)
  }

  if (project.subProjects) {
    for (const subProject of project.subProjects) {
      allNodes.push(...getAllNodes(subProject))
    }
  }

  return allNodes
}

export function getProjectStats(project: Project): {
  totalFiles: number
  totalNodes: number
  languages: string[]
  directories: string[]
} {
  const stats = {
    totalFiles: project.files.size,
    totalNodes: Array.from(project.nodes.values()).reduce((sum, nodes) => sum + nodes.length, 0),
    languages: new Set<string>(),
    directories: new Set<string>(),
  }

  for (const filePath of project.files.keys()) {
    const ext = filePath.split('.').pop()?.toLowerCase()
    if (ext) stats.languages.add(ext)

    const dir = filePath.split('/').slice(0, -1).join('/')
    stats.directories.add(dir)
  }

  return {
    ...stats,
    languages: Array.from(stats.languages),
    directories: Array.from(stats.directories),
  }
}

function extractAllNodes(fileNode: TreeNode): TreeNode[] {
  const nodes: TreeNode[] = []

  function traverse(node: TreeNode) {
    nodes.push(node)
    if (node.children) {
      node.children.forEach(traverse)
    }
  }

  traverse(fileNode)
  return nodes
}