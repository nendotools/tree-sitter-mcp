/**
 * Find Usage tool implementation - finds all lines where a specific function/variable is used
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { readFileSync } from 'fs'
import { DIRECTORIES, DEFAULT_IGNORE_DIRS } from '../../constants/service-constants.js'
import { SEARCH, USAGE_SEARCH, LANGUAGE_EXTENSIONS } from '../../constants/tree-constants.js'
import type { FindUsageArgs, Config } from '../../types/index.js'
import { TreeManager } from '../../core/tree-manager.js'
import { BatchFileWatcher } from '../../core/file-watcher.js'
import { getLogger } from '../../utils/logger.js'
import { findProjectRoot } from '../../utils/project-detection.js'

export async function findUsage(
  args: FindUsageArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): Promise<TextContent> {
  const logger = getLogger()

  try {
    // Check if project exists
    let project = treeManager.getProject(args.projectId)

    // Auto-initialize if needed
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

      // Start watcher
      await fileWatcher.startWatching(args.projectId, config)
    }
    else if (!project.initialized) {
      await treeManager.initializeProject(args.projectId)
    }

    // Ensure watcher is running
    if (!fileWatcher.getWatcher(args.projectId)) {
      await fileWatcher.startWatching(args.projectId, project.config)
    }

    const usageResults = await findAllUsages(project, args.identifier, args)
    if (usageResults.length === 0) {
      return {
        type: 'text',
        text: `No usages found for "${args.identifier}"\n\nTry:\n• Checking if the identifier name is correct\n• Using a different search term\n• Verifying the project includes the relevant files`,
      }
    }

    const lines = [
      `Found ${usageResults.length} usage${usageResults.length === 1 ? '' : 's'} of "${args.identifier}":\n`,
    ]

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

    const sortedFiles = Array.from(usagesByFile.keys()).sort()

    for (const filePath of sortedFiles) {
      const usages = usagesByFile.get(filePath)!
      usages.sort((a, b) => a.line - b.line)

      lines.push(`File: ${filePath}`)

      for (const usage of usages) {
        const displayContent
          = usage.content.length > USAGE_SEARCH.MAX_LINE_LENGTH_DISPLAY
            ? `${usage.content.slice(0, USAGE_SEARCH.MAX_LINE_LENGTH_DISPLAY)}...`
            : usage.content
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
  catch (error) {
    logger.error('Find usage failed:', error)
    throw error
  }
}

interface UsageResult {
  filePath: string
  lineNumber: number
  lineContent: string
  context?: string
}

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

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getFileExtension(language: string): string {
  const langExtensions = LANGUAGE_EXTENSIONS[language.toLowerCase()]
  return langExtensions?.[0]?.slice(1) ?? language
}

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
        const type = USAGE_SEARCH.CLASS_PATTERNS.some(pattern => line.toLowerCase().includes(pattern))
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
