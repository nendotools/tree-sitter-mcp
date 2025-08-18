/**
 * String analysis utilities for code content inspection
 */

import { REGEX_PATTERNS } from '../constants/index.js'

/**
 * Checks if a position in content is within a comment
 */
export function isInComment(content: string, index: number): boolean {
  const beforeIndex = content.substring(0, index)
  const lineStart = beforeIndex.lastIndexOf('\n') + 1
  const lineContent = content.substring(lineStart, content.indexOf('\n', index))

  return lineContent.trim().startsWith('//')
    || lineContent.includes('/*')
    || lineContent.includes('*/')
}

/**
 * Checks if a position in content is within a TypeScript type definition
 */
export function isInTypeDefinition(content: string, index: number): boolean {
  const beforeIndex = content.substring(0, index)
  const afterIndex = content.substring(index)

  const typePatterns = [
    /\b(?:type|interface)\s+\w+.*=/, // type X =
    /:\s*['"`]/, // object property with string type
    /\|\s*['"`]/, // union type with string literal
    /\bconst\s+\w+\s*=\s*['"`]/, // const declarations
    /\benum\s+/, // enum definitions
    /\|\s*\d+/, // union type with number literal: type Status = 200 | 404 | 500
    /:\s*\d+/, // object property with number type: { status: 200 }
    /=\s*\d+/, // type alias with number: type Port = 3000
    /\bas\s+const/, // as const assertions
    /\bReadonly</, // readonly types
    /\bRecord</, // record types
  ]

  const contextBefore = beforeIndex.slice(-100)
  const contextAfter = afterIndex.slice(0, 20)
  const context = contextBefore + contextAfter

  const unionPatterns = [
    /\|\s*['"`]\w+['"`]\s*\|/, // middle of union: 'a' | 'b' | 'c'
    /=\s*['"`]\w+['"`]\s*\|/, // start of union: = 'a' | 'b'
    /\|\s*['"`]\w+['"`]\s*$/, // end of union: | 'c'
    /\|\s*\d+\s*\|/, // number union middle: | 200 | 404
    /=\s*\d+\s*\|/, // number union start: = 200 | 404
    /\|\s*\d+\s*$/, // number union end: | 500
  ]

  return typePatterns.some(pattern => pattern.test(context))
    || unionPatterns.some(pattern => pattern.test(context))
}

/**
 * Checks if a position in content is in a context where numbers might be suspicious
 */
export function isInSuspiciousContext(content: string, index: number): boolean {
  const beforeIndex = content.substring(0, index)
  const contextBefore = beforeIndex.slice(-30)

  const suspiciousPatterns = [
    /setTimeout\s*\(\s*[^,]*,\s*$/, // timeout values
    /\bport\s*[=:]\s*$/, // port assignments
    /\bmax\w*\s*[=:]\s*$/, // max values
    /\blimit\s*[=:]\s*$/, // limits
    /\bthreshold\s*[=:]\s*$/, // thresholds
  ]

  return suspiciousPatterns.some(pattern => pattern.test(contextBefore))
}

/**
 * Checks if a string is a common/acceptable string that shouldn't be flagged as magic
 */
export function isCommonString(str: string): boolean {
  const commonPatterns = [
    /^https?:\/\//, // URLs
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email
    /^\/[a-zA-Z0-9/_-]*$/, // Paths
    /^[A-Z_][A-Z0-9_]*$/, // Constants
    /^(error|warning|info|debug|log)$/i, // Log levels
    /^(get|post|put|delete|patch)$/i, // HTTP methods
    /^(application|text|image|video|audio)\/[a-zA-Z0-9-+.]+$/, // MIME types
    /^[a-f0-9]{8,}$/i, // Hex strings/hashes
    /^[A-Za-z0-9+/=]+$/, // Base64-like
    /^tree-sitter/, // Our specific library references
    /^\w+:\d+$/, // Error location formats
    /\.(?:js|ts|tsx|jsx|vue|html|css|json|md)$/, // File extensions
    /^🔨|🎯|✅|❌|🚨|⚠️/, // Emoji prefixes (markdown, comments)
    /^\w+\s+(with|from|to|in|on|for)\s+/, // Natural language phrases
    /^(Building|Creating|Adding|Removing|Found|Analyzing)\s+/, // Status messages
    /^\$\{.*\}$/, // Template literal expressions: ${anything}
    /^.*\$\{.*\}.*$/, // Strings containing template expressions
    /^\)\.[a-zA-Z]+\(\).*\|\|/, // Default value patterns: ).method() ||
  ]

  const commonTerms = [
    'javascript', 'typescript', 'function', 'method', 'class', 'interface',
    'component', 'import', 'export', 'default', 'module', 'require',
    'content', 'language', 'parser', 'analyzer', 'project', 'directory',
    'building', 'analyzing', 'creating', 'found', 'warning', 'error',
    'critical', 'restructured', 'dist-new', 'src-new', 'complexity',
    'process.argv', 'commander', 'yargs', // Node.js APIs and CLI libraries
  ]

  return commonPatterns.some(pattern => pattern.test(str))
    || commonTerms.some(term => str.toLowerCase().includes(term))
    || str.length < 4
    || str === '' // Empty string is acceptable
    || str === '0' // Zero is acceptable
    || /^[\s\n\t]*$/.test(str) // Whitespace only
    || /^\w+\s+\w+\s+\w+/.test(str) // Natural language (3+ words)
}

/**
 * Escapes special characters in a string for use in regular expressions
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, REGEX_PATTERNS.ESCAPE_SPECIAL_CHARS)
}