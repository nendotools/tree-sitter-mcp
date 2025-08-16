/**
 * Update File tool handler
 */

import type { UpdateFileArgs } from '../../../types/index.js'
import type { ToolHandler } from '../tool-registry.js'
import * as tools from '../../tools/index.js'

export const updateFileHandler: ToolHandler<UpdateFileArgs> = {
  validate: (args: unknown): args is UpdateFileArgs => {
    if (typeof args !== 'object' || args === null) return false
    const obj = args as Record<string, unknown>

    return typeof obj.projectId === 'string'
      && typeof obj.filePath === 'string'
      && (obj.force === undefined || typeof obj.force === 'boolean')
  },

  execute: async (args, deps) => {
    return tools.updateFile(args, deps.treeManager)
  },
}