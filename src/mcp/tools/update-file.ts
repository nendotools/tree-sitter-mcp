/**
 * Update File tool implementation
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import chalk from 'chalk'
import { SUCCESS_MESSAGES as SUCCESS } from '../../constants/app-constants.js'
import type { UpdateFileArgs } from '../../types/index.js'
import { ErrorFactory } from '../../types/error-types.js'
import { TreeManager } from '../../core/tree-manager.js'
import { getLogger } from '../../utils/logger.js'

export async function updateFile(
  args: UpdateFileArgs,
  treeManager: TreeManager,
): Promise<TextContent> {
  const logger = getLogger()

  try {
    // Validate parameters
    if (!args.projectId || args.projectId.trim().length === 0) {
      throw ErrorFactory.validationError('projectId', args.projectId)
    }

    if (!args.filePath || args.filePath.trim().length === 0) {
      throw ErrorFactory.validationError('filePath', args.filePath)
    }

    // Check if project exists
    const project = treeManager.getProject(args.projectId)
    if (!project) {
      throw ErrorFactory.projectNotFound(args.projectId)
    }

    // Update the file
    await treeManager.updateFile(args.projectId, args.filePath)

    return {
      type: 'text',
      text: `${chalk.green('[OK]')} ${SUCCESS.FILE_UPDATED}\n\nFile: ${args.filePath}\nProject: ${args.projectId}`,
    }
  }
  catch (error) {
    logger.error('Failed to update file:', error)

    // Re-throw structured errors as-is
    if (error instanceof Error && error.name === 'McpOperationError') {
      throw error
    }

    // Wrap other errors in a system error
    throw ErrorFactory.systemError(
      'file update',
      error instanceof Error ? error.message : String(error),
    )
  }
}
