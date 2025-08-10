/**
 * Initialize Project MCP tool - Sets up project indexing and file watching
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { resolve } from 'path';
import chalk from 'chalk';
import { DIRECTORIES, DEFAULT_IGNORE_DIRS } from '../../constants/service-constants.js';
import { SUCCESS } from '../../constants/messages.js';
import type { InitializeProjectArgs, Config } from '../../types/index.js';
import { TreeManager } from '../../core/tree-manager.js';
import { BatchFileWatcher } from '../../core/file-watcher.js';
import { getLogger } from '../../utils/logger.js';
import { formatBytes } from '../../utils/helpers.js';
import { findProjectRoot, findProjectRootWithMonoRepo } from '../../utils/project-detection.js';

/**
 * Initializes a project for fast code search and analysis
 *
 * This tool provides explicit project setup with:
 * - Directory structure analysis and mono-repo detection
 * - Complete AST indexing of all supported code files
 * - Memory usage calculation and optimization
 * - Optional file watching for live updates
 * - Comprehensive project statistics and reporting
 *
 * While search_code can auto-initialize projects, this tool is recommended for:
 * - Large codebases that benefit from explicit setup
 * - Projects requiring specific configuration
 * - Situations where you want detailed initialization feedback
 *
 * @param args - Initialization parameters including directory, languages, and options
 * @param treeManager - Tree manager for project creation and indexing
 * @param fileWatcher - File watcher for monitoring changes
 * @returns Detailed initialization results and project statistics
 * @throws Error if initialization fails
 */
export async function initializeProject(
  args: InitializeProjectArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher
): Promise<TextContent> {
  const logger = getLogger();

  try {
    const projectDir = args.directory ? resolve(args.directory) : findProjectRoot();
    const monoRepoInfo = await findProjectRootWithMonoRepo(args.directory);
    logger.info(`Using project directory: ${projectDir}`);

    if (monoRepoInfo.isMonoRepo && monoRepoInfo.subProjects.length > 0) {
      logger.info(`Detected mono-repo with ${monoRepoInfo.subProjects.length} sub-projects`);
      for (const subProject of monoRepoInfo.subProjects) {
        logger.info(`  • ${subProject.path}: ${subProject.languages.join(', ')}`);
      }
    }

    const config: Config = {
      workingDir: projectDir,
      languages: args.languages || [],
      maxDepth: args.maxDepth || DIRECTORIES.DEFAULT_MAX_DEPTH,
      ignoreDirs: args.ignoreDirs || DEFAULT_IGNORE_DIRS,
    };

    const project = treeManager.createProject(args.projectId, config);

    if (!project.initialized) {
      await treeManager.initializeProject(args.projectId);
    }

    if (args.autoWatch !== false) {
      fileWatcher.startWatching(args.projectId, config);
    }

    const stats = treeManager.getProjectStats(args.projectId);

    const lines = [
      `${chalk.green('[OK]')} ${SUCCESS.PROJECT_INITIALIZED}`,
      '',
      `Project ID: ${args.projectId}`,
      `Directory: ${config.workingDir}`,
      `Files: ${stats.totalFiles}`,
      `Code Elements: ${stats.totalNodes}`,
      `Memory Usage: ${formatBytes(stats.memoryUsage)}`,
    ];

    if (monoRepoInfo.isMonoRepo) {
      lines.push('', chalk.blue('[MONO-REPO] Detected mono-repository'));
      if (monoRepoInfo.subProjects.length > 0) {
        lines.push(`Sub-projects found: ${monoRepoInfo.subProjects.length}`);
        for (const subProject of monoRepoInfo.subProjects) {
          const relativePath = subProject.path.replace(config.workingDir + '/', '');
          lines.push(`  • ${relativePath}: ${subProject.languages.join(', ')}`);
        }
      }
    }

    lines.push('', 'Languages detected:');
    for (const [lang, count] of Object.entries(stats.languages)) {
      lines.push(`  • ${lang}: ${count} files`);
    }

    if (args.autoWatch !== false) {
      lines.push('', chalk.green('[WATCH] File watching: ENABLED'));
    }

    lines.push('', 'You can now use search_code to find any code element instantly!');

    return {
      type: 'text',
      text: lines.join('\n'),
    };
  } catch (error) {
    logger.error('Failed to initialize project:', error);
    throw error;
  }
}
