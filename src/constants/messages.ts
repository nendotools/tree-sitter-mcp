/**
 * User-facing messages and strings
 */

// Error messages
export const ERRORS = {
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

// Success messages
export const SUCCESS = {
  PROJECT_INITIALIZED: 'Project initialized successfully',
  PROJECT_DESTROYED: 'Project destroyed successfully',
  FILE_UPDATED: 'File updated successfully',
  WATCHER_STARTED: 'File watcher started',
  WATCHER_STOPPED: 'File watcher stopped',
  SETUP_COMPLETE: 'Setup completed successfully',
} as const
