/**
 * Search code validation functions
 */

import type { SearchCodeArgs } from '../../../types/index.js'
import type { TreeManager } from '../../../core/tree-manager.js'
import { EnhancedErrorFactory } from '../../../core/error-handling/index.js'

export function validateSearchArgs(args: SearchCodeArgs): void {
  // Validate required parameters
  if (!args.projectId || args.projectId.trim().length === 0) {
    throw EnhancedErrorFactory.validation.parameterInvalid('projectId', args.projectId, 'string')
  }

  // Allow empty query if pathPattern is provided for file-only searches
  if ((!args.query || args.query.trim().length === 0) && !args.pathPattern) {
    throw EnhancedErrorFactory.search.invalidQuery(args.query || 'empty', 'Query is required when no path pattern is provided')
  }
}

export function validateProject(args: SearchCodeArgs, treeManager: TreeManager) {
  const project = treeManager.getProject(args.projectId)

  if (!project) {
    throw EnhancedErrorFactory.project.notFound(
      args.projectId,
      ['You must initialize the project first using the initialize_project tool.',
        'Example:',
        `{"projectId": "${args.projectId}", "directory": "."}`,
        'This ensures proper project root detection and avoids initialization failures.'],
    )
  }

  if (!project.initialized) {
    throw EnhancedErrorFactory.project.notInitialized(
      args.projectId,
      'Project exists but is not initialized. This should not happen - please destroy and recreate the project.',
    )
  }

  return project
}