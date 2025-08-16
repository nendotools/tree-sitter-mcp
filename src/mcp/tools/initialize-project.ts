/**
 * Initialize Project MCP tool - Sets up project indexing and file watching
 */

import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { InitializeProjectArgs } from '../../types/index.js'
import type { TreeManager } from '../../core/tree-manager.js'
import type { BatchFileWatcher } from '../../core/file-watcher.js'
import { initializeProject as modularInitializeProject } from './project-initialization/index.js'

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
  fileWatcher: BatchFileWatcher,
): Promise<TextContent> {
  return await modularInitializeProject(args, treeManager, fileWatcher)
}
