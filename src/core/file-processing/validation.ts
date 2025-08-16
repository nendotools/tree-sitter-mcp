/**
 * File and parser validation utilities
 */

import type { FileProcessingContext } from './types.js'

/**
 * Check if file can be parsed
 */
export function validateParserCapability(context: FileProcessingContext): boolean {
  const { filePath, fileName, parserRegistry, logger } = context

  if (!parserRegistry.canParse(filePath)) {
    logger.debug(`❌ Cannot parse: ${fileName} (no parser available)`)
    return false
  }

  logger.debug(`✅ Can parse: ${fileName}`)
  return true
}

/**
 * Get and validate parser for file
 */
export function getValidatedParser(context: FileProcessingContext) {
  const { filePath, fileName, parserRegistry, logger } = context

  const parser = parserRegistry.getParserForFile(filePath)
  if (!parser) {
    logger.debug(`❌ No parser found: ${fileName}`)
    return null
  }

  logger.debug(`🔧 Using parser: ${parser.name} for ${fileName}`)
  return parser
}

/**
 * Check if parser language passes filter
 */
export function validateLanguageFilter(context: FileProcessingContext, parserName: string): boolean {
  const { fileName, config, logger } = context

  if (config.languages && config.languages.length > 0) {
    if (!config.languages.includes(parserName)) {
      logger.debug(`🚫 Language filter: ${fileName} (${parserName} not in ${config.languages})`)
      return false
    }
  }

  return true
}