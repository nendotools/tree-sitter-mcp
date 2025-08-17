/**
 * Analysis configuration utilities
 * Extends existing CLI config functionality for analysis-specific needs
 */

import { readFileSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { findProjectRoot } from '../../utils/project-detection.js'
import { parseLanguages } from '../search/config/cli-config.js'
import type { Config } from '../../types/index.js'

export interface AnalysisTarget {
  projectRoot: string
  targetFile?: string
  isFile: boolean
}

export interface AnalysisOptions {
  languages?: string
  includeMetrics?: boolean
  [key: string]: unknown
}

/**
 * Resolve analysis target (file or directory) and find project root
 */
export function resolveAnalysisTarget(target: string): AnalysisTarget {
  try {
    const stat = statSync(resolve(target))
    if (stat.isFile()) {
      // Target is a file - find project root from file's directory
      const targetFile = resolve(target)
      const projectRoot = findProjectRoot(dirname(targetFile))
      return { projectRoot, targetFile, isFile: true }
    }
    else {
      // Target is a directory - find project root from directory
      const projectRoot = findProjectRoot(resolve(target))
      return { projectRoot, isFile: false }
    }
  }
  catch {
    // If stat fails, assume directory and find project root
    const projectRoot = findProjectRoot(resolve(target))
    return { projectRoot, isFile: false }
  }
}

/**
 * Create analysis configuration with smart language detection
 * Extends base functionality with framework-specific detection
 */
export function createAnalysisConfig(
  projectRoot: string,
  options: AnalysisOptions,
): Config {
  // Parse languages or use smart defaults for JS/TS projects
  const baseLanguages = options.languages
    ? parseLanguages(options.languages)
    : ['typescript', 'javascript', 'tsx', 'jsx']

  // Smart language enhancement
  const languages = enhanceLanguagesWithFrameworks(baseLanguages, projectRoot)

  return {
    workingDir: projectRoot,
    languages,
    maxDepth: 10,
    ignoreDirs: [
      'node_modules', '.git', 'dist', 'build', 'out', 'lib',
      'coverage', '.next', 'target', 'bin', '.turbo', '.cache',
      '__pycache__', '.pytest_cache', '.mypy_cache',
    ],
  }
}

/**
 * Enhance language list with framework-specific languages
 * Extends existing language detection with smart framework detection
 */
function enhanceLanguagesWithFrameworks(languages: string[], projectRoot: string): string[] {
  const enhanced = [...languages]

  // Auto-include JSON for JS/TS projects (package.json, configs)
  const isJsProject = languages.some(lang =>
    ['typescript', 'javascript', 'tsx', 'jsx'].includes(lang),
  )
  if (isJsProject && !enhanced.includes('json')) {
    enhanced.push('json')
  }

  // Auto-include Vue for Vue/Nuxt projects
  if (detectVueFramework(projectRoot) && !enhanced.includes('vue')) {
    enhanced.push('vue')
  }

  return enhanced
}

/**
 * Detect Vue/Nuxt framework from package.json dependencies
 */
function detectVueFramework(projectRoot: string): boolean {
  const packageJsonPaths = [
    `${projectRoot}/package.json`,
    `${projectRoot}/client/package.json`, // Common mono-repo pattern
    `${projectRoot}/frontend/package.json`, // Alternative pattern
  ]

  for (const packageJsonPath of packageJsonPaths) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }

      if (allDeps.vue || allDeps.nuxt || allDeps['@nuxt/core']) {
        return true
      }
    }
    catch {
      // Try next path
      continue
    }
  }

  return false
}