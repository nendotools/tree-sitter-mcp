/**
 * CLI and logging constants
 */

// CLI command-line flags
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
} as const;

// Log levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
} as const;
