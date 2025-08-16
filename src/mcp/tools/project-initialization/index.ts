/**
 * Project initialization orchestrator
 */

import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { TreeManager } from '../../../core/tree-manager.js'
import type { BatchFileWatcher } from '../../../core/file-watcher.js'
import type { InitializeProjectArgs, ProjectInitContext } from './types.js'
import { validateProjectInitialization } from './validation.js'
import { resolveDirectoryAndDetectMonoRepo } from './directory-resolution.js'
import { buildProjectConfig, createAndInitializeProject, setupFileWatching } from './project-creation.js'
import { formatInitializationResult } from './output-formatting.js'
import { withErrorHandling } from './error-handling.js'

/**
 * Initialize project using modular initialization system
 */
export async function initializeProject(
  args: InitializeProjectArgs,
  treeManager: TreeManager,
  fileWatcher: BatchFileWatcher,
): Promise<TextContent> {
  return await withErrorHandling(async () => {
    // Phase 1: Directory resolution and mono-repo detection
    const { projectDir, monoRepoInfo } = await resolveDirectoryAndDetectMonoRepo(args.directory)

    // Phase 2: Validation
    await validateProjectInitialization(args, treeManager, projectDir)

    // Phase 3: Configuration building
    const config = buildProjectConfig(args, projectDir)

    // Phase 4: Project creation and initialization
    const context: ProjectInitContext = {
      args,
      treeManager,
      fileWatcher,
      projectDir,
      config,
    }

    await createAndInitializeProject(context)

    // Phase 5: File watching setup
    setupFileWatching(context)

    // Phase 6: Statistics collection and output formatting
    const stats = treeManager.getProjectStats(args.projectId)
    return formatInitializationResult(context, monoRepoInfo, stats)
  })
}

// Re-export types for external use
export type {
  InitializeProjectArgs,
  ProjectInitContext,
  MonoRepoInfo,
  SubProject,
  ProjectValidationResult,
  ProjectStats,
} from './types.js'