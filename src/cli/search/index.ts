/**
 * CLI search workflow orchestrator
 */

import { resolve } from 'path'
import { getLogger } from '../../utils/logger.js'
import type { CLIOptions } from '../../types/index.js'

import { createSearchConfig, validateDirectory, type CLISearchOptions } from './config/cli-config.js'
import { createSearchOptions, validateQuery } from './config/search-options.js'
import { createTreeManager, initializeSearchProject, cleanupSearchProject } from './project/manager.js'
import { suppressInfoMessages, logVerbose } from './project/logger-control.js'
import { executeSearchWithContext } from './execution/search-runner.js'
import { createSearchOutput } from './execution/results-mapper.js'
import { formatSearchOutput } from './output/formatter.js'
import { writeSearchOutput, logSearchCompletion } from './output/writer.js'

/**
 * Executes CLI search workflow with comprehensive error handling and resource cleanup
 *
 * @param query - Search query string
 * @param directory - Directory to search in
 * @param options - CLI search options
 * @param cliOpts - General CLI options
 */
export async function handleSearch(
  query: string,
  directory: string,
  options: CLISearchOptions,
  cliOpts: CLIOptions,
): Promise<void> {
  const logger = getLogger()
  const verbose = cliOpts.verbose || false

  logVerbose(verbose, `Searching for: ${query}`)
  logVerbose(verbose, `Directory: ${resolve(directory)}`)

  let treeManager
  let restoreLogger: (() => void) | null = null

  try {
    validateQuery(query)
    validateDirectory(directory)
    const config = await createSearchConfig(directory, options, cliOpts)
    const searchOptions = createSearchOptions(options)

    treeManager = await createTreeManager()
    restoreLogger = suppressInfoMessages(verbose)
    const projectId = await initializeSearchProject(treeManager, config)

    if (restoreLogger) {
      restoreLogger()
      restoreLogger = null
    }

    const { results } = await executeSearchWithContext(treeManager, projectId, query, searchOptions)
    const searchOutput = createSearchOutput(query, directory, searchOptions, results)
    const jsonOutput = formatSearchOutput(searchOutput, options.pretty)

    await writeSearchOutput(jsonOutput, options.output, verbose)
    logSearchCompletion(results.length, verbose)
  }
  catch (error) {
    if (restoreLogger) {
      restoreLogger()
    }
    logger.error('Search failed:', error)
    process.exit(1)
  }
  finally {
    if (treeManager) {
      await cleanupSearchProject(treeManager)
    }
  }
}

export type { CLISearchOptions } from './config/cli-config.js'