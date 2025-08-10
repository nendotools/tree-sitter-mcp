/**
 * Tree-sitter and AST related constants
 */

// Node types in the AST
export const NODE_TYPES = {
  FILE: 'file',
  DIRECTORY: 'directory',
  CLASS: 'class',
  INTERFACE: 'interface',
  STRUCT: 'struct',
  FUNCTION: 'function',
  METHOD: 'method',
  VARIABLE: 'variable',
  CONSTANT: 'constant',
  ENUM: 'enum',
  TYPE: 'type',
  IMPORT: 'import',
  EXPORT: 'export',
} as const

// Language to file extension mappings
export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  python: ['.py', '.pyi'],
  go: ['.go'],
  rust: ['.rs'],
  java: ['.java'],
  c: ['.c', '.h'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.h', '.hxx'],
  ruby: ['.rb'],
  csharp: ['.cs'],
  php: ['.php', '.phtml'],
  kotlin: ['.kt', '.kts'],
  scala: ['.scala', '.sc'],
  elixir: ['.ex', '.exs'],
  vue: ['.vue'],
} as const

// Search configuration
export const SEARCH = {
  DEFAULT_MAX_RESULTS: 20,
  MAX_ALLOWED_RESULTS: 100,
  SCORE_EXACT_MATCH: 100,
  SCORE_PREFIX_MATCH: 75,
  SCORE_CONTAINS_MATCH: 50,
  SCORE_BOOST_CLASS: 10,
  SCORE_BOOST_FUNCTION: 5,
} as const

// Usage search configuration
export const USAGE_SEARCH = {
  DEFAULT_CONTEXT_LINES: 10,
  MAX_LINE_LENGTH_DISPLAY: 200,
  FUNCTION_PATTERNS: ['function', 'def', 'fn', 'func', 'const', 'let', 'var'],
  CLASS_PATTERNS: ['class', 'interface', 'struct'],
} as const

// File change event types
export const CHANGE_EVENTS = {
  CREATED: 'created',
  MODIFIED: 'modified',
  DELETED: 'deleted',
} as const
