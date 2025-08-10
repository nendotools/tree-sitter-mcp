/**
 * Project root detection utilities
 */

import { existsSync } from 'fs'
import { resolve, dirname } from 'path'

// Files/dirs that indicate project root
const PROJECT_ROOT_INDICATORS = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'pom.xml',
  'build.gradle',
  'tsconfig.json',
  '.git',
  '.gitignore',
  'README.md',
  'LICENSE',
]

/**
 * Find project root by traversing up from the current directory
 * looking for common project indicators
 */
export function findProjectRoot(startDir?: string): string {
  let currentDir = resolve(startDir || process.cwd())
  const rootDir = resolve('/')

  while (currentDir !== rootDir) {
    // Check if any project indicators exist in this directory
    for (const indicator of PROJECT_ROOT_INDICATORS) {
      const indicatorPath = resolve(currentDir, indicator)
      if (existsSync(indicatorPath)) {
        return currentDir
      }
    }

    // Move up one directory
    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      // We've reached the root and can't go up anymore
      break
    }
    currentDir = parentDir
  }

  // If no project root found, return the starting directory
  return resolve(startDir || process.cwd())
}
