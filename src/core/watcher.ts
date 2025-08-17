/**
 * File change monitoring - simplified file watcher
 */

import { watch, FSWatcher } from 'chokidar'
import { debounce } from '../utils/helpers.js'
import { getLogger } from '../utils/logger.js'
import type { FileChange } from '../types/core.js'

export type FileChangeHandler = (changes: FileChange[]) => void

export interface WatchOptions {
  ignored?: string[]
  debounceMs?: number
  persistent?: boolean
}

export class FileWatcher {
  private watcher: FSWatcher | null = null
  private changes: FileChange[] = []
  private logger = getLogger()
  private flushChanges: () => void

  constructor(
    private directory: string,
    private handler: FileChangeHandler,
    options: WatchOptions = {},
  ) {
    const { debounceMs = 300 } = options
    this.flushChanges = debounce(() => {
      if (this.changes.length > 0) {
        this.handler([...this.changes])
        this.changes = []
      }
    }, debounceMs)
  }

  start(): void {
    if (this.watcher) return

    const options = {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.cache/**',
      ],
      persistent: true,
      ignoreInitial: true,
    }

    this.watcher = watch(this.directory, options)

    this.watcher
      .on('add', path => this.addChange('created', path))
      .on('change', path => this.addChange('modified', path))
      .on('unlink', path => this.addChange('deleted', path))
      .on('error', error => this.logger.error('File watcher error:', error))

    this.logger.info(`File watcher started for ${this.directory}`)
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
      this.logger.info('File watcher stopped')
    }
  }

  private addChange(type: FileChange['type'], path: string): void {
    this.changes.push({
      type,
      path,
      timestamp: Date.now(),
    })
    this.flushChanges()
  }
}

export function createFileWatcher(
  directory: string,
  handler: FileChangeHandler,
  options?: WatchOptions,
): FileWatcher {
  return new FileWatcher(directory, handler, options)
}