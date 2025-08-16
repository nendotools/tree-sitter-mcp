/**
 * Initialize Project tool handler
 */

import type { InitializeProjectArgs } from '../../../types/index.js'
import type { ToolHandler } from '../tool-registry.js'
import * as tools from '../../tools/index.js'

export const initializeProjectHandler: ToolHandler<InitializeProjectArgs> = {
  validate: (args: unknown): args is InitializeProjectArgs => {
    if (typeof args !== 'object' || args === null) return false
    const obj = args as Record<string, unknown>

    return typeof obj.projectId === 'string'
      && (obj.directory === undefined || typeof obj.directory === 'string')
      && (obj.languages === undefined || Array.isArray(obj.languages))
      && (obj.maxDepth === undefined || typeof obj.maxDepth === 'number')
      && (obj.ignoreDirs === undefined || Array.isArray(obj.ignoreDirs))
      && (obj.autoWatch === undefined || typeof obj.autoWatch === 'boolean')
  },

  execute: async (args, deps) => {
    return tools.initializeProject(args, deps.treeManager, deps.fileWatcher)
  },
}