/**
 * MCP Server implementation for Tree-Sitter service
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import type { Config } from '../types/index.js'
import {
  createMCPServerLogger,
  createServerComponents,
  createToolSchemas,
  createToolRequestHandler,
  setupSignalHandlers,
} from './server/index.js'

export async function startMCPServer(_config: Config): Promise<void> {
  // Initialize logger with debug configuration
  const logger = await createMCPServerLogger()

  // Create server components (TreeManager, FileWatcher, Server)
  const { server, treeManager, fileWatcher } = createServerComponents()

  // Set up tool schemas
  const toolSchemas = createToolSchemas()
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: toolSchemas,
    }
  })

  // Set up tool request handler
  const toolRequestHandler = createToolRequestHandler({
    treeManager,
    fileWatcher,
    logger,
  })
  server.setRequestHandler(CallToolRequestSchema, toolRequestHandler)

  // Set up signal handlers for graceful shutdown
  setupSignalHandlers(server, fileWatcher, logger)

  // Start the server
  const transport = new StdioServerTransport()
  logger.info('Starting Tree-Sitter MCP server...')
  await server.connect(transport)
  logger.info('MCP server started successfully')
}