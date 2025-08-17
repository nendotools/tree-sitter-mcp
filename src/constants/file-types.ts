/**
 * File extension and type constants
 */

export const LOGIC_EXTENSIONS = {
  JAVASCRIPT: ['.js', '.mjs', '.cjs'],
  TYPESCRIPT: ['.ts', '.d.ts'],
  PYTHON: ['.py', '.pyw', '.pyi'],
  GO: ['.go'],
  RUST: ['.rs'],
  JAVA: ['.java'],
  C: ['.c', '.h'],
  CPP: ['.cpp', '.cxx', '.cc', '.hpp', '.hxx'],
  RUBY: ['.rb'],
  CSHARP: ['.cs'],
  PHP: ['.php'],
} as const

export const FRAMEWORK_EXTENSIONS = {
  REACT_JSX: ['.jsx'],
  REACT_TSX: ['.tsx'],
  VUE: ['.vue'],
  SVELTE: ['.svelte'],
  ASTRO: ['.astro'],
  RAILS_ERB: ['.erb'],
  EJS: ['.ejs'],
  HANDLEBARS: ['.hbs', '.handlebars'],
  BLAZOR: ['.razor'],
  ASP_NET: ['.cshtml'],
  LARAVEL: ['.blade.php'],
} as const

export const MARKUP_EXTENSIONS = {
  HTML: ['.html', '.htm'],
  CSS: ['.css', '.scss', '.sass', '.less'],
  JSON: ['.json'],
  YAML: ['.yml', '.yaml'],
  XML: ['.xml'],
  MARKDOWN: ['.md', '.mdx'],
  TOML: ['.toml'],
} as const

export const ALL_FRAMEWORK_EXTENSIONS = Object.values(FRAMEWORK_EXTENSIONS).flat()

export const ALL_LOGIC_EXTENSIONS = Object.values(LOGIC_EXTENSIONS).flat()

export const ALL_EXTENSIONS = [
  ...ALL_LOGIC_EXTENSIONS,
  ...ALL_FRAMEWORK_EXTENSIONS,
  ...Object.values(MARKUP_EXTENSIONS).flat(),
]

export function isFrameworkFile(filePath: string): boolean {
  return ALL_FRAMEWORK_EXTENSIONS.some(ext => filePath.endsWith(ext))
}

export function isLogicFile(filePath: string): boolean {
  return ALL_LOGIC_EXTENSIONS.some(ext => filePath.endsWith(ext))
}

export const TEST_PATTERNS = {
  FILE_PATTERNS: ['.test.', '.spec.'],
  DIRECTORY_PATTERNS: ['/test/', '/tests/', '__tests__', '/fixtures/'],
  NEXT_JS_SPECIAL: ['_app.', '_document.'],
} as const

export const ENCODING = {
  UTF8: 'utf-8',
} as const

export function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.FILE_PATTERNS.some(pattern => filePath.includes(pattern))
    || TEST_PATTERNS.DIRECTORY_PATTERNS.some(pattern => filePath.includes(pattern))
}

export function getFileCategory(filePath: string): 'logic' | 'framework' | 'markup' | 'unknown' {
  if (isLogicFile(filePath)) return 'logic'
  if (isFrameworkFile(filePath)) return 'framework'
  if (Object.values(MARKUP_EXTENSIONS).flat().some(ext => filePath.endsWith(ext))) return 'markup'
  return 'unknown'
}