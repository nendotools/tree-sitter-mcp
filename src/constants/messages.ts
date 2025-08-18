/**
 * Console messages and common string constants
 */

export const CONSOLE_MESSAGES = {
  CODEBASE_STATS: '📊 New codebase statistics:',
  LINES_OF_CODE: '   Lines of code:',
  FILES_COUNT: '   Files:',
  DIRECTORIES_COUNT: '   Directories:',
  COMPLEXITY_STATS: '   Complexity:',
  FUNCTIONS_COUNT: '   Functions:',

  BUILDING: 'Building project...',
  BUILD_SUCCESS: 'Build completed successfully',
  BUILD_FAILED: 'Build failed',

  ANALYZING: 'Analyzing project...',
  PARSING_FILES: 'Parsing files...',
  ANALYSIS_COMPLETE: 'Analysis complete',

  FILE_NOT_FOUND: 'File not found',
  PARSE_ERROR: 'Failed to parse file',
  INVALID_CONFIG: 'Invalid configuration',
} as const

export const QUALITY_MESSAGES = {
  HIGH_COMPLEXITY: 'has high cyclomatic complexity',
  LONG_METHOD: 'is very long',
  TOO_MANY_PARAMS: 'has too many parameters',
  MAGIC_NUMBER: 'Magic number found',
  MAGIC_STRING: 'Magic string found',
  DEEP_NESTING: 'Deep nesting detected',
  UNUSED_FUNCTION: 'appears to be unused',
  UNNECESSARY_ABSTRACTION: 'is very short and never used',
} as const

export const ANALYSIS_CONTEXTS = {
  BREAK_DOWN_FUNCTION: 'Consider breaking down into smaller functions',
  EXTRACT_METHODS: 'Consider extracting functionality into separate methods',
  USE_CONSTANTS: 'Consider extracting to a named constant or configuration',
  REDUCE_NESTING: 'Consider using early returns, guard clauses, or extracting nested logic into separate functions',
  REMOVE_UNUSED: 'Consider removing if no longer needed',
  INLINE_FUNCTION: 'Consider inlining this function to reduce unnecessary abstraction',
} as const

export const COMMON_PATTERNS = {
  TREE_SITTER_PREFIX: 'tree-sitter',
  ANONYMOUS_FUNCTION: 'anonymous',
  PARAMETER_PREFIX: 'param-',
  FUNCTION_PREFIX: 'func-',
  CLASS_PREFIX: 'class-',
  FILE_PREFIX: 'file-',
} as const

export const MCP_COMMANDS = {
  SEARCH_CODE: 'search_code',
  FIND_USAGE: 'find_usage',
  ANALYZE_CODE: 'analyze_code',
} as const

export const CLI_MESSAGES = {
  HELP_TEXT: 'Use --help to see available commands',
  VERSION: '1.0.0',
  DESCRIPTION: 'Tree-sitter MCP server for code analysis and search',
  MCP_SETUP_TITLE: 'MCP Setup Instructions:',
  RESTART_CLAUDE: '2. Restart Claude Desktop',
  SERVER_AVAILABLE: '3. The server will be available for code analysis and search',
} as const