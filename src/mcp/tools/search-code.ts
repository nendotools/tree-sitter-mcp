/**
 * Search Code MCP tool - Provides fast semantic search across indexed code elements
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { readFileSync } from 'fs'
import { DIRECTORIES, DEFAULT_IGNORE_DIRS } from '../../constants/service-constants.js'
import { SEARCH } from '../../constants/tree-constants.js'
import type { SearchCodeArgs, Config, SearchOptions, NodeType } from '../../types/index.js'
import { ErrorFactory } from '../../types/error-types.js'
import { TreeManager } from '../../core/tree-manager.js'
import { BatchFileWatcher } from '../../core/file-watcher.js'
import { getLogger } from '../../utils/logger.js'
import { findProjectRoot } from '../../utils/project-detection.js'

/**
 * Performs semantic search across project code elements
 *
 * Features:
 * - Auto-initialization of projects on first search
 * - Mono-repo support with sub-project filtering
 * - Type, language, and path pattern filtering
 * - Formatted results with context information
 * - Automatic file watching setup
 *
 * @param args - Search parameters including query, filters, and scope
 * @param treeManager - Tree manager for search operations
 * @param fileWatcher - File watcher for monitoring changes
 * @returns Formatted search results as text content
 * @throws Error if search operation fails
 */
export async function searchCode(
  args: SearchCodeArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): Promise<TextContent> {
  const logger = getLogger()

  try {
    // Validate required parameters
    if (!args.projectId || args.projectId.trim().length === 0) {
      throw ErrorFactory.validationError('projectId', args.projectId)
    }

    // Allow empty query if pathPattern is provided for file-only searches
    if ((!args.query || args.query.trim().length === 0) && !args.pathPattern) {
      throw ErrorFactory.invalidQuery(args.query || 'empty')
    }

    let project = treeManager.getProject(args.projectId)

    if (!project) {
      logger.info(`Auto-initializing project ${args.projectId}`)

      const config: Config = {
        workingDir: findProjectRoot(),
        languages: args.languages || [],
        maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
        ignoreDirs: DEFAULT_IGNORE_DIRS,
      }

      project = await treeManager.createProject(args.projectId, config)
      await treeManager.initializeProject(args.projectId)

      await fileWatcher.startWatching(args.projectId, config)
    }
    else if (!project.initialized) {
      await treeManager.initializeProject(args.projectId)
    }

    if (!fileWatcher.getWatcher(args.projectId)) {
      await fileWatcher.startWatching(args.projectId, project.config)
    }

    const searchOptions: SearchOptions = {
      maxResults: args.maxResults || SEARCH.DEFAULT_MAX_RESULTS,
      types: args.types as NodeType[],
      languages: args.languages,
      pathPattern: args.pathPattern,
      exactMatch: args.exactMatch,
      caseSensitive: args.caseSensitive,
      priorityType: args.priorityType,
      fuzzyThreshold: args.fuzzyThreshold,
      includeContext: true,
      scope: {
        subProjects: args.subProjects,
        excludeSubProjects: args.excludeSubProjects,
        crossProjectSearch: args.crossProjectSearch,
      },
    }

    const searchQuery = args.query || ''
    const results = await treeManager.search(args.projectId, searchQuery, searchOptions)

    if (results.length === 0) {
      const searchTerm = searchQuery || `files matching pattern "${args.pathPattern}"`
      return {
        type: 'text',
        text: `No matches found for "${searchTerm}"\n\nTry:\n• Using a broader search term\n• Checking if the project is in the right directory\n• Removing type or language filters`,
      }
    }

    const searchTerm = searchQuery || `files matching pattern "${args.pathPattern}"`
    const lines = [
      `Found ${results.length} match${results.length === 1 ? '' : 'es'} for "${searchTerm}":\n`,
    ]

    results.forEach((result, index) => {
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
    })

    return {
      type: 'text',
      text: lines.join('\n'),
    }
  }
  catch (error) {
    logger.error('Search failed:', error)

    // Re-throw structured errors as-is
    if (error instanceof Error && error.name === 'McpOperationError') {
      throw error
    }

    // Wrap other errors in a system error
    throw ErrorFactory.systemError(
      'code search',
      error instanceof Error ? error.message : String(error),
    )
  }
}

/**
 * Extracts a context snippet showing the containing method/function or surrounding code
 *
 * @param filePath - Path to the file containing the declaration
 * @param startLine - Starting line of the declaration (1-based)
 * @param endLine - Ending line of the declaration (1-based)
 * @returns Formatted context snippet or null if file cannot be read
 */
function getContextSnippet(filePath: string, startLine: number, endLine: number): string | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    // First, try to find the containing method/function
    const containingMethod = findContainingMethod(lines, startLine - 1) // Convert to 0-based
    if (containingMethod) {
      return formatMethodContext(lines, containingMethod, startLine, endLine)
    }

    // Fallback to showing lines around the declaration
    return formatSurroundingContext(lines, startLine, endLine)
  }
  catch {
    return null
  }
}

/**
 * Finds the containing method/function for a given line
 */
function findContainingMethod(lines: string[], targetLineIndex: number): { name: string, startLine: number, endLine: number } | null {
  // Common patterns for method/function declarations
  const functionPatterns = [
    // TypeScript/JavaScript functions and methods
    /^\s*(?:export\s+)?(?:async\s+)?(?:static\s+)?(?:public|private|protected\s+)?(?:async\s+)?(function\s+(\w+)|(\w+)\s*\(|(\w+)\s*:\s*\([^)]*\)\s*=>|(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/,
    // Class methods
    /^\s*(?:public|private|protected\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\(/,
    // Arrow functions assigned to variables
    /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
    // Vue Component definitions
    /^\s*(?:export\s+)?(?:default\s+)?defineComponent\s*\(\s*\{/,
    /^\s*(?:const|let|var)\s+(\w+)\s*=\s*defineComponent\s*\(/,
    /^\s*(?:export\s+)?(?:default\s+)?\{\s*(?:name\s*:\s*['"`](\w+)['"`])?/,
    // Vue Composition API setup function
    /^\s*setup\s*\(/,
    // Vue Options API methods
    /^\s*(?:async\s+)?(\w+)\s*\(\s*[^)]*\s*\)\s*\{/,
    // Vue computed and watch functions
    /^\s*(?:computed|watch|methods)\s*:\s*\{/,
  ]

  // Search backwards from the target line to find the containing method
  for (let i = targetLineIndex; i >= 0; i--) {
    const line = lines[i]?.trim()
    if (!line) continue

    for (const pattern of functionPatterns) {
      const match = line.match(pattern)
      if (match) {
        // Extract function/method name from the match groups
        let name = match[2] || match[3] || match[4] || match[5] || match[1]

        // Handle special cases for Vue components
        if (!name) {
          if (line.includes('defineComponent')) {
            name = 'VueComponent'
          }
          else if (line.includes('setup(')) {
            name = 'setup'
          }
          else if (line.includes('computed:') || line.includes('watch:') || line.includes('methods:')) {
            name = 'VueOptions'
          }
        }

        if (name) {
          const endLine = findMethodEndLine(lines, i)
          return {
            name,
            startLine: i + 1, // Convert back to 1-based
            endLine: endLine + 1, // Convert back to 1-based
          }
        }
      }
    }
  }

  return null
}

/**
 * Finds the end line of a method by tracking brace balance
 */
function findMethodEndLine(lines: string[], startLineIndex: number): number {
  let braceCount = 0
  let foundOpeningBrace = false

  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i] || ''

    for (const char of line) {
      if (char === '{') {
        braceCount++
        foundOpeningBrace = true
      }
      else if (char === '}') {
        braceCount--
        if (foundOpeningBrace && braceCount === 0) {
          return i
        }
      }
    }
  }

  // If we can't find the end, just show a few lines
  return Math.min(startLineIndex + 10, lines.length - 1)
}

/**
 * Formats the context showing the containing method
 */
function formatMethodContext(
  lines: string[],
  method: { name: string, startLine: number, endLine: number },
  declarationStartLine: number,
  declarationEndLine: number,
): string {
  const contextLines: string[] = []

  // Show the method signature
  const methodLine = lines[method.startLine - 1] || ''
  const displayMethodLine = methodLine.length > 100 ? `${methodLine.slice(0, 97)}...` : methodLine
  contextLines.push(`     ${method.startLine.toString().padStart(3)}: → ${displayMethodLine.trim()}`)

  // Add a separator to show we're inside the method
  contextLines.push('         ...')

  // Show the declaration lines within the method
  for (let lineNum = declarationStartLine; lineNum <= declarationEndLine; lineNum++) {
    const line = lines[lineNum - 1] || ''
    const displayLine = line.length > 100 ? `${line.slice(0, 97)}...` : line
    contextLines.push(`     ${lineNum.toString().padStart(3)}: → ${displayLine}`)
  }

  contextLines.push(`         (in method: ${method.name})`)

  return contextLines.join('\n')
}

/**
 * Fallback to show surrounding context when no containing method is found
 */
function formatSurroundingContext(lines: string[], startLine: number, endLine: number): string {
  const contextBefore = 2
  const contextAfter = 2
  const snippetStart = Math.max(0, startLine - 1 - contextBefore)
  const snippetEnd = Math.min(lines.length, endLine + contextAfter)

  const contextLines: string[] = []

  for (let i = snippetStart; i < snippetEnd; i++) {
    const lineNum = i + 1
    const isDeclarationLine = lineNum >= startLine && lineNum <= endLine
    const marker = isDeclarationLine ? '→ ' : '  '
    const line = lines[i] || ''

    // Limit line length to prevent overly long output
    const displayLine = line.length > 100 ? `${line.slice(0, 97)}...` : line
    contextLines.push(`     ${lineNum.toString().padStart(3)}: ${marker}${displayLine}`)
  }

  return contextLines.join('\n')
}
