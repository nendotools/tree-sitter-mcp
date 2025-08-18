/**
 * Persistence and caching constants
 */

export const PERSISTENCE_CONFIG = {
  MAX_PROJECTS: 10,
  PROJECT_ID_HASH_LENGTH: 8,
  DEFAULT_WATCH_DEBOUNCE_MS: 300,
  LRU_CLEANUP_THRESHOLD: 0.8,
} as const

export const PROJECT_ID_PATTERNS = {
  INVALID_CHARS: /[^a-zA-Z0-9\-_]/g,
  COLLISION_SEPARATOR: '-',
  MAX_LENGTH: 64,
} as const

export const WATCH_CONFIG = {
  IGNORED_PATTERNS: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.cache/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.nyc_output/**',
  ],
  DEBOUNCE_MS: 300,
  PERSISTENT: true,
  IGNORE_INITIAL: true,
} as const

export const MEMORY_LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_NODES_PER_FILE: 50000,
  ESTIMATED_BYTES_PER_NODE: 100,
  ESTIMATED_BYTES_PER_FILE: 1000,
} as const