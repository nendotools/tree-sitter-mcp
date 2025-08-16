/**
 * All projects status formatter
 */

import chalk from 'chalk'
import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import { formatBytes } from '../../../utils/helpers.js'
import type { ProjectStatusContext, StatusFormatter } from './types.js'

/**
 * Formats status for all projects overview
 */
export class AllProjectsFormatter implements StatusFormatter {
  canHandle(context: ProjectStatusContext): boolean {
    return !context.args.projectId
  }

  format(context: ProjectStatusContext): TextContent {
    const lines: string[] = []
    const projects = context.treeManager.getAllProjects()

    // Format header
    lines.push(`=== All Projects (${projects.length} total) ===`)
    lines.push('═'.repeat(50))

    // Format each project
    for (const proj of projects) {
      this.formatProject(lines, proj, context.fileWatcher)
    }

    // Format legend
    this.formatLegend(lines)

    return {
      type: 'text',
      text: lines.join('\n'),
    }
  }

  private formatProject(lines: string[], proj: any, fileWatcher: any): void {
    const watcher = fileWatcher.getWatcher(proj.projectId)
    const watcherSymbol = watcher ? chalk.green('[ACTIVE]') : chalk.red('[INACTIVE]')

    lines.push('')
    lines.push(`${watcherSymbol} ${proj.projectId}`)
    lines.push(`   Directory: ${proj.workingDir}`)
    lines.push(`   Initialized: ${proj.initialized ? 'Yes' : 'No'}`)
    lines.push(`   Memory: ${formatBytes(proj.memoryUsage)}`)
    lines.push(`   Created: ${proj.createdAt.toLocaleString()}`)
    lines.push(`   Last Accessed: ${proj.accessedAt.toLocaleString()}`)
  }

  private formatLegend(lines: string[]): void {
    lines.push('')
    lines.push(
      `Legend: ${chalk.green('[ACTIVE]')} = Watcher Active, ${chalk.red('[INACTIVE]')} = Watcher Inactive`,
    )
  }
}