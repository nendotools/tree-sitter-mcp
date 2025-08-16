/**
 * Project creation and configuration utilities
 */

import { DEFAULT_IGNORE_DIRS, DIRECTORIES } from '../../../constants/service-constants.js'
import type { Config } from '../../../types/index.js'
import type { InitializeProjectArgs, ProjectInitContext } from './types.js'

/**
 * Build project configuration from arguments
 */
export function buildProjectConfig(args: InitializeProjectArgs, projectDir: string): Config {
  return {
    workingDir: projectDir,
    languages: args.languages || [],
    maxDepth: args.maxDepth || DIRECTORIES.DEFAULT_MAX_DEPTH,
    ignoreDirs: args.ignoreDirs || DEFAULT_IGNORE_DIRS,
  }
}

/**
 * Create and initialize project with TreeManager
 */
export async function createAndInitializeProject(context: ProjectInitContext): Promise<void> {
  const { args, treeManager, config } = context

  // Create project with TreeManager
  const project = treeManager.createProject(args.projectId, config)

  // Initialize project if not already initialized
  if (!project.initialized) {
    await treeManager.initializeProject(args.projectId)
  }
}

/**
 * Setup file watching if enabled
 */
export function setupFileWatching(context: ProjectInitContext): void {
  const { args, fileWatcher, config } = context

  if (args.autoWatch !== false) {
    fileWatcher.startWatching(args.projectId, config)
  }
}