/**
 * File watcher for monitoring file system changes and keeping the AST index synchronized
 */

import { watch, FSWatcher } from 'chokidar'
import { WATCHER, CHANGE_EVENTS } from '../constants/index.js'
import type { Config, WatcherStatus } from '../types/index.js'
import { getLogger } from '../utils/logger.js'
import { debounce } from '../utils/helpers.js'
import { detectCodeDirectories, getIgnorePatterns, validateDirectories, getWatchingSummary } from '../utils/directory-detection.js'
import { TreeManager } from './tree-manager.js'

/**
 * Single project file watcher that monitors file changes and updates the tree manager
 *
 * Features:
 * - Debounced file change handling to prevent excessive updates
 * - File tracking statistics
 * - Configurable ignore patterns
 * - Automatic retry on write completion
 */
export class FileWatcher {
  private treeManager: TreeManager
  private projectId: string
  private config: Config
  private watcher: FSWatcher | null = null
  private logger = getLogger()
  private watching: boolean = false
  private filesTracked: number = 0
  private lastCheck: Date = new Date()

  /**
   * Creates a new file watcher for a specific project
   *
   * @param treeManager - Tree manager to notify of changes
   * @param projectId - Unique project identifier
   * @param config - Project configuration with watch settings
   */
  constructor(treeManager: TreeManager, projectId: string, config: Config) {
    this.treeManager = treeManager
    this.projectId = projectId
    this.config = config
  }

  /**
   * Starts watching for file changes using selective directory watching
   *
   * Detects code directories automatically and watches only those directories
   * to avoid EMFILE errors while maintaining comprehensive coverage
   */
  start(): void {
    if (this.watching) {
      this.logger.warn(`Watcher already running for project ${this.projectId}`)
      return
    }

    this.logger.info(`Starting selective file watcher for project ${this.projectId}`)

    const debouncedUpdate = debounce(
      (path: string) => this.handleFileChange(path),
      WATCHER.DEBOUNCE_MS,
    )

    try {
      // Detect code directories to watch
      const codeDirectories = detectCodeDirectories(this.config.workingDir)
      const validDirectories = validateDirectories(codeDirectories)

      if (validDirectories.length === 0) {
        this.logger.warn(`No valid directories found for watching in project ${this.projectId}`)
        return
      }

      // Log watching summary for debugging
      const summary = getWatchingSummary(this.config.workingDir)
      this.logger.info(`Watching ${summary.watchedCount} directories for project ${this.projectId}`)
      this.logger.debug(`Project type: ${summary.projectType}`)
      validDirectories.forEach(dir => this.logger.debug(`  Watching: ${dir}`))

      // Combine user-specified ignore patterns with default patterns
      const allIgnorePatterns = [
        ...getIgnorePatterns(),
        ...(this.config.ignoreDirs || []),
      ]

      this.watcher = watch(validDirectories, {
        ignored: allIgnorePatterns,
        persistent: true,
        ignoreInitial: true,
        depth: undefined, // Unlimited depth within watched directories
        usePolling: false, // Use native fs.watch for better performance
        awaitWriteFinish: {
          stabilityThreshold: WATCHER.DEBOUNCE_MS,
          pollInterval: 100,
        },
      })
    }
    catch (error) {
      this.logger.error(`Failed to initialize selective directory watching for project ${this.projectId}:`, error)
      // Fallback to watching the working directory
      this.logger.warn(`Falling back to watching entire working directory: ${this.config.workingDir}`)

      this.watcher = watch(this.config.workingDir, {
        ignored: this.config.ignoreDirs || [],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: WATCHER.DEBOUNCE_MS,
          pollInterval: 100,
        },
      })
    }

    this.watcher
      .on('add', (path) => {
        this.filesTracked++
        debouncedUpdate(path)
        this.logChange(CHANGE_EVENTS.CREATED, path)
      })
      .on('change', (path) => {
        debouncedUpdate(path)
        this.logChange(CHANGE_EVENTS.MODIFIED, path)
      })
      .on('unlink', (path) => {
        this.filesTracked--
        debouncedUpdate(path)
        this.logChange(CHANGE_EVENTS.DELETED, path)
      })
      .on('error', (error) => {
        this.logger.error(`Watcher error for project ${this.projectId}:`, error)
      })
      .on('ready', () => {
        this.watching = true
        this.logger.info(`File watcher ready for project ${this.projectId}`)
      })
  }

  /**
   * Stops watching for file changes and cleans up resources
   */
  stop(): void {
    if (this.watcher) {
      void this.watcher.close()
      this.watcher = null
      this.watching = false
      this.logger.info(`File watcher stopped for project ${this.projectId}`)
    }
  }

  /**
   * Gets current watcher status including statistics
   *
   * @returns Current status object with watching state and metrics
   */
  getStatus(): WatcherStatus {
    return {
      watching: this.watching,
      projectId: this.projectId,
      workingDir: this.config.workingDir,
      pollInterval: WATCHER.POLL_INTERVAL_MS,
      filesTracked: this.filesTracked,
      lastCheck: this.lastCheck,
    }
  }

  /**
   * Handles a file change event by updating the tree manager
   *
   * @param path - Path of the changed file
   */
  private async handleFileChange(path: string): Promise<void> {
    this.lastCheck = new Date()

    try {
      await this.treeManager.updateFile(this.projectId, path)
    }
    catch (error) {
      this.logger.error(`Failed to update file ${path}:`, error)
    }
  }

  /**
   * Logs a file change event for debugging
   *
   * @param type - Type of change (created, modified, deleted)
   * @param path - Path of the changed file
   */
  private logChange(type: string, path: string): void {
    this.logger.debug(`File ${type}: ${path} (project: ${this.projectId})`)
  }
}

/**
 * Batch file watcher that manages multiple project watchers
 *
 * Provides centralized management for watching multiple projects simultaneously,
 * with individual watcher lifecycle management and status reporting
 */
export class BatchFileWatcher {
  private watchers: Map<string, FileWatcher> = new Map()
  private treeManager: TreeManager
  private logger = getLogger()

  /**
   * Creates a new batch file watcher
   *
   * @param treeManager - Tree manager to share across all project watchers
   */
  constructor(treeManager: TreeManager) {
    this.treeManager = treeManager
  }

  /**
   * Starts watching a new project directory
   *
   * @param projectId - Unique project identifier
   * @param config - Project configuration
   */
  startWatching(projectId: string, config: Config): void {
    if (this.watchers.has(projectId)) {
      this.logger.debug(`Watcher already exists for project ${projectId}`)
      return
    }

    const watcher = new FileWatcher(this.treeManager, projectId, config)
    watcher.start()
    this.watchers.set(projectId, watcher)
  }

  /**
   * Stops watching a specific project
   *
   * @param projectId - Project identifier to stop watching
   */
  stopWatching(projectId: string): void {
    const watcher = this.watchers.get(projectId)
    if (watcher) {
      watcher.stop()
      this.watchers.delete(projectId)
    }
  }

  /**
   * Stops all active watchers and cleans up resources
   */
  stopAll(): void {
    for (const watcher of this.watchers.values()) {
      watcher.stop()
    }
    this.watchers.clear()
  }

  /**
   * Gets a specific project watcher
   *
   * @param projectId - Project identifier
   * @returns The project's file watcher or undefined if not found
   */
  getWatcher(projectId: string): FileWatcher | undefined {
    return this.watchers.get(projectId)
  }

  /**
   * Gets status information for all active watchers
   *
   * @returns Array of watcher status objects
   */
  getAllStatuses(): WatcherStatus[] {
    return Array.from(this.watchers.values()).map(w => w.getStatus())
  }
}
