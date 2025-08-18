/**
 * Simplified file walker - replaces complex FileWalker class
 */

import { readdir, stat } from 'fs/promises'
import { join, resolve, extname } from 'path'
import { getLanguageByExtension } from './languages.js'
import { getLogger } from '../utils/logger.js'
import { isTestFile } from '../constants/index.js'

const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'target', 'build', 'dist', 'out',
  '.next', '.nuxt', '.output', '.cache', '.tmp', 'vendor', '__pycache__',
  '.vscode', '.idea', 'coverage', '.nyc_output', 'venv', '.venv', '.env',
  '.pytest_cache', '.mypy_cache', '.tox', 'htmlcov', '.coverage',
  'test', 'tests', '__tests__', 'spec', 'specs', '__test__',
])

export interface WalkOptions {
  maxDepth?: number
  ignoreDirs?: string[]
  languages?: string[]
  includeHidden?: boolean
}

export async function walkDirectory(
  directory: string,
  options: WalkOptions = {},
): Promise<string[]> {
  const logger = getLogger()
  const {
    maxDepth = 10,
    ignoreDirs = [],
    languages = [],
    includeHidden = false,
  } = options

  const ignoreDirSet = new Set([...DEFAULT_IGNORE_DIRS, ...ignoreDirs])
  const files: string[] = []

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth >= maxDepth) return

    try {
      const entries = await readdir(dir)

      for (const entry of entries) {
        if (!includeHidden && entry.startsWith('.')) continue

        const fullPath = join(dir, entry)
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          if (!includeHidden && entry.startsWith('.')) {
            continue
          }
          if (!ignoreDirSet.has(entry)) {
            await walk(fullPath, depth + 1)
          }
        }
        else if (stats.isFile()) {
          if (!includeHidden && entry.startsWith('.')) {
            continue
          }

          if (isTestFile(entry)) {
            continue
          }

          const language = getLanguageByExtension(extname(fullPath))

          if (languages.length === 0 || (language && languages.includes(language.name))) {
            files.push(resolve(fullPath))
          }
        }
      }
    }
    catch (error) {
      logger.warn(`Failed to read directory ${dir}:`, error)
    }
  }

  await walk(directory, 0)
  return files
}

export async function findProjectFiles(directory: string, languages?: string[]): Promise<string[]> {
  return walkDirectory(directory, {
    maxDepth: 15,
    languages,
    includeHidden: false,
  })
}