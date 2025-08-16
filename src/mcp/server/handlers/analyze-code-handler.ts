/**
 * Analyze Code tool handler
 */

import type { AnalyzeCodeArgs } from '../../../types/index.js'
import type { ToolHandler } from '../tool-registry.js'
import * as tools from '../../tools/index.js'

export const analyzeCodeHandler: ToolHandler<AnalyzeCodeArgs> = {
  validate: (args: unknown): args is AnalyzeCodeArgs => {
    if (typeof args !== 'object' || args === null) return false
    const obj = args as Record<string, unknown>

    return typeof obj.projectId === 'string'
      && Array.isArray(obj.analysisTypes)
      && typeof obj.scope === 'string'
      && (obj.target === undefined || typeof obj.target === 'string')
      && (obj.severity === undefined || typeof obj.severity === 'string')
      && (obj.includeMetrics === undefined || typeof obj.includeMetrics === 'boolean')
      && (obj.directory === undefined || typeof obj.directory === 'string')
  },

  execute: async (args, deps) => {
    return tools.analyzeCode(args, deps.treeManager)
  },
}