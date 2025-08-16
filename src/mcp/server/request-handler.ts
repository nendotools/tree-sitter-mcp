/**
 * MCP tool request handler using registry pattern
 */

import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { ToolRegistry, type ToolDependencies } from './tool-registry.js'
import { MCP_TOOLS } from '../../constants/app-constants.js'
import { formatError } from '../../types/error-types.js'
import {
  initializeProjectHandler,
  searchCodeHandler,
  findUsageHandler,
  analyzeCodeHandler,
  updateFileHandler,
  projectStatusHandler,
  destroyProjectHandler,
} from './handlers/index.js'

// MCP Request type (what we actually receive from the SDK)
interface McpRequest {
  params: {
    name: string
    arguments?: Record<string, unknown>
    _meta?: any
  }
}

// MCP Response type (flexible to match SDK expectations)
interface McpResponse {
  content: TextContent[]
  isError?: boolean
  [key: string]: unknown
}

export function createToolRequestHandler(deps: ToolDependencies) {
  const registry = new ToolRegistry()

  // Register all tool handlers (self-contained, no switch statement)
  registry.register(MCP_TOOLS.INITIALIZE_PROJECT, initializeProjectHandler)
  registry.register(MCP_TOOLS.SEARCH_CODE, searchCodeHandler)
  registry.register(MCP_TOOLS.FIND_USAGE, findUsageHandler)
  registry.register(MCP_TOOLS.ANALYZE_CODE, analyzeCodeHandler)
  registry.register(MCP_TOOLS.UPDATE_FILE, updateFileHandler)
  registry.register(MCP_TOOLS.PROJECT_STATUS, projectStatusHandler)
  registry.register(MCP_TOOLS.DESTROY_PROJECT, destroyProjectHandler)

  return async (request: McpRequest): Promise<McpResponse> => {
    const { name, arguments: args = {} } = request.params

    deps.logger.debug(`Tool called: ${name}`, args)

    try {
      const result = await registry.execute(name, args, deps)
      return { content: [result] }
    }
    catch (error) {
      deps.logger.error(`Tool error (${name}):`, error)

      const structuredError = formatError(error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredError, null, 2),
          },
        ],
        isError: true,
      }
    }
  }
}