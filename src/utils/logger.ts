/**
 * Simplified logger - replaces complex logging system with basic functionality
 */

import chalk from 'chalk'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface Logger {
  error(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
  output(message: string, ...args: unknown[]): void
}

class SimpleLogger implements Logger {
  constructor(private level: LogLevel = 'info', private quiet = false) {}

  private shouldLog(level: LogLevel): boolean {
    if (this.quiet && level !== 'error') return false

    const levels = ['error', 'warn', 'info', 'debug']
    return levels.indexOf(level) <= levels.indexOf(this.level)
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red('[ERROR]'), message, ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow('[WARN]'), message, ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(chalk.blue('[INFO]'), message, ...args)
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(chalk.gray('[DEBUG]'), message, ...args)
    }
  }

  output(message: string, ...args: unknown[]): void {
    console.log(message, ...args)
  }
}

let logger: Logger = new SimpleLogger()

export function getLogger(): Logger {
  return logger
}

export function initializeLogger(level: LogLevel = 'info', quiet = false): Logger {
  logger = new SimpleLogger(level, quiet)
  return logger
}