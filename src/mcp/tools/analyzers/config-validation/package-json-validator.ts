/**
 * Package.json specific validation logic
 */

import type { ConfigValidationError } from './types.js'

/**
 * Validate package.json structure and content
 */
export function validatePackageJson(packageData: any, filePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []

  // Required fields validation
  validateRequiredFields(packageData, filePath, errors)

  // Version format validation
  if (packageData.version) {
    validateSemverFormat(packageData.version, filePath, errors)
  }

  // URL validations
  validateRepositoryUrl(packageData, filePath, errors)
  validateBugsUrl(packageData, filePath, errors)
  validateHomepageUrl(packageData, filePath, errors)

  return errors
}

/**
 * Validate required package.json fields
 */
function validateRequiredFields(packageData: any, filePath: string, errors: ConfigValidationError[]): void {
  if (!packageData.name) {
    errors.push({
      path: filePath,
      message: 'Missing required field: name',
      severity: 'error',
    })
  }

  if (!packageData.version) {
    errors.push({
      path: filePath,
      message: 'Missing required field: version',
      severity: 'error',
    })
  }
}

/**
 * Validate semantic version format
 */
function validateSemverFormat(version: string, filePath: string, errors: ConfigValidationError[]): void {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

  if (!semverRegex.test(version)) {
    errors.push({
      path: filePath,
      message: `Invalid version format: "${version}". Must follow semantic versioning (e.g., 1.0.0)`,
      severity: 'error',
    })
  }
}

/**
 * Validate repository URL format
 */
function validateRepositoryUrl(packageData: any, filePath: string, errors: ConfigValidationError[]): void {
  if (packageData.repository && typeof packageData.repository === 'string') {
    const urlRegex = /^https?:\/\/.+|^git\+https:\/\/.+/
    if (!urlRegex.test(packageData.repository)) {
      errors.push({
        path: filePath,
        message: `Invalid repository URL: "${packageData.repository}"`,
        severity: 'warning',
      })
    }
  }
}

/**
 * Validate bugs URL format
 */
function validateBugsUrl(packageData: any, filePath: string, errors: ConfigValidationError[]): void {
  if (packageData.bugs && packageData.bugs.url && typeof packageData.bugs.url === 'string') {
    const urlRegex = /^https?:\/\/.+/
    if (!urlRegex.test(packageData.bugs.url)) {
      errors.push({
        path: filePath,
        message: `Invalid bugs URL: "${packageData.bugs.url}"`,
        severity: 'warning',
      })
    }
  }
}

/**
 * Validate homepage URL format
 */
function validateHomepageUrl(packageData: any, filePath: string, errors: ConfigValidationError[]): void {
  if (packageData.homepage && typeof packageData.homepage === 'string') {
    const urlRegex = /^https?:\/\/.+/
    if (!urlRegex.test(packageData.homepage)) {
      errors.push({
        path: filePath,
        message: `Invalid homepage URL: "${packageData.homepage}"`,
        severity: 'warning',
      })
    }
  }
}