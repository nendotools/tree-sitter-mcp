/**
 * Logger state management for clean CLI output
 */

import { getLogger } from '../../../utils/logger.js'

/**
 * Temporarily suppress info messages for clean search output
 */
export function suppressInfoMessages(verbose: boolean): () => void {
  const currentLogger = getLogger()

  // Store original quiet state
  const originalQuiet = 'setQuiet' in currentLogger ? (currentLogger as any).quiet : false

  // Suppress info messages unless in verbose mode
  if (!verbose && 'setQuiet' in currentLogger) {
    (currentLogger as any).setQuiet(true)
  }

  // Return restoration function
  return () => {
    if (!verbose && 'setQuiet' in currentLogger) {
      (currentLogger as any).setQuiet(originalQuiet)
    }
  }
}

/**
 * Log verbose information if verbose mode is enabled
 */
export function logVerbose(verbose: boolean, message: string, ...args: any[]): void {
  if (verbose) {
    const logger = getLogger()
    logger.info(message, ...args)
  }
}