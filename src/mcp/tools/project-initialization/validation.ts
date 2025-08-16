/**
 * Project initialization validation utilities
 */

import { EnhancedErrorFactory } from '../../../core/error-handling/index.js'
import type { InitializeProjectArgs } from './types.js'
import type { TreeManager } from '../../../core/tree-manager.js'

/**
 * Validate project ID
 */
export function validateProjectId(projectId: string): void {
  if (!projectId || projectId.trim().length === 0) {
    throw EnhancedErrorFactory.validation.parameterInvalid('projectId', projectId, 'string')
  }
}

/**
 * Check if project already exists
 */
export function validateProjectNotExists(projectId: string, treeManager: TreeManager): void {
  if (treeManager.getProject(projectId)) {
    throw EnhancedErrorFactory.project.alreadyExists(projectId)
  }
}

/**
 * Validate directory exists
 */
export async function validateDirectoryExists(projectDir: string): Promise<void> {
  try {
    await import('fs/promises').then(fs => fs.access(projectDir))
  }
  catch {
    throw EnhancedErrorFactory.filesystem.directoryNotFound(projectDir)
  }
}

/**
 * Validate all project initialization prerequisites
 */
export async function validateProjectInitialization(
  args: InitializeProjectArgs,
  treeManager: TreeManager,
  projectDir: string,
): Promise<void> {
  validateProjectId(args.projectId)
  validateProjectNotExists(args.projectId, treeManager)
  await validateDirectoryExists(projectDir)
}