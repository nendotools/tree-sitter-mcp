/**
 * Main entry point for the simplified tree-sitter MCP system
 */

export * from './core/parser.js'
export * from './core/search.js'
export * from './core/file-walker.js'
export * from './core/watcher.js'

export * from './import/resolver.js'
export * from './import/strategies.js'
export * from './import/validation.js'

export * from './analysis/index.js'
export * from './analysis/quality.js'
export * from './analysis/deadcode.js'
export * from './analysis/structure.js'

export * from './project/manager.js'
export * from './project/monorepo.js'
export * from './project/memory.js'

export * from './mcp/server.js'
export * from './mcp/handlers.js'
export * from './mcp/schemas.js'

export * from './cli/index.js'
export * from './cli/commands.js'

export * from './utils/errors.js'
export * from './utils/logger.js'
export * from './utils/helpers.js'

export * from './types/core.js'
export * from './types/analysis.js'

export { createCLI } from './cli/index.js'
export { startMCPServer } from './mcp/server.js'
export { analyzeProject } from './analysis/index.js'