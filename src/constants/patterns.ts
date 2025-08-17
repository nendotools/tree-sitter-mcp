/**
 * Regular expression patterns and escape sequences
 */

export const REGEX_PATTERNS = {
  ESCAPE_SPECIAL_CHARS: '\\$&',
  PATH_SEPARATOR: '/',
  ARGUMENT_LIST: 'argument_list',
} as const

export const QUALITY_CATEGORIES = {
  UNNECESSARY_ABSTRACTION: 'unnecessary_abstraction',
  EXCESSIVE_ABSTRACTION: 'excessive_abstraction',
  HIGH_COMPLEXITY: 'high_complexity',
  LONG_METHOD: 'long_method',
  MAGIC_STRING: 'magic_string',
  MAGIC_NUMBER: 'magic_number',
  DEEP_NESTING: 'deep_nesting',
  PARAMETER_OVERLOAD: 'parameter_overload',
  GOD_CLASS: 'god_class',
} as const

export const IMPORT_PATTERNS = {
  ANALYSIS_SCHEME: 'analysis://',
  PATH_JOIN_PATTERN: ').slice(0, -1).join(',
} as const

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, REGEX_PATTERNS.ESCAPE_SPECIAL_CHARS)
}