/**
 * HTML and template tag constants
 */

export const HTML_TAGS = {
  TEMPLATE: '<template',
  TEMPLATE_CLOSE: '</template>',
  SCRIPT: '<script',
  SCRIPT_CLOSE: '</script>',
  STYLE: '<style',
  STYLE_CLOSE: '</style>',
  COMMENT_START: '<!--',
  COMMENT_MULTI_START: '/*',
  COMMENT_SINGLE: '//',
} as const

export const TEMPLATE_PATTERNS = {
  OPEN_TAG: /<[^/!][^>]*>/g,
  CLOSE_TAG: /<\/[^>]+>/g,
  SELF_CLOSING: /<[^>]*\/>/g,
} as const

export const NESTING_THRESHOLD = {
  SHALLOW: 3,
  MODERATE: 5,
  DEEP: 8,
  VERY_DEEP: 10,
} as const