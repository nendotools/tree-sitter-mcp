/**
 * Configurable logger utility with console and file output support
 */

import chalk from 'chalk'
import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { LOG_LEVELS } from '../constants/cli-constants.js'
import type { Logger, LogLevel } from '../types/cli-types.js'

/**
 * Console and file logger implementation with level-based filtering
 *
 * Features:
 * - Configurable log levels (error, warn, info, debug, verbose)
 * - Optional file logging with automatic directory creation
 * - Color-coded console output with TTY detection
 * - Quiet mode for suppressing non-error output
 * - Timestamp formatting for all log entries
 */
export class ConsoleLogger implements Logger {
  private level: LogLevel
  private quiet: boolean
  private useColors: boolean
  private logToFile: boolean
  private logFilePath?: string

  /**
   * Creates a new console logger instance
   *
   * @param options - Configuration options for the logger
   */
  constructor(
    options: {
      level?: LogLevel
      quiet?: boolean
      useColors?: boolean
      logToFile?: boolean
      logFilePath?: string
    } = {},
  ) {
    this.level = options.level || LOG_LEVELS.INFO
    this.quiet = options.quiet || false
    this.useColors = options.useColors ?? process.stdout.isTTY
    this.logToFile = options.logToFile || false
    this.logFilePath = options.logFilePath

    if (this.logToFile && this.logFilePath) {
      this.initializeLogFile()
    }
  }

  /**
   * Initializes the log file and creates necessary directories
   */
  private initializeLogFile(): void {
    if (!this.logFilePath) return

    const logDir = resolve(this.logFilePath, '..')
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    const timestamp = new Date().toISOString()
    writeFileSync(this.logFilePath, `=== Tree-Sitter MCP Log Started ${timestamp} ===\n`)
  }

  /**
   * Determines if a message should be logged based on current level and quiet mode
   *
   * @param level - Log level of the message
   * @returns True if the message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.quiet && level !== LOG_LEVELS.ERROR) {
      return false
    }

    const levels = [
      LOG_LEVELS.ERROR,
      LOG_LEVELS.WARN,
      LOG_LEVELS.INFO,
      LOG_LEVELS.DEBUG,
      LOG_LEVELS.VERBOSE,
    ]

    const currentLevelIndex = levels.indexOf(this.level)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex <= currentLevelIndex
  }

  /**
   * Formats a log message with timestamp and level information
   *
   * @param level - Log level for color coding
   * @param message - Message content to format
   * @returns Formatted log message string
   */
  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()

    if (!this.useColors) {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`
    }

    let coloredLevel: string
    switch (level) {
      case LOG_LEVELS.ERROR:
        coloredLevel = chalk.red(`[${level.toUpperCase()}]`)
        break
      case LOG_LEVELS.WARN:
        coloredLevel = chalk.yellow(`[${level.toUpperCase()}]`)
        break
      case LOG_LEVELS.INFO:
        coloredLevel = chalk.blue(`[${level.toUpperCase()}]`)
        break
      case LOG_LEVELS.DEBUG:
        coloredLevel = chalk.gray(`[${level.toUpperCase()}]`)
        break
      case LOG_LEVELS.VERBOSE:
        coloredLevel = chalk.dim(`[${level.toUpperCase()}]`)
        break
      default:
        coloredLevel = `[${(level as string).toUpperCase()}]`
    }

    return `${chalk.dim(timestamp)} ${coloredLevel} ${message}`
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.format(LOG_LEVELS.ERROR, message), ...args)
      this.writeToFile(LOG_LEVELS.ERROR, message, ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.format(LOG_LEVELS.WARN, message), ...args)
      this.writeToFile(LOG_LEVELS.WARN, message, ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(this.format(LOG_LEVELS.INFO, message), ...args)
      this.writeToFile(LOG_LEVELS.INFO, message, ...args)
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      // eslint-disable-next-line no-console
      console.debug(this.format(LOG_LEVELS.DEBUG, message), ...args)
      this.writeToFile(LOG_LEVELS.DEBUG, message, ...args)
    }
  }

  verbose(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.VERBOSE)) {
      // eslint-disable-next-line no-console
      console.log(this.format(LOG_LEVELS.VERBOSE, message), ...args)
      this.writeToFile(LOG_LEVELS.VERBOSE, message, ...args)
    }
  }

  /**
   * Outputs text directly without any formatting, timestamps, or log levels
   * Used for clean CLI output that shouldn't include debug information
   * Always outputs regardless of quiet mode since this is explicit user-requested output
   *
   * @param message - Message to output directly to console
   * @param args - Additional arguments to include
   */
  output(message: string, ...args: unknown[]): void {
    console.log(message, ...args)
  }

  /**
   * Updates the current log level
   *
   * @param level - New log level to set
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * Enables or disables quiet mode
   *
   * @param quiet - True to enable quiet mode (errors only)
   */
  setQuiet(quiet: boolean): void {
    this.quiet = quiet
  }

  /**
   * Writes a log message to the configured file
   *
   * @param level - Log level for the message
   * @param message - Primary message content
   * @param args - Additional arguments to include
   */
  private writeToFile(level: LogLevel, message: string, ...args: unknown[]): void {
    if (this.logToFile && this.logFilePath) {
      const timestamp = new Date().toISOString()
      const fileMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${args.length > 0 ? ' ' + args.join(' ') : ''}\n`
      try {
        appendFileSync(this.logFilePath, fileMessage)
      }
      catch (error) {
        console.error('Failed to write to log file:', error)
      }
    }
  }
}

/**
 * Global singleton logger instance
 */
let logger: Logger | null = null

/**
 * Initializes the global logger with the given configuration
 * This should be called once at application startup
 *
 * @param options - Logger configuration options
 * @returns The initialized logger instance
 */
export function initializeLogger(options: {
  level?: LogLevel
  quiet?: boolean
  useColors?: boolean
  logToFile?: boolean
  logFilePath?: string
} = {}): Logger {
  if (logger) {
    // Logger already initialized, update its settings if it's a ConsoleLogger
    if ('setLevel' in logger && 'setQuiet' in logger) {
      if (options.level !== undefined) {
        (logger as ConsoleLogger).setLevel(options.level)
      }
      if (options.quiet !== undefined) {
        (logger as ConsoleLogger).setQuiet(options.quiet)
      }
    }
    return logger
  }

  logger = new ConsoleLogger(options)
  return logger
}

/**
 * Gets the current global logger instance
 * Creates a default logger if none exists
 *
 * @returns Current logger instance
 */
export function getLogger(): Logger {
  if (!logger) {
    logger = new ConsoleLogger()
  }
  return logger
}

/**
 * Sets the global logger instance (for backward compatibility)
 * @deprecated Use initializeLogger instead
 *
 * @param newLogger - New logger instance to use globally
 */
export function setLogger(newLogger: Logger): void {
  logger = newLogger
}
