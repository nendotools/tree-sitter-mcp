/**
 * MCP Server implementation for Tree-Sitter service
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { resolve } from 'path'
import { findProjectRoot } from '../utils/project-detection.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js'

import { MCP_TOOLS } from '../constants/index.js'
import type {
  Config,
  InitializeProjectArgs,
  SearchCodeArgs,
  FindUsageArgs,
  UpdateFileArgs,
  ProjectStatusArgs,
  DestroyProjectArgs,
} from '../types/index.js'
import { formatError } from '../types/error-types.js'
import { setLogger, ConsoleLogger } from '../utils/logger.js'
import { LOG_LEVELS } from '../constants/cli-constants.js'
import { TreeManager } from '../core/tree-manager.js'
import { BatchFileWatcher } from '../core/file-watcher.js'
import { getParserRegistry } from '../parsers/registry.js'
import * as tools from './tools/index.js'

export async function startMCPServer(_config: Config): Promise<void> {
  // Enable debug logging if TREE_SITTER_MCP_DEBUG environment variable is set
  const enableDebugLogging = process.env.TREE_SITTER_MCP_DEBUG === 'true'

  // Always write startup debug info to a global log file for Claude Code troubleshooting
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

  let logger: ConsoleLogger
  if (enableDebugLogging) {
    const projectRoot = findProjectRoot()
    const logFilePath = resolve(projectRoot, 'logs', 'mcp-server.log')
    logger = new ConsoleLogger({
      level: LOG_LEVELS.VERBOSE,
      logToFile: true,
      logFilePath,
      useColors: false,
    })
    setLogger(logger)
    logger.info('Starting MCP server with debug file logging enabled')
    logger.info(`Process cwd: ${process.cwd()}`)
    logger.info(`Log file: ${logFilePath}`)
  }
  else {
    logger = new ConsoleLogger({
      level: LOG_LEVELS.INFO,
      logToFile: false,
      useColors: false,
    })
    setLogger(logger)
    logger.info('Starting MCP server')
  }

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

  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: [
        {
          name: MCP_TOOLS.INITIALIZE_PROJECT,
          description:
            'Pre-cache a project structure for faster searches and enable file watching. Optional performance optimization - search_code auto-initializes projects when needed.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Unique identifier for the project',
              },
              directory: {
                type: 'string',
                description: 'Directory to analyze (default: current directory)',
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of languages to parse (empty = all)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum directory depth to traverse',
              },
              ignoreDirs: {
                type: 'array',
                items: { type: 'string' },
                description: 'Directories to ignore during analysis',
              },
              autoWatch: {
                type: 'boolean',
                description: 'Automatically watch for file changes',
              },
            },
            required: ['projectId'],
          },
        },
        {
          name: MCP_TOOLS.SEARCH_CODE,
          description:
            'Find code elements semantically with AST parsing precision and intelligent fuzzy matching. Supports exact matches, prefix matching, word boundaries, and character sequences. Use this INSTEAD of grep/find commands for discovering functions, classes, methods, interfaces, or variables. Provides exact definitions with context.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Project to search in',
              },
              query: {
                type: 'string',
                description: 'Search query (name of element)',
              },
              types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by element types',
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by programming languages',
              },
              pathPattern: {
                type: 'string',
                description: 'Filter by file path pattern',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results',
              },
              exactMatch: {
                type: 'boolean',
                description: 'Require exact name match',
              },
              subProjects: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific sub-projects to search within (mono-repo)',
              },
              excludeSubProjects: {
                type: 'array',
                items: { type: 'string' },
                description: 'Sub-projects to exclude from search (mono-repo)',
              },
              crossProjectSearch: {
                type: 'boolean',
                description: 'Search across multiple sub-projects (mono-repo)',
              },
              priorityType: {
                type: 'string',
                description: 'Boost specific element types in search ranking (function, method, class, interface, variable)',
              },
              fuzzyThreshold: {
                type: 'number',
                description: 'Minimum fuzzy match score to include results (default: 30)',
              },
            },
            required: ['projectId', 'query'],
          },
        },
        {
          name: MCP_TOOLS.FIND_USAGE,
          description:
            'ESSENTIAL for refactoring impact analysis and dependency mapping. Find every usage of any identifier across the codebase with containing function context. Use this BEFORE modifying any code element to understand the complete impact scope.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Project to search in',
              },
              identifier: {
                type: 'string',
                description: 'Function, variable, class, or identifier name to find usage of',
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by programming languages',
              },
              pathPattern: {
                type: 'string',
                description: 'Filter by file path pattern',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results',
              },
              exactMatch: {
                type: 'boolean',
                description: 'Require exact identifier match (word boundaries)',
              },
              caseSensitive: {
                type: 'boolean',
                description: 'Case sensitive search',
              },
            },
            required: ['projectId', 'identifier'],
          },
        },
        {
          name: MCP_TOOLS.UPDATE_FILE,
          description:
            'Force re-parsing of a specific file when search results seem outdated. Use after file modifications to ensure search accuracy.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Project containing the file',
              },
              filePath: {
                type: 'string',
                description: 'Path to the file to update',
              },
            },
            required: ['projectId', 'filePath'],
          },
        },
        {
          name: MCP_TOOLS.PROJECT_STATUS,
          description:
            'Check project initialization status, memory usage, and parsing statistics. Use to verify projects are properly indexed before searching.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Specific project ID (empty for all projects)',
              },
              includeStats: {
                type: 'boolean',
                description: 'Include detailed statistics',
              },
            },
          },
        },
        {
          name: MCP_TOOLS.DESTROY_PROJECT,
          description:
            'Clean up project from memory when switching between codebases. Use for memory management in long-running analysis sessions.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Project to destroy',
              },
            },
            required: ['projectId'],
          },
        },
      ] as Tool[],
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    logger.debug(`Tool called: ${name}`, args)

    try {
      let result: TextContent

      switch (name) {
        case MCP_TOOLS.INITIALIZE_PROJECT:
          result = await tools.initializeProject(
            args as unknown as InitializeProjectArgs,
            treeManager,
            fileWatcher,
          )
          break

        case MCP_TOOLS.SEARCH_CODE:
          result = await tools.searchCode(
            args as unknown as SearchCodeArgs,
            treeManager,
            fileWatcher,
          )
          break

        case MCP_TOOLS.FIND_USAGE:
          result = await tools.findUsage(
            args as unknown as FindUsageArgs,
            treeManager,
            fileWatcher,
          )
          break

        case MCP_TOOLS.UPDATE_FILE:
          result = await tools.updateFile(args as unknown as UpdateFileArgs, treeManager)
          break

        case MCP_TOOLS.PROJECT_STATUS:
          result = tools.projectStatus(
            args as unknown as ProjectStatusArgs,
            treeManager,
            fileWatcher,
          )
          break

        case MCP_TOOLS.DESTROY_PROJECT:
          result = tools.destroyProject(
            args as unknown as DestroyProjectArgs,
            treeManager,
            fileWatcher,
          )
          break

        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [result],
      }
    }
    catch (error) {
      logger.error(`Tool error (${name}):`, error)

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
  })

  const transport = new StdioServerTransport()

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

  logger.info('Starting Tree-Sitter MCP server...')
  await server.connect(transport)
  logger.info('MCP server started successfully')
}
