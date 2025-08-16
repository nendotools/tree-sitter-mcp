/**
 * Project directory resolution and mono-repo detection
 */

import { resolve } from 'path'
import { findProjectRoot, findProjectRootWithMonoRepo } from '../../../utils/project-detection.js'
import { getLogger } from '../../../utils/logger.js'
import type { MonoRepoInfo } from './types.js'

/**
 * Resolve project directory from args or find project root
 */
export function resolveProjectDirectory(directory?: string): string {
  return directory ? resolve(directory) : findProjectRoot()
}

/**
 * Detect mono-repo structure and sub-projects
 */
export async function detectMonoRepoStructure(directory?: string): Promise<MonoRepoInfo> {
  const monoRepoInfo = await findProjectRootWithMonoRepo(directory)
  const logger = getLogger()

  if (monoRepoInfo.isMonoRepo && monoRepoInfo.subProjects.length > 0) {
    logger.info(`Detected mono-repo with ${monoRepoInfo.subProjects.length} sub-projects`)
    for (const subProject of monoRepoInfo.subProjects) {
      logger.info(`  • ${subProject.path}: ${subProject.languages.join(', ')}`)
    }
  }

  return monoRepoInfo
}

/**
 * Resolve directory and detect mono-repo in one step
 */
export async function resolveDirectoryAndDetectMonoRepo(directory?: string): Promise<{
  projectDir: string
  monoRepoInfo: MonoRepoInfo
}> {
  const projectDir = resolveProjectDirectory(directory)
  const monoRepoInfo = await detectMonoRepoStructure(directory)

  const logger = getLogger()
  logger.info(`Using project directory: ${projectDir}`)

  return { projectDir, monoRepoInfo }
}