/**
 * Main configuration validation orchestrator
 */

import type { ConfigFileInfo, ConfigValidationResult } from './types.js'
import { parseJsonSafely } from './json-parser.js'
import { validatePackageJson } from './package-json-validator.js'
import { validateTsconfig } from './tsconfig-validator.js'
import { validateEnvFile } from './env-validator.js'
import {
  createEmptyContentResult,
  createValidationResult,
  mergeValidationErrors,
} from './result-builder.js'

/**
 * Validate a single configuration file using modular validation
 */
export async function validateSingleConfig(configFile: ConfigFileInfo): Promise<ConfigValidationResult> {
  const { node, type } = configFile

  // Check for empty content
  if (!node.content) {
    return createEmptyContentResult(node.path)
  }

  // Handle JSON-based configuration files
  if (isJsonBasedConfig(type, node.path)) {
    return validateJsonConfig(node.content, node.path, type, configFile)
  }

  // Handle environment files
  if (type === 'env') {
    const errors = validateEnvFile(node.content, node.path)
    return createValidationResult(errors, 'env-validation')
  }

  // Default: assume valid for unsupported types
  return createValidationResult([], 'basic-validation')
}

/**
 * Check if config type is JSON-based
 */
function isJsonBasedConfig(type: string, path: string): boolean {
  return type === 'package.json' || type === 'tsconfig' || path.endsWith('.json')
}

/**
 * Validate JSON-based configuration files
 */
function validateJsonConfig(
  content: string,
  filePath: string,
  type: string,
  configFile: ConfigFileInfo,
): ConfigValidationResult {
  // Parse JSON safely
  const { data, errors: parseErrors } = parseJsonSafely(content, filePath)

  if (parseErrors.length > 0) {
    return createValidationResult(parseErrors)
  }

  // Type-specific validation
  const validationErrors = getTypeSpecificErrors(data, filePath, type)
  const allErrors = mergeValidationErrors(parseErrors, validationErrors)

  return createValidationResult(
    allErrors,
    configFile.schemaUrl ? 'basic-validation' : undefined,
  )
}

/**
 * Get validation errors for specific config types
 */
function getTypeSpecificErrors(data: any, filePath: string, type: string) {
  switch (type) {
    case 'package.json':
      return validatePackageJson(data, filePath)

    case 'tsconfig':
      return validateTsconfig(data, filePath)

    default:
      return []
  }
}

// Re-export types for external use
export type { ConfigFileInfo, ConfigValidationResult, ConfigValidationError } from './types.js'