/**
 * CLI search workflow orchestrator
 */

import { resolve } from 'path'
import { getLogger } from '../../utils/logger.js'
import type { CLIOptions } from '../../types/index.js'

// Configuration
import { createSearchConfig, validateDirectory, type CLISearchOptions } from './config/cli-config.js'
import { createSearchOptions, validateQuery } from './config/search-options.js'

// Project management
import { createTreeManager, initializeSearchProject, cleanupSearchProject } from './project/manager.js'
import { suppressInfoMessages, logVerbose } from './project/logger-control.js'

// Search execution
import { executeSearchWithContext } from './execution/search-runner.js'
import { createSearchOutput } from './execution/results-mapper.js'

// Output handling
import { formatSearchOutput } from './output/formatter.js'
import { writeSearchOutput, logSearchCompletion } from './output/writer.js'

/**
 * Execute CLI search workflow with modular architecture
 */
export async function handleSearch(
  query: string,
  directory: string,
  options: CLISearchOptions,
  cliOpts: CLIOptions,
): Promise<void> {
  const logger = getLogger()

  // Log initial search parameters if verbose
  logVerbose(cliOpts.verbose || false, `Searching for: ${query}`)
  logVerbose(cliOpts.verbose || false, `Directory: ${resolve(directory)}`)

  let treeManager
  let restoreLogger: (() => void) | null = null

  try {
    // Phase 1: Configuration setup
    validateQuery(query)
    validateDirectory(directory)
    const config = await createSearchConfig(directory, options, cliOpts)
    const searchOptions = createSearchOptions(options)

    // Phase 2: Project management setup
    treeManager = await createTreeManager()
    restoreLogger = suppressInfoMessages(cliOpts.verbose || false)

    // Initialize temporary project for search
    const projectId = await initializeSearchProject(treeManager, config)

    // Restore logger settings after initialization
    if (restoreLogger) {
      restoreLogger()
      restoreLogger = null
    }

    // Phase 3: Search execution
    const { results } = await executeSearchWithContext(
      treeManager,
      projectId,
      query,
      searchOptions,
    )

    // Phase 4: Results processing and output formatting
    const searchOutput = createSearchOutput(query, directory, searchOptions, results)
    const jsonOutput = formatSearchOutput(searchOutput, options.pretty)

    // Phase 5: Output handling
    await writeSearchOutput(jsonOutput, options.output, cliOpts.verbose || false)
    logSearchCompletion(results.length, cliOpts.verbose || false)
  }
  catch (error) {
    // Restore logger state if needed
    if (restoreLogger) {
      restoreLogger()
    }

    logger.error('Search failed:', error)
    process.exit(1)
  }
  finally {
    // Clean up resources
    if (treeManager) {
      await cleanupSearchProject(treeManager)
    }
  }
}

// Re-export types for external use
export type { CLISearchOptions } from './config/cli-config.js'