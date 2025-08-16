/**
 * Find Usage tool handler
 */

import type { FindUsageArgs } from '../../../types/index.js'
import type { ToolHandler } from '../tool-registry.js'
import * as tools from '../../tools/index.js'

export const findUsageHandler: ToolHandler<FindUsageArgs> = {
  validate: (args: unknown): args is FindUsageArgs => {
    if (typeof args !== 'object' || args === null) return false
    const obj = args as Record<string, unknown>

    return typeof obj.projectId === 'string'
      && typeof obj.identifier === 'string'
      && (obj.caseSensitive === undefined || typeof obj.caseSensitive === 'boolean')
      && (obj.exactMatch === undefined || typeof obj.exactMatch === 'boolean')
      && (obj.languages === undefined || Array.isArray(obj.languages))
      && (obj.maxResults === undefined || typeof obj.maxResults === 'number')
      && (obj.pathPattern === undefined || typeof obj.pathPattern === 'string')
  },

  execute: async (args, deps) => {
    return tools.findUsage(args, deps.treeManager, deps.fileWatcher)
  },
}