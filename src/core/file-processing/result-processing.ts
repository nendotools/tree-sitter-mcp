/**
 * Parse result processing and path normalization
 */

import { relative } from 'path'
import type { ParseResult } from '../../types/index.js'
import type { FileProcessingContext } from './types.js'

/**
 * Process successful parse result
 */
export function processParseResult(
  context: FileProcessingContext,
  result: ParseResult,
  addVueComponentFn: (result: ParseResult, relativePath: string) => void,
): void {
  const { fileName, config, logger } = context

  // Convert absolute path to relative for consistent indexing
  const relativePath = relative(config.workingDir, context.filePath)
  result.file.path = relativePath

  // Log existing elements before Vue component detection
  const beforeCount = result.elements.length
  logger.debug(`🧩 Elements before Vue detection: ${beforeCount}`)

  if (beforeCount > 0) {
    logElements(result.elements, logger, '   - ')
  }

  // Add Vue component detection based on file system patterns
  addVueComponentFn(result, relativePath)

  // Log if Vue component was added
  const afterCount = result.elements.length
  if (afterCount > beforeCount) {
    logger.debug(`🎯 Vue component added! Now ${afterCount} elements`)
    logNewElements(result.elements, beforeCount, afterCount, logger)
  }

  // Add to results and log completion
  context.results.push(result)
  logger.debug(`✅ Complete: ${fileName} with ${result.elements.length} elements`)
}

/**
 * Log elements with specified prefix
 */
function logElements(elements: any[], logger: any, prefix: string): void {
  for (const element of elements) {
    logger.debug(`${prefix}${element.name} (${element.type})`)
  }
}

/**
 * Log newly added elements
 */
function logNewElements(elements: any[], fromIndex: number, toIndex: number, logger: any): void {
  for (let i = fromIndex; i < toIndex; i++) {
    const element = elements[i]
    if (element) {
      logger.debug(`   + ${element.name} (${element.type})`)
    }
  }
}