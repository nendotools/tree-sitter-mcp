/**
 * Types for file processing modules
 */

import type { ParseResult } from '../../types/index.js'
import type { ParserRegistry } from '../../parsers/registry.js'
import type { Logger } from '../../types/index.js'

/**
 * File processing context
 */
export interface FileProcessingContext {
  filePath: string
  fileName: string
  config: FileWalkerConfig
  parserRegistry: ParserRegistry
  logger: Logger
  results: ParseResult[]
}

/**
 * File walker configuration
 */
export interface FileWalkerConfig {
  workingDir: string
  languages?: string[]
  maxDepth?: number
  ignoreDirs?: string[]
}

/**
 * File stats validation result
 */
export interface FileStatsResult {
  isValid: boolean
  reason?: string
  stats?: any
}

/**
 * Content validation result
 */
export interface ContentValidationResult {
  isValid: boolean
  reason?: string
  content: string
  lineCount: number
  maxLineLength: number
}

/**
 * Parse execution result
 */
export interface ParseExecutionResult {
  success: boolean
  result?: ParseResult
  duration: number
  reason?: string
}