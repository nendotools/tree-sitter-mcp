/**
 * MCP server signal handlers factory
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { Logger } from '../../types/cli-types.js'
import type { BatchFileWatcher } from '../../core/file-watcher.js'

export function setupSignalHandlers(
  server: Server,
  fileWatcher: BatchFileWatcher,
  logger: Logger,
): void {
  // Handle shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down MCP server...')
    fileWatcher.stopAll()
    void server.close().then(() => {
      process.exit(0)
    })
  })

  process.on('SIGTERM', () => {
    logger.info('Shutting down MCP server...')
    fileWatcher.stopAll()
    void server.close().then(() => {
      process.exit(0)
    })
  })
}