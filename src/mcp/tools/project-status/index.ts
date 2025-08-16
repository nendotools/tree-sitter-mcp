/**
 * Project status orchestrator
 */

import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { ProjectStatusArgs } from '../../../types/index.js'
import type { TreeManager } from '../../../core/tree-manager.js'
import type { BatchFileWatcher } from '../../../core/file-watcher.js'
import type { ProjectStatusContext, StatusFormatter } from './types.js'
import { validateProjectExists, validateProjectsExist } from './validation.js'
import { SingleProjectFormatter } from './single-project.js'
import { AllProjectsFormatter } from './all-projects.js'
import { withErrorHandling } from './error-handling.js'

/**
 * Available status formatters
 */
const STATUS_FORMATTERS: StatusFormatter[] = [
  new SingleProjectFormatter(),
  new AllProjectsFormatter(),
]

/**
 * Get project status using modular status formatters
 */
export function projectStatus(
  args: ProjectStatusArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): TextContent {
  return withErrorHandling(() => {
    const context: ProjectStatusContext = {
      args,
      treeManager,
      fileWatcher,
    }

    // Validate project exists (if specific project requested)
    const projectValidation = validateProjectExists(context)
    if (!projectValidation.isValid) {
      return projectValidation.response!
    }

    // Validate projects exist (if all projects requested)
    const projectsValidation = validateProjectsExist(context)
    if (!projectsValidation.isValid) {
      return projectsValidation.response!
    }

    // Find appropriate formatter
    const formatter = STATUS_FORMATTERS.find(f => f.canHandle(context))
    if (!formatter) {
      throw new Error('No suitable status formatter found')
    }

    // Format and return status
    return formatter.format(context)
  })
}

// Re-export types for external use
export type {
  ProjectStatusContext,
  StatusFormatter,
  SingleProjectStatus,
  AllProjectsStatus,
} from './types.js'