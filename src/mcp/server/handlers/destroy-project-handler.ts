/**
 * Destroy Project tool handler
 */

import type { DestroyProjectArgs } from '../../../types/index.js'
import type { ToolHandler } from '../tool-registry.js'
import * as tools from '../../tools/index.js'

export const destroyProjectHandler: ToolHandler<DestroyProjectArgs> = {
  validate: (args: unknown): args is DestroyProjectArgs => {
    if (typeof args !== 'object' || args === null) return false
    const obj = args as Record<string, unknown>

    return typeof obj.projectId === 'string'
  },

  execute: async (args, deps) => {
    return tools.destroyProject(args, deps.treeManager, deps.fileWatcher)
  },
}