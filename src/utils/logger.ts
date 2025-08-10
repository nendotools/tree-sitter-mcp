/**
 * Logger utility for the Tree-Sitter MCP service
 */

import chalk from 'chalk'
import { LOG_LEVELS } from '../constants/cli-constants.js'
import type { Logger, LogLevel } from '../types/cli-types.js'

export class ConsoleLogger implements Logger {
  private level: LogLevel
  private quiet: boolean
  private useColors: boolean

  constructor(
    options: {
      level?: LogLevel
      quiet?: boolean
      useColors?: boolean
    } = {},
  ) {
    this.level = options.level || LOG_LEVELS.INFO
    this.quiet = options.quiet || false
    this.useColors = options.useColors ?? process.stdout.isTTY
  }

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
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.format(LOG_LEVELS.WARN, message), ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(this.format(LOG_LEVELS.INFO, message), ...args)
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      // eslint-disable-next-line no-console
      console.debug(this.format(LOG_LEVELS.DEBUG, message), ...args)
    }
  }

  verbose(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LOG_LEVELS.VERBOSE)) {
      // eslint-disable-next-line no-console
      console.log(this.format(LOG_LEVELS.VERBOSE, message), ...args)
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  setQuiet(quiet: boolean): void {
    this.quiet = quiet
  }
}

// Singleton logger instance
let logger: Logger = new ConsoleLogger()

export function setLogger(newLogger: Logger): void {
  logger = newLogger
}

export function getLogger(): Logger {
  return logger
}

// Export convenience functions
export const error = (message: string, ...args: unknown[]) => logger.error(message, ...args)
export const warn = (message: string, ...args: unknown[]) => logger.warn(message, ...args)
export const info = (message: string, ...args: unknown[]) => logger.info(message, ...args)
export const debug = (message: string, ...args: unknown[]) => logger.debug(message, ...args)
export const verbose = (message: string, ...args: unknown[]) => logger.verbose(message, ...args)
