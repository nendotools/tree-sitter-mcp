/**
 * Simplified MCP server - streamlined from complex server implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { analyzeProject } from '../analysis/index.js'
import { handleToolRequest } from './handlers.js'
import { MCP_TOOLS, MCP_RESOURCES } from './schemas.js'
import { getLogger } from '../utils/logger.js'
import { handleError } from '../utils/errors.js'
import { getVersion } from '../utils/version.js'
import type { JsonObject } from '../types/core.js'

/**
 * Starts the MCP server with stdio transport
 */
export async function startMCPServer(): Promise<void> {
  const logger = getLogger()

  try {
    const server = new Server(
      {
        name: 'tree-sitter-mcp',
        version: getVersion(),
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      },
    )

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MCP_TOOLS,
    }))

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const toolRequest = {
          ...request,
          params: {
            ...request.params,
            arguments: request.params.arguments as JsonObject,
          },
        }
        return await handleToolRequest(toolRequest)
      }
      catch (error) {
        logger.error('Tool request failed:', error)
        throw handleError(error, `Tool request failed: ${request.params.name}`)
      }
    })

    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: MCP_RESOURCES,
    }))

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const uri = request.params.uri

        if (uri.startsWith('analysis://')) {
          const projectPath = uri.replace('analysis://', '')

          const result = await analyzeProject(projectPath, {
            includeQuality: true,
            includeDeadcode: true,
            includeStructure: true,
          })

          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2),
            }],
          }
        }

        throw new Error(`Unknown resource: ${uri}`)
      }
      catch (error) {
        logger.error('Resource request failed:', error)
        throw handleError(error, `Resource request failed: ${request.params.uri}`)
      }
    })

    const transport = new StdioServerTransport()
    await server.connect(transport)

    logger.info('MCP server started successfully')
  }
  catch (error) {
    logger.error('Failed to start MCP server:', error)
    throw handleError(error, 'Failed to start MCP server')
  }
}