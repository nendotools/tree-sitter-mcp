/**
 * Content extraction utilities for various display and analysis contexts
 */

import type { TreeNode } from '../types/core.js'

export interface ContentExtractionOptions {
  maxLines?: number
  maxCharacters?: number
  highlightLine?: number
  contextBefore?: number
  contextAfter?: number
  showLineNumbers?: boolean
  truncationMessage?: string
}

export interface ExtractedContent {
  content: string
  truncated: boolean
  originalLines: number
  extractedLines: number
  originalCharacters: number
  extractedCharacters: number
}

/**
 * Core content extraction function that handles truncation and formatting
 */
export function extractContent(
  content: string,
  options: ContentExtractionOptions = {},
): ExtractedContent {
  const {
    maxLines,
    maxCharacters,
    highlightLine,
    contextBefore = 0,
    contextAfter = 0,
    showLineNumbers = false,
    truncationMessage = '...',
  } = options

  const lines = content.split('\n')
  const originalLines = lines.length
  const originalCharacters = content.length

  let extractedLines = lines
  let lineTruncated = false

  // Apply line-based extraction if contextual or line limits specified
  if (highlightLine !== undefined && (contextBefore > 0 || contextAfter > 0)) {
    const startLine = Math.max(0, highlightLine - contextBefore)
    const endLine = Math.min(lines.length - 1, highlightLine + contextAfter)
    extractedLines = lines.slice(startLine, endLine + 1)
    lineTruncated = startLine > 0 || endLine < lines.length - 1
  }
  else if (maxLines && lines.length > maxLines) {
    extractedLines = lines.slice(0, maxLines)
    lineTruncated = true
  }

  // Apply line number formatting if requested
  let processedContent = extractedLines.join('\n')
  if (showLineNumbers) {
    const startLineNum = highlightLine !== undefined
      ? Math.max(0, highlightLine - contextBefore) + 1
      : 1
    processedContent = extractedLines
      .map((line, index) => {
        const lineNum = startLineNum + index
        const isHighlight = highlightLine !== undefined && lineNum === highlightLine + 1
        const prefix = isHighlight ? '→ ' : '  '
        return `${prefix}${lineNum}: ${line}`
      })
      .join('\n')
  }

  // Apply character-based truncation
  let characterTruncated = false
  if (maxCharacters && processedContent.length > maxCharacters) {
    processedContent = processedContent.substring(0, maxCharacters)
    characterTruncated = true
  }

  // Add truncation message if content was truncated
  const wasTruncated = lineTruncated || characterTruncated
  if (wasTruncated && truncationMessage) {
    processedContent += `\n\n${truncationMessage}`
  }

  return {
    content: processedContent,
    truncated: wasTruncated,
    originalLines,
    extractedLines: extractedLines.length,
    originalCharacters,
    extractedCharacters: processedContent.length,
  }
}

/**
 * Extract content from a TreeNode with node type-specific handling
 */
export function extractNodeContent(
  node: TreeNode,
  options: ContentExtractionOptions = {},
): ExtractedContent {
  if (!node.content) {
    return {
      content: '',
      truncated: false,
      originalLines: 0,
      extractedLines: 0,
      originalCharacters: 0,
      extractedCharacters: 0,
    }
  }

  // Apply type-specific defaults
  const typeDefaults = getNodeTypeDefaults(node.type)
  const mergedOptions = { ...typeDefaults, ...options }

  return extractContent(node.content, mergedOptions)
}

/**
 * Get default extraction options based on node type
 */
function getNodeTypeDefaults(nodeType: string): ContentExtractionOptions {
  switch (nodeType) {
    case 'function':
    case 'method':
      return {
        maxCharacters: 500,
        truncationMessage: '// ... function truncated ...',
      }
    case 'class':
      return {
        maxCharacters: 800,
        truncationMessage: '// ... class truncated ...',
      }
    case 'interface':
    case 'type':
      return {
        maxCharacters: 300,
        truncationMessage: '// ... type truncated ...',
      }
    default:
      return {
        maxLines: 20,
        truncationMessage: '// ... truncated ...',
      }
  }
}

/**
 * Usage context wrapper - maintains backward compatibility with findUsage
 */
export function getUsageContext(
  node: TreeNode,
  highlightLine: number,
  lines: string[],
): string {
  const content = lines.join('\n')
  if (node.type === 'function') {
    const result = extractContent(content, {
      maxCharacters: 500,
      truncationMessage: '...',
    })
    return result.content
  }

  const result = extractContent(content, {
    highlightLine,
    contextBefore: 10,
    contextAfter: 3,
    showLineNumbers: true,
    truncationMessage: '',
  })

  return result.content
}