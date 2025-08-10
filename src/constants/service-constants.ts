/**
 * Service configuration constants
 */

// Service metadata
export const SERVICE = {
  NAME: 'tree-sitter-mcp',
  VERSION: '1.0.0',
  DESCRIPTION: 'Fast in-memory code search and analysis MCP service',
} as const

// Memory management configuration
export const MEMORY = {
  MAX_PROJECTS: 4,
  MAX_MEMORY_MB: 1024,
  EVICTION_POLICY: 'LRU',
  DEFAULT_NODE_SIZE_BYTES: 500,
  DEFAULT_INDEX_ENTRY_BYTES: 50,
} as const

// File watching configuration
export const WATCHER = {
  POLL_INTERVAL_MS: 2000,
  DEBOUNCE_MS: 500,
  MAX_FILE_SIZE_MB: 10,
} as const

// Directory configuration
export const DIRECTORIES = {
  DEFAULT_WORKING_DIR: '.',
  DEFAULT_MAX_DEPTH: 10,
} as const

// Default directories to ignore (mutable array for compatibility)
export const DEFAULT_IGNORE_DIRS = [
  '.git',
  'node_modules',
  '.node_modules',
  'vendor',
  'target',
  'build',
  'dist',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'tmp',
  'temp',
  'logs',
]
