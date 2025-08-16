/**
 * Search Code tool handler
 */

import type { SearchCodeArgs } from '../../../types/index.js'
import type { ToolHandler } from '../tool-registry.js'
import * as tools from '../../tools/index.js'

export const searchCodeHandler: ToolHandler<SearchCodeArgs> = {
  validate: (args: unknown): args is SearchCodeArgs => {
    if (typeof args !== 'object' || args === null) return false
    const obj = args as Record<string, unknown>

    return typeof obj.projectId === 'string'
      && typeof obj.query === 'string'
      && (obj.types === undefined || Array.isArray(obj.types))
      && (obj.languages === undefined || Array.isArray(obj.languages))
      && (obj.pathPattern === undefined || typeof obj.pathPattern === 'string')
      && (obj.maxResults === undefined || typeof obj.maxResults === 'number')
      && (obj.exactMatch === undefined || typeof obj.exactMatch === 'boolean')
      && (obj.caseSensitive === undefined || typeof obj.caseSensitive === 'boolean')
      && (obj.priorityType === undefined || typeof obj.priorityType === 'string')
      && (obj.fuzzyThreshold === undefined || typeof obj.fuzzyThreshold === 'number')
      && (obj.subProjects === undefined || Array.isArray(obj.subProjects))
      && (obj.excludeSubProjects === undefined || Array.isArray(obj.excludeSubProjects))
      && (obj.crossProjectSearch === undefined || typeof obj.crossProjectSearch === 'boolean')
  },

  execute: async (args, deps) => {
    return tools.searchCode(args, deps.treeManager, deps.fileWatcher)
  },
}