/**
 * CLI and application types
 */

// CLI command-line options
export interface CLIOptions {
  mcp?: boolean;
  config?: string;
  dir?: string;
  languages?: string;
  maxDepth?: number;
  ignore?: string;
  listLanguages?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  setup?: boolean;
}

// Logger interface
export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  verbose(message: string, ...args: unknown[]): void;
}

// Log level types
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

// Custom error class
export class TreeSitterMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TreeSitterMCPError';
  }
}