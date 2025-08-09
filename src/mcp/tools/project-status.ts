/**
 * Project Status tool implementation
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectStatusArgs } from '../../types/index.js';
import { TreeManager } from '../../core/tree-manager.js';
import { BatchFileWatcher } from '../../core/file-watcher.js';
import { getLogger } from '../../utils/logger.js';
import { formatBytes, formatDuration } from '../../utils/helpers.js';

export function projectStatus(
  args: ProjectStatusArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher
): TextContent {
  const logger = getLogger();

  try {
    const lines: string[] = [];

    if (args.projectId) {
      // Get specific project status
      const project = treeManager.getProject(args.projectId);
      if (!project) {
        return {
          type: 'text',
          text: `Project "${args.projectId}" not found.`,
        };
      }

      const stats = treeManager.getProjectStats(args.projectId);
      const watcher = fileWatcher.getWatcher(args.projectId);
      const watcherStatus = watcher?.getStatus();

      lines.push(`📊 Project Status: ${args.projectId}`);
      lines.push('─'.repeat(40));
      lines.push(`Directory: ${project.config.workingDir}`);
      lines.push(`Initialized: ${project.initialized ? '✅ Yes' : '❌ No'}`);
      lines.push(`Files: ${stats.totalFiles}`);
      lines.push(`Code Elements: ${stats.totalNodes}`);
      lines.push(`Memory Usage: ${formatBytes(stats.memoryUsage)}`);
      lines.push(`Last Updated: ${stats.lastUpdate.toLocaleString()}`);
      
      if (Object.keys(stats.languages).length > 0) {
        lines.push('\nLanguages:');
        for (const [lang, count] of Object.entries(stats.languages)) {
          lines.push(`  • ${lang}: ${count} files`);
        }
      }

      if (stats.nodeTypes && Object.keys(stats.nodeTypes).length > 0) {
        lines.push('\nElement Types:');
        for (const [type, count] of Object.entries(stats.nodeTypes)) {
          lines.push(`  • ${type}: ${count}`);
        }
      }

      lines.push('\nFile Watcher:');
      if (watcherStatus) {
        lines.push(`  Status: 🟢 Active`);
        lines.push(`  Files Tracked: ${watcherStatus.filesTracked}`);
        if (watcherStatus.lastCheck) {
          const ago = Date.now() - watcherStatus.lastCheck.getTime();
          lines.push(`  Last Check: ${formatDuration(ago)} ago`);
        }
      } else {
        lines.push(`  Status: 🔴 Inactive`);
      }
    } else {
      // Get all projects status
      const projects = treeManager.getAllProjects();
      
      if (projects.length === 0) {
        return {
          type: 'text',
          text: 'No projects initialized.\n\nUse initialize_project or search_code to get started.',
        };
      }

      lines.push(`📊 All Projects (${projects.length} total)`);
      lines.push('═'.repeat(50));

      for (const proj of projects) {
        const watcher = fileWatcher.getWatcher(proj.projectId);
        const watcherSymbol = watcher ? '🟢' : '🔴';
        
        lines.push('');
        lines.push(`${watcherSymbol} ${proj.projectId}`);
        lines.push(`   Directory: ${proj.workingDir}`);
        lines.push(`   Initialized: ${proj.initialized ? 'Yes' : 'No'}`);
        lines.push(`   Memory: ${formatBytes(proj.memoryUsage)}`);
        lines.push(`   Created: ${proj.createdAt.toLocaleString()}`);
        lines.push(`   Last Accessed: ${proj.accessedAt.toLocaleString()}`);
      }

      lines.push('');
      lines.push('Legend: 🟢 = Watcher Active, 🔴 = Watcher Inactive');
    }

    return {
      type: 'text',
      text: lines.join('\n'),
    };
  } catch (error) {
    logger.error('Failed to get project status:', error);
    throw error;
  }
}