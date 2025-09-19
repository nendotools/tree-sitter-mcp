/**
 * Global directory and file ignore rules - applied universally regardless of language
 */

export const GLOBAL_IGNORE_DIRS = new Set([
  // Version control
  '.git', '.svn', '.hg',

  // Dependencies
  'node_modules', 'vendor', 'target', '__pycache__',

  // Build outputs
  'build', 'dist', 'out', '.output',

  // Framework specific
  '.next', '.nuxt', '.cache', '.tmp',

  // IDE/Editor
  '.vscode', '.idea',

  // Testing/Coverage
  'coverage', '.nyc_output', '.pytest_cache', '.mypy_cache', '.tox', 'htmlcov', '.coverage',

  // Environment
  'venv', '.venv', '.env',

  // Test directories (often contain fixtures that shouldn't be analyzed)
  'test', 'tests', '__tests__', 'spec', 'specs', '__test__',

  // Third-party/external libraries (common directory names for external includes)
  'third_party', 'external', 'libs', 'lib', 'include', 'headers',
])

export const GLOBAL_IGNORE_FILES = new Set([
  // Lock files
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',

  // Config files that are typically generated
  '.DS_Store', 'Thumbs.db',

  // Logs
  '*.log',
])