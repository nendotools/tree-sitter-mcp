/**
 * File watcher for monitoring changes
 */

import { watch, FSWatcher } from 'chokidar';
import { WATCHER, CHANGE_EVENTS } from '../constants/index.js';
import type { Config, WatcherStatus } from '../types/index.js';
import { getLogger } from '../utils/logger.js';
import { debounce } from '../utils/helpers.js';
import { TreeManager } from './tree-manager.js';

export class FileWatcher {
  private treeManager: TreeManager;
  private projectId: string;
  private config: Config;
  private watcher: FSWatcher | null = null;
  private logger = getLogger();
  private watching: boolean = false;
  private filesTracked: number = 0;
  private lastCheck: Date = new Date();

  constructor(treeManager: TreeManager, projectId: string, config: Config) {
    this.treeManager = treeManager;
    this.projectId = projectId;
    this.config = config;
  }

  start(): void {
    if (this.watching) {
      this.logger.warn(`Watcher already running for project ${this.projectId}`);
      return;
    }

    this.logger.info(`Starting file watcher for project ${this.projectId}`);

    // Create debounced update function
    const debouncedUpdate = debounce(
      (path: string) => this.handleFileChange(path),
      WATCHER.DEBOUNCE_MS
    );

    // Initialize watcher
    this.watcher = watch(this.config.workingDir, {
      ignored: this.config.ignoreDirs || [],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: WATCHER.DEBOUNCE_MS,
        pollInterval: 100,
      },
    });

    // Set up event handlers
    this.watcher
      .on('add', path => {
        this.filesTracked++;
        debouncedUpdate(path);
        this.logChange(CHANGE_EVENTS.CREATED, path);
      })
      .on('change', path => {
        debouncedUpdate(path);
        this.logChange(CHANGE_EVENTS.MODIFIED, path);
      })
      .on('unlink', path => {
        this.filesTracked--;
        debouncedUpdate(path);
        this.logChange(CHANGE_EVENTS.DELETED, path);
      })
      .on('error', error => {
        this.logger.error(`Watcher error for project ${this.projectId}:`, error);
      })
      .on('ready', () => {
        this.watching = true;
        this.logger.info(`File watcher ready for project ${this.projectId}`);
      });
  }

  stop(): void {
    if (this.watcher) {
      void this.watcher.close();
      this.watcher = null;
      this.watching = false;
      this.logger.info(`File watcher stopped for project ${this.projectId}`);
    }
  }

  getStatus(): WatcherStatus {
    return {
      watching: this.watching,
      projectId: this.projectId,
      workingDir: this.config.workingDir,
      pollInterval: WATCHER.POLL_INTERVAL_MS,
      filesTracked: this.filesTracked,
      lastCheck: this.lastCheck,
    };
  }

  private async handleFileChange(path: string): Promise<void> {
    this.lastCheck = new Date();
    
    try {
      await this.treeManager.updateFile(this.projectId, path);
    } catch (error) {
      this.logger.error(`Failed to update file ${path}:`, error);
    }
  }

  private logChange(type: string, path: string): void {
    this.logger.debug(`File ${type}: ${path} (project: ${this.projectId})`);
  }
}

export class BatchFileWatcher {
  private watchers: Map<string, FileWatcher> = new Map();
  private treeManager: TreeManager;
  private logger = getLogger();

  constructor(treeManager: TreeManager) {
    this.treeManager = treeManager;
  }

  startWatching(projectId: string, config: Config): void {
    if (this.watchers.has(projectId)) {
      this.logger.debug(`Watcher already exists for project ${projectId}`);
      return;
    }

    const watcher = new FileWatcher(this.treeManager, projectId, config);
    watcher.start();
    this.watchers.set(projectId, watcher);
  }

  stopWatching(projectId: string): void {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      watcher.stop();
      this.watchers.delete(projectId);
    }
  }

  stopAll(): void {
    for (const watcher of this.watchers.values()) {
      watcher.stop();
    }
    this.watchers.clear();
  }

  getWatcher(projectId: string): FileWatcher | undefined {
    return this.watchers.get(projectId);
  }

  getAllStatuses(): WatcherStatus[] {
    return Array.from(this.watchers.values()).map(w => w.getStatus());
  }
}