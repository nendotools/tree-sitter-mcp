/**
 * Tree-sitter parser constants
 */

export const PARSER_NAMES = {
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  TSX: 'tsx',
  PYTHON: 'python',
  GO: 'go',
  RUST: 'rust',
  JAVA: 'java',
  C: 'c',
  CPP: 'cpp',
  RUBY: 'ruby',
  CSHARP: 'c_sharp',
  PHP: 'php',
  HTML: 'html',
  KOTLIN: 'kotlin',
} as const

export const FUNCTION_TYPES = {
  JAVASCRIPT: ['function_declaration', 'arrow_function', 'method_definition'],
  TYPESCRIPT: ['function_declaration', 'arrow_function', 'method_definition'],
  PYTHON: ['function_definition'],
  GO: ['function_declaration', 'method_declaration'],
  RUST: ['function_item'],
  JAVA: ['method_declaration'],
  C: ['function_definition', 'function_declarator'],
  CPP: ['function_definition', 'function_declarator'],
  RUBY: ['method'],
  CSHARP: ['method_declaration'],
  PHP: ['function_definition', 'method_declaration'],
  HTML: [],
  KOTLIN: ['function_declaration'],
} as const

export const CLASS_TYPES = {
  JAVASCRIPT: ['class_declaration'],
  TYPESCRIPT: ['class_declaration', 'interface_declaration'],
  PYTHON: ['class_definition'],
  GO: ['type_declaration'],
  RUST: ['struct_item', 'enum_item', 'trait_item'],
  JAVA: ['class_declaration', 'interface_declaration'],
  C: ['struct_specifier'],
  CPP: ['class_specifier', 'struct_specifier'],
  RUBY: ['class', 'module'],
  CSHARP: ['class_declaration', 'interface_declaration'],
  PHP: ['class_declaration'],
  HTML: [],
  KOTLIN: ['class_declaration', 'object_declaration'],
} as const

export const PARSER_LIMITS = {
  KOTLIN_MAX_FILE_SIZE: 32767,
} as const