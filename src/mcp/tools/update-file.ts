/**
 * Update File tool implementation
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { SUCCESS } from '../../constants/index.js';
import type { UpdateFileArgs } from '../../types/index.js';
import { TreeManager } from '../../core/tree-manager.js';
import { getLogger } from '../../utils/logger.js';

export async function updateFile(
  args: UpdateFileArgs,
  treeManager: TreeManager
): Promise<TextContent> {
  const logger = getLogger();

  try {
    // Check if project exists
    const project = treeManager.getProject(args.projectId);
    if (!project) {
      throw new Error(`Project "${args.projectId}" not found. Initialize it first with initialize_project.`);
    }

    // Update the file
    await treeManager.updateFile(args.projectId, args.filePath);

    return {
      type: 'text',
      text: `✅ ${SUCCESS.FILE_UPDATED}\n\nFile: ${args.filePath}\nProject: ${args.projectId}`,
    };
  } catch (error) {
    logger.error('Failed to update file:', error);
    throw error;
  }
}