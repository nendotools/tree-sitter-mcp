/**
 * Find Usage MCP tool - Locates all occurrences of identifiers across the codebase
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { readFileSync } from 'fs'
import { SEARCH_CONFIG as SEARCH, USAGE_CONFIG as USAGE_SEARCH, LANGUAGE_EXTENSIONS } from '../../constants/analysis-constants.js'
import type { FindUsageArgs } from '../../types/index.js'
import { withErrorHandling, EnhancedErrorFactory } from '../../core/error-handling/index.js'
import { TreeManager } from '../../core/tree-manager.js'
import { BatchFileWatcher } from '../../core/file-watcher.js'

/**
 * Finds all usages of a specific identifier (function, variable, class, etc.) across the project
 *
 * This tool is essential for refactoring analysis as it provides:
 * - Complete usage discovery with line numbers and context
 * - Function/class context extraction for each usage
 * - Language and path filtering
 * - Exact match vs fuzzy search options
 * - Results grouped by file for easy navigation
 *
 * @param args - Search parameters including identifier, filters, and options
 * @param treeManager - Tree manager for project access
 * @param fileWatcher - File watcher for ensuring fresh data
 * @returns Formatted usage results with context information
 * @throws Error if usage search fails
 */
export async function findUsage(
  args: FindUsageArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): Promise<TextContent> {
  return withErrorHandling(async () => {
    const project = await validateAndSetupProject(args.projectId, treeManager, fileWatcher)
    const usageResults = await findAllUsages(project, args.identifier, args)

    if (usageResults.length === 0) {
      return createNoResultsResponse(args.identifier)
    }

    return formatUsageResults(usageResults, args.identifier)
  }, {
    operation: 'find-usage',
    tool: 'find-usage',
  })
}

/**
 * Validates project existence and initialization, ensures file watcher is running
 */
async function validateAndSetupProject(
  projectId: string,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
) {
  const project = treeManager.getProject(projectId)

  if (!project) {
    throw EnhancedErrorFactory.project.notFound(
      projectId,
      ['You must initialize the project first using the initialize_project tool.',
        'Example:',
        `{"projectId": "${projectId}", "directory": "."}`,
        'This ensures proper project root detection and avoids initialization failures.'],
    )
  }

  if (!project.initialized) {
    throw EnhancedErrorFactory.project.notInitialized(
      projectId,
      'Project exists but is not initialized. This should not happen - please destroy and recreate the project.',
    )
  }

  if (!fileWatcher.getWatcher(projectId)) {
    await fileWatcher.startWatching(projectId, project.config)
  }

  return project
}

/**
 * Creates response for when no usages are found
 */
function createNoResultsResponse(identifier: string): TextContent {
  return {
    type: 'text',
    text: `No usages found for "${identifier}"\n\nTry:\n• Checking if the identifier name is correct\n• Using a different search term\n• Verifying the project includes the relevant files`,
  }
}

/**
 * Formats usage results into human-readable text output
 */
function formatUsageResults(usageResults: UsageResult[], identifier: string): TextContent {
  const lines = [
    `Found ${usageResults.length} usage${usageResults.length === 1 ? '' : 's'} of "${identifier}":\n`,
  ]

  const usagesByFile = groupUsagesByFile(usageResults)
  const sortedFiles = Array.from(usagesByFile.keys()).sort()

  for (const filePath of sortedFiles) {
    const usages = usagesByFile.get(filePath)!
    usages.sort((a, b) => a.line - b.line)

    lines.push(`File: ${filePath}`)

    for (const usage of usages) {
      const displayContent = truncateLineContent(usage.content)
      lines.push(`   Line ${usage.line}: ${displayContent}`)
      if (usage.context) {
        lines.push(`      In: ${usage.context}`)
      }
    }
    lines.push('')
  }

  return {
    type: 'text',
    text: lines.join('\n'),
  }
}

/**
 * Groups usage results by file path for organized display
 */
function groupUsagesByFile(usageResults: UsageResult[]) {
  const usagesByFile = new Map<
    string,
    Array<{ line: number, content: string, context?: string }>
  >()

  for (const usage of usageResults) {
    if (!usagesByFile.has(usage.filePath)) {
      usagesByFile.set(usage.filePath, [])
    }
    usagesByFile.get(usage.filePath)!.push({
      line: usage.lineNumber,
      content: usage.lineContent.trim(),
      context: usage.context,
    })
  }

  return usagesByFile
}

/**
 * Truncates line content if it exceeds display limit
 */
function truncateLineContent(content: string): string {
  return content.length > USAGE_SEARCH.MAX_LINE_LENGTH_DISPLAY
    ? `${content.slice(0, USAGE_SEARCH.MAX_LINE_LENGTH_DISPLAY)}...`
    : content
}

/**
 * Represents a single usage occurrence of an identifier
 */
interface UsageResult {
  /** Path to the file containing the usage */
  filePath: string
  /** Line number (1-based) where the usage occurs */
  lineNumber: number
  /** Full content of the line containing the usage */
  lineContent: string
  /** Context information (e.g., containing function/class) */
  context?: string
}

/**
 * Performs text-based search across all indexed files to find identifier usages
 *
 * @param project - Project tree containing file index
 * @param identifier - Identifier to search for
 * @param args - Search arguments with filters and options
 * @returns Array of usage results with location and context
 */
async function findAllUsages(
  project: any,
  identifier: string,
  args: FindUsageArgs,
): Promise<UsageResult[]> {
  const results: UsageResult[] = []
  const searchPattern = new RegExp(
    args.exactMatch ? `\\b${escapeRegExp(identifier)}\\b` : escapeRegExp(identifier),
    args.caseSensitive ? 'g' : 'gi',
  )

  for (const [filePath] of project.fileIndex) {
    if (args.languages && args.languages.length > 0) {
      const fileExt = filePath.split('.').pop()?.toLowerCase()
      if (fileExt) {
        const matchesLanguage = args.languages.some((lang) => {
          return (
            fileExt === lang
            || fileExt === getFileExtension(lang)
            || filePath.toLowerCase().includes(lang.toLowerCase())
          )
        })
        if (!matchesLanguage) continue
      }
    }

    // Apply path pattern filter
    if (args.pathPattern && !filePath.includes(args.pathPattern)) {
      continue
    }

    try {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line && searchPattern.test(line)) {
          results.push({
            filePath,
            lineNumber: i + 1,
            lineContent: line,
            context: extractContext(lines, i),
          })
        }
        searchPattern.lastIndex = 0
      }
    }
    catch {
      continue
    }
  }

  const maxResults = args.maxResults || SEARCH.DEFAULT_MAX_RESULTS
  return results.slice(0, maxResults)
}

/**
 * Escapes special regex characters in a string for literal matching
 *
 * @param string - String to escape
 * @returns Escaped string safe for use in RegExp constructor
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Gets the primary file extension for a given language name
 *
 * @param language - Programming language name
 * @returns File extension (without dot) or the language name if not found
 */
function getFileExtension(language: string): string {
  const langExtensions = LANGUAGE_EXTENSIONS[language.toLowerCase()]
  return langExtensions?.[0]?.slice(1) ?? language
}

/**
 * Extracts context information (function/class name) for a usage by searching backwards
 *
 * @param lines - All lines in the file
 * @param currentIndex - Index of the line containing the usage
 * @returns Context string or undefined if no context found
 */
function extractContext(lines: string[], currentIndex: number): string | undefined {
  for (
    let i = currentIndex - 1;
    i >= Math.max(0, currentIndex - USAGE_SEARCH.DEFAULT_CONTEXT_LINES);
    i--
  ) {
    const line = lines[i]?.trim()
    if (!line) continue

    const funcPatterns = USAGE_SEARCH.FUNCTION_PATTERNS.join('|')
    const classPatterns = USAGE_SEARCH.CLASS_PATTERNS.join('|')
    const funcMatch = line.match(
      new RegExp(
        `(?:${funcPatterns})\\s+(\\w+)|(?:${classPatterns})\\s+(\\w+)|(\\w+)\\s*[:=]\\s*(?:function|\\(.*\\)\\s*=>)`,
        'i',
      ),
    )
    if (funcMatch) {
      const name = funcMatch[1] || funcMatch[2] || funcMatch[3]
      if (name) {
        const type = USAGE_SEARCH.CLASS_PATTERNS.some(pattern =>
          line.toLowerCase().includes(pattern),
        )
          ? line.toLowerCase().includes('class')
            ? 'class'
            : line.toLowerCase().includes('interface')
              ? 'interface'
              : 'struct'
          : 'function'
        return `${type} ${name}`
      }
    }
  }

  return undefined
}
