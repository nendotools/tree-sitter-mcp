/**
 * Application-level constants for CLI, MCP protocol, and user messages
 */

// =============================================================================
// CLI CONSTANTS
// =============================================================================

/** Command-line interface flags and options */
export const CLI_FLAGS = {
  MCP: '--mcp',
  CONFIG: '--config',
  VERSION: '--version',
  HELP: '--help',
  DIR: '--dir',
  LANGUAGES: '--languages',
  MAX_DEPTH: '--max-depth',
  IGNORE: '--ignore',
  LIST_LANGUAGES: '--list-languages',
  VERBOSE: '--verbose',
  QUIET: '--quiet',
  SETUP: '--setup',
} as const

/** Available log levels for the application */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
} as const

// =============================================================================
// MCP PROTOCOL CONSTANTS
// =============================================================================

/** Model Context Protocol tool identifiers */
export const MCP_TOOLS = {
  INITIALIZE_PROJECT: 'initialize_project',
  SEARCH_CODE: 'search_code',
  FIND_USAGE: 'find_usage',
  UPDATE_FILE: 'update_file',
  PROJECT_STATUS: 'project_status',
  DESTROY_PROJECT: 'destroy_project',
  ANALYZE_CODE: 'analyze_code',
} as const

// =============================================================================
// USER MESSAGES
// =============================================================================

/** Error messages displayed to users */
export const ERROR_MESSAGES = {
  PROJECT_NOT_FOUND: 'Project not found',
  PROJECT_NOT_INITIALIZED: 'Project not initialized',
  INVALID_PROJECT_ID: 'Invalid project ID',
  MEMORY_LIMIT_EXCEEDED: 'Memory limit exceeded',
  FILE_TOO_LARGE: 'File too large to parse',
  NO_PARSER_AVAILABLE: 'No parser available for this file type',
  WATCHER_ALREADY_RUNNING: 'File watcher already running',
  WATCHER_NOT_RUNNING: 'File watcher not running',
  INITIALIZATION_FAILED: 'Failed to initialize project',
  SEARCH_FAILED: 'Search operation failed',
} as const

/** Success messages displayed to users */
export const SUCCESS_MESSAGES = {
  PROJECT_INITIALIZED: 'Project initialized successfully',
  PROJECT_DESTROYED: 'Project destroyed successfully',
  FILE_UPDATED: 'File updated successfully',
  WATCHER_STARTED: 'File watcher started',
  WATCHER_STOPPED: 'File watcher stopped',
  SETUP_COMPLETE: 'Setup completed successfully',
} as const