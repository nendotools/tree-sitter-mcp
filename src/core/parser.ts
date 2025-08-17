/**
 * Tree-sitter integration - restored working parser functionality
 */

import Parser from 'tree-sitter'
import { readFileSync } from 'fs'
import { extname } from 'path'
import { createError } from '../utils/errors.js'
import { getLogger } from '../utils/logger.js'
import { getParser, getLanguageByExtension } from './languages.js'
import type { TreeNode, LanguageConfig } from '../types/core.js'

/**
 * Parses a file and extracts its tree structure
 */
export async function parseFile(filePath: string): Promise<TreeNode> {
  const logger = getLogger()

  try {
    const rawContent = readFileSync(filePath, 'utf-8')
    const content = truncateLongLines(rawContent, 1000)

    const extension = extname(filePath)
    const languageConfig = getLanguageByExtension(extension)

    if (!languageConfig) {
      return {
        id: `file-${Date.now()}`,
        type: 'file',
        path: filePath,
        content,
      }
    }

    return parseContent(content, filePath, languageConfig)
  }
  catch (error) {
    logger.warn(`Failed to parse ${filePath}:`, error)
    throw createError('FILE_ERROR', `Failed to parse file ${filePath}`, { error: String(error) })
  }
}

/**
 * Parses content string and extracts tree elements
 */
export function parseContent(content: string, filePath: string, language?: LanguageConfig): TreeNode {
  const extension = extname(filePath)
  const languageConfig = language || getLanguageByExtension(extension)

  if (!languageConfig) {
    // Return basic file node
    return {
      id: `file-${Date.now()}`,
      type: 'file',
      path: filePath,
      content,
    }
  }

  try {
    const parser = getParser(languageConfig.name)
    if (!parser) {
      throw new Error(`Parser not available for ${languageConfig.name}`)
    }

    const tree = parser.parse(content)
    const rootNode = tree.rootNode

    const fileNode: TreeNode = {
      id: `file-${Date.now()}`,
      type: 'file',
      path: filePath,
      content,
      children: [],
    }

    // Extract functions and classes
    extractElements(rootNode, content, filePath, languageConfig, fileNode)

    return fileNode
  }
  catch (error) {
    throw createError('PARSE_ERROR', `Failed to parse content for ${filePath}`, { error: String(error) })
  }
}

function extractElements(
  node: Parser.SyntaxNode,
  content: string,
  filePath: string,
  language: LanguageConfig,
  parent: TreeNode,
): void {
  // Extract functions
  if (language.functionTypes.includes(node.type)) {
    const functionNode = extractFunction(node, content, filePath)
    if (functionNode) {
      parent.children?.push(functionNode)
    }
  }

  // Extract classes
  if (language.classTypes.includes(node.type)) {
    const classNode = extractClass(node, content, filePath)
    if (classNode) {
      parent.children?.push(classNode)
    }
  }

  // Recursively process children
  for (const child of node.children) {
    extractElements(child, content, filePath, language, parent)
  }
}

function extractFunction(node: Parser.SyntaxNode, content: string, filePath: string): TreeNode | null {
  try {
    // Skip arrow functions that are clearly callback parameters
    if (node.type === 'arrow_function' && isCallbackArrowFunction(node, content)) {
      return null
    }

    const name = getFunctionName(node, content)
    const parameters = extractParameters(node, content)

    return {
      id: `func-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'function',
      name: name || 'anonymous',
      path: filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column,
      endColumn: node.endPosition.column,
      content: content.substring(node.startIndex, node.endIndex),
      parameters,
    }
  }
  catch {
    return null
  }
}

function extractClass(node: Parser.SyntaxNode, content: string, filePath: string): TreeNode | null {
  try {
    const name = getClassName(node, content)

    return {
      id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'class',
      name: name || 'anonymous',
      path: filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column,
      endColumn: node.endPosition.column,
      content: content.substring(node.startIndex, node.endIndex),
      children: [],
    }
  }
  catch {
    return null
  }
}

function getFunctionName(node: Parser.SyntaxNode, content: string): string | null {
  // Try to find name field
  const nameNode = node.childForFieldName('name')
  if (nameNode) {
    return content.substring(nameNode.startIndex, nameNode.endIndex)
  }

  // Fallback: look for identifier children
  for (const child of node.children) {
    if (child.type === 'identifier') {
      return content.substring(child.startIndex, child.endIndex)
    }
  }

  return null
}

function getClassName(node: Parser.SyntaxNode, content: string): string | null {
  // Try to find name field
  const nameNode = node.childForFieldName('name')
  if (nameNode) {
    return content.substring(nameNode.startIndex, nameNode.endIndex)
  }

  // Fallback: look for identifier children
  for (const child of node.children) {
    if (child.type === 'type_identifier' || child.type === 'identifier') {
      return content.substring(child.startIndex, child.endIndex)
    }
  }

  return null
}

function isCallbackArrowFunction(node: Parser.SyntaxNode, content: string): boolean {
  if (!node.parent) return false

  // Check if the arrow function is a direct child of a call expression
  // Pattern: someArray.map(x => ...) or someFunction((x) => ...)
  if (node.parent.type === 'call_expression' || node.parent.type === 'arguments') {
    return true
  }

  // Check if it's in an argument list
  if (node.parent.type === 'argument_list') {
    return true
  }

  // Check for common callback method patterns in the surrounding context
  const contextStart = Math.max(0, node.startIndex - 50)
  const contextEnd = Math.min(content.length, node.endIndex + 10)
  const context = content.substring(contextStart, contextEnd)

  // Common array/callback methods that take arrow functions
  const callbackPatterns = [
    /\.(map|filter|reduce|forEach|find|some|every|sort)\s*\(\s*$/,
    /\.(then|catch|finally)\s*\(\s*$/,
    /\.(addEventListener|on|once)\s*\(\s*['"`]\w+['"`]\s*,\s*$/,
    /setTimeout\s*\(\s*$/,
    /setInterval\s*\(\s*$/,
    /Promise\s*\(\s*$/,
  ]

  return callbackPatterns.some(pattern => pattern.test(context))
}

function extractParameters(node: Parser.SyntaxNode, content: string): TreeNode[] {
  const params: TreeNode[] = []

  // Look for parameters field
  const paramsNode = node.childForFieldName('parameters')
  if (paramsNode) {
    for (const child of paramsNode.children) {
      if (child.type === 'identifier' || child.type === 'parameter') {
        params.push({
          id: `param-${params.length}`,
          type: 'parameter',
          name: content.substring(child.startIndex, child.endIndex),
          path: '',
          content: content.substring(child.startIndex, child.endIndex),
        })
      }
    }
  }

  return params
}

function truncateLongLines(content: string, maxLineLength: number): string {
  const lines = content.split('\n')
  const truncatedLines = lines.map((line) => {
    if (line.length > maxLineLength) {
      return line.substring(0, maxLineLength) + ' /* ... truncated */'
    }
    return line
  })
  return truncatedLines.join('\n')
}

export function getLanguageParser(extension: string): LanguageConfig | undefined {
  return getLanguageByExtension(extension)
}