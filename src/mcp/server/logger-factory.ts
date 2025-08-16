/**
 * MCP server logger configuration factory
 */

import { resolve } from 'path'
import { findProjectRoot } from '../../utils/project-detection.js'
import { initializeLogger, getLogger } from '../../utils/logger.js'
import { LOG_LEVELS } from '../../constants/app-constants.js'
import type { Logger } from '../../types/cli-types.js'

export async function createMCPServerLogger(): Promise<Logger> {
  // Enable debug logging if TREE_SITTER_MCP_DEBUG environment variable is set
  const enableDebugLogging = process.env.TREE_SITTER_MCP_DEBUG === 'true'

  // Always write startup debug info to a global log file for Claude Code troubleshooting
  await writeStartupDebugInfo()

  // Configure logger for MCP server mode
  if (enableDebugLogging) {
    const projectRoot = findProjectRoot()
    const logFilePath = resolve(projectRoot, 'logs', 'mcp-server.log')
    initializeLogger({
      level: LOG_LEVELS.VERBOSE,
      logToFile: true,
      logFilePath,
      useColors: false,
    })
    const logger = getLogger()
    logger.info('Starting MCP server with debug file logging enabled')
    logger.info(`Process cwd: ${process.cwd()}`)
    logger.info(`Log file: ${logFilePath}`)
  }
  else {
    // Use existing logger configuration or create a default one
    initializeLogger({
      level: LOG_LEVELS.INFO,
      logToFile: false,
      useColors: false,
    })
    const logger = getLogger()
    logger.info('Starting MCP server')
  }

  return getLogger()
}

async function writeStartupDebugInfo(): Promise<void> {
  const { homedir } = await import('os')
  const globalLogPath = resolve(homedir(), '.tree-sitter-mcp-debug.log')
  const timestamp = new Date().toISOString()
  const startupInfo = `[${timestamp}] MCP Server Startup:
  - Mode: MCP Server (confirmed)
  - CWD: ${process.cwd()}
  - Args: ${JSON.stringify(process.argv)}
  - stdin.isTTY: ${process.stdin.isTTY}
  - stdout.isTTY: ${process.stdout.isTTY}
  - stderr.isTTY: ${process.stderr.isTTY}
  - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}
  - TREE_SITTER_MCP_DEBUG: ${process.env.TREE_SITTER_MCP_DEBUG || 'undefined'}
  - Parent PID: ${process.ppid || 'undefined'}
  - Process Title: ${process.title || 'undefined'}
\n`

  try {
    const { appendFileSync } = await import('fs')
    appendFileSync(globalLogPath, startupInfo)
  }
  catch {
    // Ignore write errors
  }
}