/**
 * File stats validation and size checking
 */

import { stat } from 'fs/promises'
import { PARSING } from '../../constants/service-constants.js'
import type { FileProcessingContext, FileStatsResult } from './types.js'

/**
 * Validate file stats and size limits
 */
export async function validateFileStats(context: FileProcessingContext): Promise<FileStatsResult> {
  const { filePath, fileName, logger } = context

  try {
    const statStartTime = performance.now()
    const stats = await stat(filePath)
    const statDuration = (performance.now() - statStartTime).toFixed(2)

    const maxSizeBytes = PARSING.MAX_FILE_SIZE_MB * 1024 * 1024
    if (stats.size > maxSizeBytes) {
      const sizeMB = Math.round(stats.size / 1024 / 1024)
      const reason = `🚫 Large file: ${fileName} (${sizeMB}MB > ${PARSING.MAX_FILE_SIZE_MB}MB)`
      logger.debug(reason)
      return { isValid: false, reason }
    }

    logger.debug(`📊 File size OK: ${fileName} (${stats.size} bytes, ${statDuration}ms)`)
    return { isValid: true, stats }
  }
  catch (error) {
    const reason = `❌ Failed to get file stats: ${fileName}`
    logger.debug(reason, error)
    return { isValid: false, reason }
  }
}