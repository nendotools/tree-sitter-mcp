/**
 * Project Status tool handler
 */

import type { ProjectStatusArgs } from '../../../types/index.js'
import type { ToolHandler } from '../tool-registry.js'
import * as tools from '../../tools/index.js'

export const projectStatusHandler: ToolHandler<ProjectStatusArgs> = {
  validate: (args: unknown): args is ProjectStatusArgs => {
    if (typeof args !== 'object' || args === null) return false
    const obj = args as Record<string, unknown>

    return typeof obj.projectId === 'string'
      && (obj.includeStats === undefined || typeof obj.includeStats === 'boolean')
  },

  execute: async (args, deps) => {
    return tools.projectStatus(args, deps.treeManager, deps.fileWatcher)
  },
}