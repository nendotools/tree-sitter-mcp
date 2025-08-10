/**
 * Mono-repository detection and processing constants
 */

// Language-specific project indicators for mono-repo detection
export const LANGUAGE_PROJECT_INDICATORS = [
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
] as const;

// Directories to ignore during mono-repo scanning
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
]);

// Default settings for mono-repo detection
export const MONO_REPO = {
  DEFAULT_MAX_DEPTH: 3,
  MIN_INDICATORS_REQUIRED: 1,
} as const;

// Language mappings for project indicators
export const INDICATOR_LANGUAGE_MAP = {
  'package.json': ['javascript', 'typescript'],
  'package-lock.json': ['javascript', 'typescript'],
  'yarn.lock': ['javascript', 'typescript'],
  'pnpm-lock.yaml': ['javascript', 'typescript'],
  'tsconfig.json': ['typescript'],
  'Cargo.toml': ['rust'],
  'go.mod': ['go'],
  'pyproject.toml': ['python'],
  'requirements.txt': ['python'],
  Pipfile: ['python'],
  'composer.json': ['php'],
  'pom.xml': ['java'],
  'build.gradle': ['java'],
} as const;
