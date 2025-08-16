/**
 * Search results formatting functions
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { SearchCodeArgs, SearchResult } from '../../../types/index.js'
import { getContextSnippet } from './context.js'

export function formatSearchResults(
  args: SearchCodeArgs,
  results: SearchResult[],
): TextContent {
  if (results.length === 0) {
    return formatNoResults(args)
  }

  return formatResultsList(args, results)
}

function formatNoResults(args: SearchCodeArgs): TextContent {
  const searchTerm = args.query || `files matching pattern "${args.pathPattern}"`
  return {
    type: 'text',
    text: `No matches found for "${searchTerm}"\n\nTry:\n• Using a broader search term\n• Checking if the project is in the right directory\n• Removing type or language filters`,
  }
}

function formatResultsList(args: SearchCodeArgs, results: SearchResult[]): TextContent {
  const searchTerm = args.query || `files matching pattern "${args.pathPattern}"`
  const lines = [
    `Found ${results.length} match${results.length === 1 ? '' : 'es'} for "${searchTerm}":\n`,
  ]

  results.forEach((result, index) => {
    lines.push(...formatSingleResult(result, index))
  })

  return {
    type: 'text',
    text: lines.join('\n'),
  }
}

function formatSingleResult(result: SearchResult, index: number): string[] {
  const lines: string[] = []

  lines.push(`${index + 1}. ${result.node.name} (${result.node.type})`)
  lines.push(`   File: ${result.filePath}`)

  if (result.subProject) {
    lines.push(`   Sub-project: ${result.subProject}`)
  }

  // Always include line numbers and column positions for precise navigation
  const startLine = result.node.startLine || 1
  const endLine = result.node.endLine || startLine
  const startColumn = result.node.startColumn || 1
  const endColumn = result.node.endColumn || startColumn

  lines.push(`   Location: ${startLine}:${startColumn}-${endLine}:${endColumn}`)

  if (result.context?.parentName) {
    lines.push(`   In: ${result.context.parentType} ${result.context.parentName}`)
  }

  if (result.node.parameters && result.node.parameters.length > 0) {
    lines.push(`   Parameters: ${result.node.parameters.join(', ')}`)
  }

  if (result.node.returnType) {
    lines.push(`   Returns: ${result.node.returnType}`)
  }

  // Add context snippet for better AI understanding
  const contextSnippet = getContextSnippet(result.filePath, startLine, endLine)
  if (contextSnippet) {
    lines.push('   Context:')
    lines.push(contextSnippet)
  }

  lines.push('')

  return lines
}