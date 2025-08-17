/**
 * File and stdout output handling
 */

import { logVerbose } from '../project/logger-control.js'

/**
 * Write output to file or stdout
 */
export async function writeSearchOutput(
  jsonOutput: string,
  outputFile?: string,
  verbose: boolean = false,
): Promise<void> {
  if (outputFile) {
    await writeToFile(jsonOutput, outputFile, verbose)
  }
  else {
    process.stdout.write(jsonOutput + '\n')
  }
}

/**
 * Write JSON output to specified file
 */
export async function writeToFile(
  jsonOutput: string,
  filePath: string,
  verbose: boolean = false,
): Promise<void> {
  try {
    const { writeFileSync } = await import('fs')
    writeFileSync(filePath, jsonOutput)

    logVerbose(verbose, `Output written to: ${filePath}`)
  }
  catch (error) {
    throw new Error(`Failed to write output to file: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Log completion message if verbose mode is enabled
 */
export function logSearchCompletion(resultCount: number, verbose: boolean): void {
  logVerbose(verbose, `Search complete! Found ${resultCount} results`)
}