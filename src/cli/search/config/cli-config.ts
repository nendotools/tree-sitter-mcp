/**
 * CLI options to Config conversion utilities
 */

import { resolve } from 'path'
import type { Config, CLIOptions } from '../../../types/index.js'

export interface CLISearchOptions {
  languages?: string
  types?: string
  output?: string
  exact?: boolean
  pretty?: boolean
  maxResults?: string
}

/**
 * Convert CLI options to internal Config format
 */
export async function createSearchConfig(
  directory: string,
  options: CLISearchOptions,
  cliOpts: CLIOptions,
): Promise<Config> {
  const { DEFAULT_IGNORE_DIRS } = await import('../../../constants/service-constants.js')

  return {
    workingDir: resolve(directory),
    languages: parseLanguages(options.languages),
    maxDepth: 10,
    ignoreDirs: DEFAULT_IGNORE_DIRS,
    verbose: cliOpts.verbose,
    quiet: cliOpts.quiet,
  }
}

/**
 * Parse comma-separated languages string into array
 */
export function parseLanguages(languagesString?: string): string[] {
  if (!languagesString) return []
  return languagesString.split(',').map(l => l.trim()).filter(Boolean)
}

/**
 * Validate directory path and ensure it's accessible
 */
export function validateDirectory(directory: string): string {
  const resolvedPath = resolve(directory)
  // Additional validation could be added here if needed
  return resolvedPath
}