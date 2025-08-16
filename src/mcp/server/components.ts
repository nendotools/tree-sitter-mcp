/**
 * MCP server components factory
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { TreeManager } from '../../core/tree-manager.js'
import { BatchFileWatcher } from '../../core/file-watcher.js'
import { getParserRegistry } from '../../parsers/registry.js'

export interface ServerComponents {
  server: Server
  treeManager: TreeManager
  fileWatcher: BatchFileWatcher
}

export function createServerComponents(): ServerComponents {
  const parserRegistry = getParserRegistry()
  const treeManager = new TreeManager(parserRegistry)
  const fileWatcher = new BatchFileWatcher(treeManager)
  const server = new Server(
    {
      name: 'tree-sitter-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  return {
    server,
    treeManager,
    fileWatcher,
  }
}