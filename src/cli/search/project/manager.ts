/**
 * CLI-specific project lifecycle management
 */

import type { Config } from '../../../types/index.js'
import type { TreeManager } from '../../../core/tree-manager.js'

export const SEARCH_PROJECT_ID = 'search'

/**
 * Initialize a temporary project for CLI search operations
 */
export async function initializeSearchProject(
  treeManager: TreeManager,
  config: Config,
): Promise<string> {
  const projectId = SEARCH_PROJECT_ID

  await treeManager.createProject(projectId, config)
  await treeManager.initializeProject(projectId)

  return projectId
}

/**
 * Clean up temporary search project resources
 */
export async function cleanupSearchProject(treeManager: TreeManager): Promise<void> {
  try {
    // Clean up the temporary search project if it exists
    await treeManager.destroyProject(SEARCH_PROJECT_ID)
  }
  catch {
    // Ignore cleanup errors - project might not exist
  }
}

/**
 * Create TreeManager instance with parser registry
 */
export async function createTreeManager(): Promise<TreeManager> {
  const { TreeManager } = await import('../../../core/tree-manager.js')
  const { getParserRegistry } = await import('../../../parsers/registry.js')

  const parserRegistry = getParserRegistry()
  return new TreeManager(parserRegistry)
}