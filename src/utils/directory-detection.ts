/**
 * Directory detection utilities for selective file watching
 */

import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { getLogger } from './logger.js'

/**
 * Common directory patterns that typically contain source code
 */
const CODE_DIRECTORY_PATTERNS = [
  // Primary source directories
  'src',
  'lib',
  'source',
  'app',

  // Component-specific directories
  'components',
  'views',
  'pages',
  'screens',

  // Utility and module directories
  'utils',
  'helpers',
  'modules',
  'services',

  // Monorepo patterns
  'packages',
  'apps',

  // Framework-specific patterns
  'client/src',
  'server/src',
  'frontend/src',
  'backend/src',
  'web/src',
  'api/src',

  // Build tool patterns
  'assets',
  'public/js',
  'static/js',
]

/**
 * Directories that should always be ignored for watching
 */
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/.cache/**',
  '**/tmp/**',
  '**/temp/**',
  '**/.DS_Store',
  '**/thumbs.db',
]

/**
 * Configuration for project type detection
 */
interface ProjectTypeConfig {
  name: string
  indicators: string[]
  primaryDirs: string[]
  secondaryDirs: string[]
}

const PROJECT_TYPE_CONFIGS: ProjectTypeConfig[] = [
  {
    name: 'vue',
    indicators: ['vue.config.js', 'nuxt.config.js', 'nuxt.config.ts'],
    primaryDirs: ['src', 'pages', 'components'],
    secondaryDirs: ['layouts', 'middleware', 'plugins', 'store', 'assets'],
  },
  {
    name: 'react',
    indicators: ['src/App.tsx', 'src/App.jsx', 'next.config.js'],
    primaryDirs: ['src', 'pages', 'components'],
    secondaryDirs: ['hooks', 'context', 'utils', 'services'],
  },
  {
    name: 'angular',
    indicators: ['angular.json', 'src/app/app.module.ts'],
    primaryDirs: ['src/app'],
    secondaryDirs: ['src/assets', 'src/environments'],
  },
  {
    name: 'node',
    indicators: ['package.json'],
    primaryDirs: ['src', 'lib'],
    secondaryDirs: ['routes', 'controllers', 'models', 'middleware'],
  },
  {
    name: 'monorepo',
    indicators: ['lerna.json', 'nx.json', 'rush.json'],
    primaryDirs: ['packages', 'apps'],
    secondaryDirs: ['libs', 'tools'],
  },
]

/**
 * Detects code directories that should be watched for file changes
 *
 * @param projectRoot - Root directory of the project
 * @returns Array of absolute paths to directories that should be watched
 */
export function detectCodeDirectories(projectRoot: string): string[] {
  const logger = getLogger()
  const watchedDirs: string[] = []

  try {
    // First, try project-specific detection
    const projectType = detectProjectType(projectRoot)
    if (projectType) {
      logger.debug(`Detected project type: ${projectType.name}`)

      // Add primary directories
      for (const dir of projectType.primaryDirs) {
        const fullPath = join(projectRoot, dir)
        if (existsSync(fullPath) && isDirectory(fullPath)) {
          watchedDirs.push(fullPath)
          logger.debug(`Added primary directory: ${fullPath}`)
        }
      }

      // Add secondary directories if they exist
      for (const dir of projectType.secondaryDirs) {
        const fullPath = join(projectRoot, dir)
        if (existsSync(fullPath) && isDirectory(fullPath)) {
          watchedDirs.push(fullPath)
          logger.debug(`Added secondary directory: ${fullPath}`)
        }
      }
    }

    // Fallback: scan for common code directory patterns
    if (watchedDirs.length === 0) {
      logger.debug('No project type detected, scanning for common patterns')

      for (const pattern of CODE_DIRECTORY_PATTERNS) {
        const fullPath = join(projectRoot, pattern)
        if (existsSync(fullPath) && isDirectory(fullPath)) {
          watchedDirs.push(fullPath)
          logger.debug(`Added pattern directory: ${fullPath}`)
        }
      }
    }

    // Final fallback: watch the root if no code directories found
    if (watchedDirs.length === 0) {
      logger.warn('No code directories detected, falling back to root directory')
      watchedDirs.push(projectRoot)
    }

    logger.info(`Code directories detected: ${watchedDirs.length}`)
    watchedDirs.forEach(dir => logger.debug(`  - ${dir}`))

    return watchedDirs
  }
  catch (error) {
    logger.error('Error detecting code directories:', error)
    // Emergency fallback
    return [projectRoot]
  }
}

/**
 * Detects the project type based on configuration files and structure
 *
 * @param projectRoot - Root directory of the project
 * @returns Project type configuration or null if not detected
 */
export function detectProjectType(projectRoot: string): ProjectTypeConfig | null {
  for (const config of PROJECT_TYPE_CONFIGS) {
    for (const indicator of config.indicators) {
      const indicatorPath = join(projectRoot, indicator)
      if (existsSync(indicatorPath)) {
        return config
      }
    }
  }

  return null
}

/**
 * Gets the ignore patterns for file watching
 *
 * @returns Array of glob patterns to ignore
 */
export function getIgnorePatterns(): string[] {
  return [...IGNORE_PATTERNS]
}

/**
 * Validates that all detected directories exist and are readable
 *
 * @param directories - Array of directory paths to validate
 * @returns Array of validated directory paths
 */
export function validateDirectories(directories: string[]): string[] {
  const logger = getLogger()
  const validDirs: string[] = []

  for (const dir of directories) {
    try {
      if (existsSync(dir) && isDirectory(dir)) {
        validDirs.push(dir)
      }
      else {
        logger.warn(`Directory not found or not accessible: ${dir}`)
      }
    }
    catch (error) {
      logger.warn(`Error accessing directory ${dir}:`, error)
    }
  }

  return validDirs
}

/**
 * Checks if a path is a directory
 *
 * @param path - Path to check
 * @returns True if path is a directory
 */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  }
  catch {
    return false
  }
}

/**
 * Gets a summary of the watching configuration for logging/debugging
 *
 * @param projectRoot - Root directory of the project
 * @returns Summary object with detection details
 */
export function getWatchingSummary(projectRoot: string) {
  const projectType = detectProjectType(projectRoot)
  const codeDirectories = detectCodeDirectories(projectRoot)
  const ignorePatterns = getIgnorePatterns()

  return {
    projectRoot,
    projectType: projectType?.name || 'unknown',
    watchedDirectories: codeDirectories,
    watchedCount: codeDirectories.length,
    ignorePatterns,
    ignoreCount: ignorePatterns.length,
  }
}