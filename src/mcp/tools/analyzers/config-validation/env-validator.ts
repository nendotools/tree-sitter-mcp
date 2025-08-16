/**
 * Environment file validation logic
 */

import type { ConfigValidationError } from './types.js'

/**
 * Validate environment file syntax and format
 */
export function validateEnvFile(content: string, filePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() || ''

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue

    validateEnvLine(line, filePath, i + 1, errors)
  }

  return errors
}

/**
 * Validate a single environment variable line
 */
function validateEnvLine(line: string, filePath: string, lineNumber: number, errors: ConfigValidationError[]): void {
  // Check for equals sign
  if (!line.includes('=')) {
    errors.push({
      path: `${filePath}:${lineNumber}`,
      message: 'Invalid environment variable format. Expected KEY=value',
      severity: 'error',
    })
    return
  }

  const [key, ...valueParts] = line.split('=')
  void valueParts // Mark as used to avoid warning

  // Validate key format
  validateEnvKey(key, filePath, lineNumber, errors)
}

/**
 * Validate environment variable key format
 */
function validateEnvKey(key: string | undefined, filePath: string, lineNumber: number, errors: ConfigValidationError[]): void {
  if (!key?.trim()) {
    errors.push({
      path: `${filePath}:${lineNumber}`,
      message: 'Environment variable name cannot be empty',
      severity: 'error',
    })
    return
  }

  const trimmedKey = key.trim()
  if (!/^[A-Z_][A-Z0-9_]*$/i.test(trimmedKey)) {
    errors.push({
      path: `${filePath}:${lineNumber}`,
      message: `Invalid environment variable name: ${trimmedKey}. Use only letters, numbers, and underscores.`,
      severity: 'warning',
    })
  }
}