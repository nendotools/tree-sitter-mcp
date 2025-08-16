/**
 * Single project status formatter
 */

import chalk from 'chalk'
import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { formatBytes, formatDuration } from '../../../utils/helpers.js'
import type { ProjectStatusContext, StatusFormatter } from './types.js'

/**
 * Formats status for a single specific project
 */
export class SingleProjectFormatter implements StatusFormatter {
  canHandle(context: ProjectStatusContext): boolean {
    return Boolean(context.args.projectId)
  }

  format(context: ProjectStatusContext): TextContent {
    const lines: string[] = []
    const { projectId } = context.args

    // Get project data
    const project = context.treeManager.getProject(projectId!)
    const stats = context.treeManager.getProjectStats(projectId!)
    const watcher = context.fileWatcher.getWatcher(projectId!)
    const watcherStatus = watcher?.getStatus()

    // Format header
    lines.push(`=== Project Status: ${projectId} ===`)
    lines.push('─'.repeat(40))

    // Format basic info
    this.formatBasicInfo(lines, project, stats)

    // Format languages
    this.formatLanguages(lines, stats)

    // Format element types
    this.formatElementTypes(lines, stats)

    // Format file watcher
    this.formatFileWatcher(lines, watcherStatus)

    return {
      type: 'text',
      text: lines.join('\n'),
    }
  }

  private formatBasicInfo(lines: string[], project: any, stats: any): void {
    lines.push(`Directory: ${project.config.workingDir}`)
    lines.push(`Initialized: ${project.initialized ? chalk.green('[YES]') : chalk.red('[NO]')}`)
    lines.push(`Files: ${stats.totalFiles}`)
    lines.push(`Code Elements: ${stats.totalNodes}`)
    lines.push(`Memory Usage: ${formatBytes(stats.memoryUsage)}`)
    lines.push(`Last Updated: ${stats.lastUpdate.toLocaleString()}`)
  }

  private formatLanguages(lines: string[], stats: any): void {
    if (Object.keys(stats.languages).length > 0) {
      lines.push('\nLanguages:')
      for (const [lang, count] of Object.entries(stats.languages)) {
        lines.push(`  • ${lang}: ${count} files`)
      }
    }
  }

  private formatElementTypes(lines: string[], stats: any): void {
    if (stats.nodeTypes && Object.keys(stats.nodeTypes).length > 0) {
      lines.push('\nElement Types:')
      for (const [type, count] of Object.entries(stats.nodeTypes)) {
        lines.push(`  • ${type}: ${count}`)
      }
    }
  }

  private formatFileWatcher(lines: string[], watcherStatus: any): void {
    lines.push('\nFile Watcher:')
    if (watcherStatus) {
      lines.push(`  Status: ${chalk.green('[ACTIVE]')}`)
      lines.push(`  Files Tracked: ${watcherStatus.filesTracked}`)
      if (watcherStatus.lastCheck) {
        const ago = Date.now() - watcherStatus.lastCheck.getTime()
        lines.push(`  Last Check: ${formatDuration(ago)} ago`)
      }
    }
    else {
      lines.push(`  Status: ${chalk.red('[INACTIVE]')}`)
    }
  }
}