/**
 * Project initialization output formatting
 */

import chalk from 'chalk'
import { SUCCESS_MESSAGES as SUCCESS } from '../../../constants/app-constants.js'
import { formatBytes } from '../../../utils/helpers.js'
import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { ProjectInitContext, MonoRepoInfo, ProjectStats } from './types.js'

/**
 * Format basic project information
 */
function formatBasicProjectInfo(context: ProjectInitContext, stats: ProjectStats): string[] {
  const { args, config } = context

  return [
    `${chalk.green('[OK]')} ${SUCCESS.PROJECT_INITIALIZED}`,
    '',
    `Project ID: ${args.projectId}`,
    `Directory: ${config.workingDir}`,
    `Files: ${stats.totalFiles}`,
    `Code Elements: ${stats.totalNodes}`,
    `Memory Usage: ${formatBytes(stats.memoryUsage)}`,
  ]
}

/**
 * Format mono-repo information
 */
function formatMonoRepoInfo(monoRepoInfo: MonoRepoInfo, workingDir: string): string[] {
  if (!monoRepoInfo.isMonoRepo) {
    return []
  }

  const lines = ['', chalk.blue('[MONO-REPO] Detected mono-repository')]

  if (monoRepoInfo.subProjects.length > 0) {
    lines.push(`Sub-projects found: ${monoRepoInfo.subProjects.length}`)
    for (const subProject of monoRepoInfo.subProjects) {
      const relativePath = subProject.path.replace(workingDir + '/', '')
      lines.push(`  • ${relativePath}: ${subProject.languages.join(', ')}`)
    }
  }

  return lines
}

/**
 * Format detected languages
 */
function formatLanguageInfo(stats: ProjectStats): string[] {
  const lines = ['', 'Languages detected:']

  for (const [lang, count] of Object.entries(stats.languages)) {
    lines.push(`  • ${lang}: ${count} files`)
  }

  return lines
}

/**
 * Format file watching status
 */
function formatWatchingStatus(autoWatch: boolean): string[] {
  if (autoWatch !== false) {
    return ['', chalk.green('[WATCH] File watching: ENABLED')]
  }
  return []
}

/**
 * Format completion message
 */
function formatCompletionMessage(): string[] {
  return ['', 'You can now use search_code to find any code element instantly!']
}

/**
 * Format complete initialization result output
 */
export function formatInitializationResult(
  context: ProjectInitContext,
  monoRepoInfo: MonoRepoInfo,
  stats: ProjectStats,
): TextContent {
  const lines = [
    ...formatBasicProjectInfo(context, stats),
    ...formatMonoRepoInfo(monoRepoInfo, context.config.workingDir),
    ...formatLanguageInfo(stats),
    ...formatWatchingStatus(context.args.autoWatch ?? true),
    ...formatCompletionMessage(),
  ]

  return {
    type: 'text',
    text: lines.join('\n'),
  }
}