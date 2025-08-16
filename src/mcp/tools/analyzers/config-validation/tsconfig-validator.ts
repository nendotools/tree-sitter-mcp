/**
 * TypeScript configuration validation logic
 */

import type { ConfigValidationError } from './types.js'

/**
 * Validate tsconfig.json structure and content
 */
export function validateTsconfig(tsconfigData: any, filePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []

  // Check for required compiler options
  if (!tsconfigData.compilerOptions) {
    errors.push({
      path: filePath,
      message: 'Missing compilerOptions section',
      severity: 'warning',
    })
  }

  return errors
}

/**
 * Validate TypeScript compiler options (extended validation)
 */
export function validateCompilerOptions(compilerOptions: any, filePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []

  // Common TypeScript configuration warnings
  if (compilerOptions.target && !isValidTarget(compilerOptions.target)) {
    errors.push({
      path: filePath,
      message: `Invalid TypeScript target: "${compilerOptions.target}"`,
      severity: 'warning',
    })
  }

  if (compilerOptions.module && !isValidModule(compilerOptions.module)) {
    errors.push({
      path: filePath,
      message: `Invalid TypeScript module: "${compilerOptions.module}"`,
      severity: 'warning',
    })
  }

  return errors
}

/**
 * Check if TypeScript target is valid
 */
function isValidTarget(target: string): boolean {
  const validTargets = [
    'ES3', 'ES5', 'ES6', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', 'ES2021', 'ES2022', 'ESNext',
  ]
  return validTargets.includes(target.toUpperCase())
}

/**
 * Check if TypeScript module is valid
 */
function isValidModule(module: string): boolean {
  const validModules = [
    'None', 'CommonJS', 'AMD', 'UMD', 'System', 'ES6', 'ES2015', 'ES2020', 'ESNext',
  ]
  return validModules.includes(module)
}