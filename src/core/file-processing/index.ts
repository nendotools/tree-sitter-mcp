/**
 * File processing orchestrator
 */

import type { ParseResult } from '../../types/index.js'
import type { FileProcessingContext } from './types.js'
import { validateParserCapability, getValidatedParser, validateLanguageFilter } from './validation.js'
import { validateFileStats } from './file-stats.js'
import { readAndValidateContent } from './content-validation.js'
import { executeParsing } from './parse-execution.js'
import { processParseResult } from './result-processing.js'

/**
 * Process a single file using modular file processing
 */
export async function processFile(
  context: FileProcessingContext,
  addVueComponentFn: (result: ParseResult, relativePath: string) => void,
): Promise<void> {
  const fileStartTime = performance.now()
  const { fileName, logger } = context

  logger.debug(`🔍 Checking file: ${fileName}`)

  try {
    // Phase 1: Parser capability validation
    if (!validateParserCapability(context)) {
      return
    }

    // Phase 2: File stats validation
    const statsResult = await validateFileStats(context)
    if (!statsResult.isValid) {
      return
    }

    // Phase 3: Parser selection and language filtering
    const parser = getValidatedParser(context)
    if (!parser) {
      return
    }

    if (!validateLanguageFilter(context, parser.name)) {
      return
    }

    // Phase 4: Content reading and validation
    const contentResult = await readAndValidateContent(context)
    if (!contentResult.isValid) {
      return
    }

    // Phase 5: Parse execution
    const parseResult = await executeParsing(context, contentResult.content)
    if (!parseResult.success || !parseResult.result) {
      return
    }

    // Phase 6: Result processing
    processParseResult(context, parseResult.result, addVueComponentFn)

    const totalDuration = (performance.now() - fileStartTime).toFixed(2)
    logger.debug(`✅ Complete: ${fileName} with ${parseResult.result.elements.length} elements in ${totalDuration}ms`)
  }
  catch (error) {
    const totalDuration = (performance.now() - fileStartTime).toFixed(2)
    logger.error(`❌ Error processing file ${context.filePath} after ${totalDuration}ms:`, error)
  }
}

// Re-export types for external use
export type {
  FileProcessingContext,
  FileWalkerConfig,
  FileStatsResult,
  ContentValidationResult,
  ParseExecutionResult,
} from './types.js'