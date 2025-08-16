/**
 * Parse execution and timing utilities
 */

import type { FileProcessingContext, ParseExecutionResult } from './types.js'

/**
 * Execute parsing with timing and error handling
 */
export async function executeParsing(
  context: FileProcessingContext,
  content: string,
): Promise<ParseExecutionResult> {
  const { filePath, fileName, parserRegistry, logger } = context

  try {
    const parseStartTime = performance.now()
    const result = await parserRegistry.parseFile(filePath, content)
    const duration = performance.now() - parseStartTime

    if (result) {
      logger.debug(`⚡ Parse success: ${fileName} (${result.elements.length} elements, ${duration.toFixed(2)}ms)`)
      return { success: true, result, duration }
    }
    else {
      const reason = `❌ Parse failed: ${fileName} (${duration.toFixed(2)}ms)`
      logger.debug(reason)
      return { success: false, duration, reason }
    }
  }
  catch (error) {
    const reason = `❌ Parse error: ${fileName}`
    logger.debug(reason, error)
    return { success: false, duration: 0, reason }
  }
}