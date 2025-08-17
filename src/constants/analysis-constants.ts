/**
 * Code analysis and tree-sitter parsing constants
 */

// =============================================================================
// AST NODE TYPES
// =============================================================================

/** Tree-sitter AST node type identifiers */
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

/** File change event types for file watching */
export const CHANGE_EVENTS = {
  CREATED: 'created',
  MODIFIED: 'modified',
  DELETED: 'deleted',
} as const

// =============================================================================
// LANGUAGE MAPPINGS
// =============================================================================

/** Programming language to file extension mappings */
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
  html: ['.html', '.htm'],
  json: ['.json', '.json5', '.jsonc'],
  yaml: ['.yaml', '.yml'],
  toml: ['.toml'],
  env: ['.env*'],
} as const

// =============================================================================
// SEARCH CONFIGURATION
// =============================================================================

/** Code search scoring and limits */
export const SEARCH_CONFIG = {
  DEFAULT_MAX_RESULTS: 20,
  MAX_ALLOWED_RESULTS: 100,
  SCORE_EXACT_MATCH: 100,
  SCORE_PREFIX_MATCH: 75,
  SCORE_CONTAINS_MATCH: 50,
  SCORE_BOOST_CLASS: 10,
  SCORE_BOOST_FUNCTION: 5,
} as const

/** Usage search display and pattern configuration */
export const USAGE_CONFIG = {
  DEFAULT_CONTEXT_LINES: 10,
  MAX_LINE_LENGTH_DISPLAY: 200,
  FUNCTION_PATTERNS: ['function', 'def', 'fn', 'func', 'const', 'let', 'var'],
  CLASS_PATTERNS: ['class', 'interface', 'struct'],
} as const

// =============================================================================
// MONO-REPOSITORY DETECTION
// =============================================================================

/** Project indicator files for mono-repo detection by language */
export const PROJECT_INDICATORS = [
  'package.json', // JavaScript/TypeScript
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Cargo.toml', // Rust
  'go.mod', // Go
  'pyproject.toml', // Python
  'requirements.txt',
  'Pipfile',
  'composer.json', // PHP
  'pom.xml', // Java
  'build.gradle',
  'tsconfig.json', // TypeScript
] as const

/** Directories to ignore during mono-repo scanning */
export const MONO_REPO_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'target',
  'build',
  'dist',
  'out',
  '.next',
  '.nuxt',
  '.cache',
  '.tmp',
  'vendor',
  '__pycache__',
  '.vscode',
  '.idea',
  'coverage',
  '.nyc_output',
])

/** Mono-repository detection configuration */
export const MONO_REPO_CONFIG = {
  DEFAULT_MAX_DEPTH: 3,
  MIN_INDICATORS_REQUIRED: 1,
} as const

/** Mapping from project indicator files to supported languages */
export const INDICATOR_TO_LANGUAGES = {
  'package.json': ['javascript', 'typescript'],
  'package-lock.json': ['javascript', 'typescript'],
  'yarn.lock': ['javascript', 'typescript'],
  'pnpm-lock.yaml': ['javascript', 'typescript'],
  'tsconfig.json': ['typescript'],
  'Cargo.toml': ['rust'],
  'go.mod': ['go'],
  'pyproject.toml': ['python'],
  'requirements.txt': ['python'],
  'Pipfile': ['python'],
  'composer.json': ['php'],
  'pom.xml': ['java'],
  'build.gradle': ['java'],
} as const