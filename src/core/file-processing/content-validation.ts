/**
 * File content validation for line limits
 */

import { readFile } from 'fs/promises'
import { PARSING } from '../../constants/service-constants.js'
import type { FileProcessingContext, ContentValidationResult } from './types.js'

/**
 * Read and validate file content
 */
export async function readAndValidateContent(context: FileProcessingContext): Promise<ContentValidationResult> {
  const { filePath, fileName, logger } = context

  try {
    const readStartTime = performance.now()
    const content = await readFile(filePath, 'utf-8')
    const readDuration = (performance.now() - readStartTime).toFixed(2)
    logger.debug(`📖 Read: ${fileName} (${content.length} chars, ${readDuration}ms)`)

    return validateContentLimits(content, fileName, logger)
  }
  catch (error) {
    const reason = `❌ Failed to read file: ${fileName}`
    logger.debug(reason, error)
    return {
      isValid: false,
      reason,
      content: '',
      lineCount: 0,
      maxLineLength: 0,
    }
  }
}

/**
 * Validate content against line and length limits
 */
function validateContentLimits(content: string, fileName: string, logger: any): ContentValidationResult {
  const lines = content.split('\n')
  const lineCount = lines.length
  const maxLineLength = Math.max(...lines.map(line => line.length))

  // Check line count limit
  if (lineCount > PARSING.MAX_LINES_PER_FILE) {
    const reason = `🚫 Too many lines: ${fileName} (${lineCount} > ${PARSING.MAX_LINES_PER_FILE})`
    logger.debug(reason)
    return { isValid: false, reason, content, lineCount, maxLineLength }
  }

  // Check line length limit
  if (maxLineLength > PARSING.MAX_LINE_LENGTH) {
    const reason = `🚫 Long lines: ${fileName} (max ${maxLineLength} > ${PARSING.MAX_LINE_LENGTH} chars)`
    logger.debug(reason)
    return { isValid: false, reason, content, lineCount, maxLineLength }
  }

  logger.debug(`📏 Line check OK: ${fileName} (${lineCount} lines, max ${maxLineLength} chars)`)
  return { isValid: true, content, lineCount, maxLineLength }
}