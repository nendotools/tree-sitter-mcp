/**
 * Types for configuration validation modules
 */

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean
  errors: ConfigValidationError[]
  schemaUsed?: string
}

/**
 * Configuration file information
 */
export interface ConfigFileInfo {
  node: {
    path: string
    content?: string
  }
  type: string
  schemaUrl?: string
}