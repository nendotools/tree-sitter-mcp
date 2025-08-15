/**
 * Config Validation Analyzer - Validates configuration files against JSON schemas
 */

import { BaseAnalyzer } from './base-analyzer.js'
import type { TreeNode, AnalysisResult } from '../../../types/index.js'

/**
 * Configuration file information
 */
interface ConfigFileInfo {
  node: TreeNode
  type: string
  schemaUrl?: string
}

/**
 * Configuration file pattern matching
 */
interface ConfigPattern {
  pattern: RegExp
  type: string
  schemaUrl?: string
}

/**
 * Configuration validation result
 */
interface ConfigValidationResult {
  isValid: boolean
  errors: ConfigValidationError[]
  schemaUsed?: string
}

/**
 * Configuration validation error
 */
interface ConfigValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Analyzes configuration files and validates them against appropriate schemas
 */
export class ConfigAnalyzer extends BaseAnalyzer {
  constructor() {
    super()
  }

  async analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void> {
    const configFiles = this.findConfigFiles(nodes)

    if (configFiles.length === 0) {
      result.metrics.configValidation = {
        validatedFiles: 0,
        schemaMatches: 0,
        validationErrors: 0,
        criticalErrors: 0,
      }
      return
    }

    const validationResults = await this.validateConfigFiles(configFiles)

    const totalErrors = validationResults.reduce((sum, r) => sum + r.errors.length, 0)
    const criticalErrors = validationResults.reduce(
      (sum, r) => sum + r.errors.filter(e => e.severity === 'error').length,
      0,
    )
    const schemaMatches = validationResults.filter(r => r.schemaUsed).length

    result.metrics.configValidation = {
      validatedFiles: configFiles.length,
      schemaMatches,
      validationErrors: totalErrors,
      criticalErrors,
    }

    this.addConfigValidationFindings(configFiles, validationResults, result)
  }

  /**
   * Finds configuration files in the project
   */
  private findConfigFiles(nodes: TreeNode[]): ConfigFileInfo[] {
    const configPatterns: ConfigPattern[] = [
      { pattern: /package\.json$/, type: 'package.json' },
      { pattern: /tsconfig.*\.json$/, type: 'tsconfig' },
      { pattern: /\.eslintrc(\.(json|js|yaml|yml))?$/, type: 'eslint' },
      { pattern: /\.prettierrc(\.(json|js|yaml|yml))?$/, type: 'prettier' },
      { pattern: /jest\.config\.(js|json|ts)$/, type: 'jest' },
      { pattern: /webpack\.config\.(js|ts)$/, type: 'webpack' },
      { pattern: /vite\.config\.(js|ts)$/, type: 'vite' },
      { pattern: /rollup\.config\.(js|ts)$/, type: 'rollup' },
      { pattern: /\.babelrc(\.(json|js))?$/, type: 'babel' },
      { pattern: /\.gitignore$/, type: 'gitignore' },
      { pattern: /\.env(\..+)?$/, type: 'env' },
      { pattern: /docker-compose\.ya?ml$/, type: 'docker-compose' },
      { pattern: /Dockerfile$/, type: 'dockerfile' },
    ]

    const configFiles: ConfigFileInfo[] = []

    for (const node of nodes) {
      if (node.type !== 'file') continue

      for (const { pattern, type, schemaUrl } of configPatterns) {
        if (pattern.test(node.path)) {
          configFiles.push({
            node,
            type,
            schemaUrl,
          })
          break
        }
      }
    }

    return configFiles
  }

  /**
   * Validates configuration files against their schemas
   */
  private async validateConfigFiles(configFiles: ConfigFileInfo[]): Promise<ConfigValidationResult[]> {
    const results: ConfigValidationResult[] = []

    for (const configFile of configFiles) {
      try {
        const validationResult = await this.validateSingleConfig(configFile)
        results.push(validationResult)
      }
      catch (error: any) {
        results.push({
          isValid: false,
          errors: [{
            path: configFile.node.path,
            message: `Validation failed: ${error.message}`,
            severity: 'error',
          }],
        })
      }
    }

    return results
  }

  /**
   * Validates a single configuration file
   */
  private async validateSingleConfig(configFile: ConfigFileInfo): Promise<ConfigValidationResult> {
    const { node, type } = configFile

    if (!node.content) {
      return {
        isValid: false,
        errors: [{
          path: node.path,
          message: 'Configuration file is empty',
          severity: 'error',
        }],
      }
    }

    const errors: ConfigValidationError[] = []

    try {
      if (type === 'package.json' || type === 'tsconfig' || node.path.endsWith('.json')) {
        JSON.parse(node.content)

        if (type === 'package.json') {
          const packageData = JSON.parse(node.content)
          if (!packageData.name) {
            errors.push({
              path: node.path,
              message: 'Missing required field: name',
              severity: 'error',
            })
          }
          if (!packageData.version) {
            errors.push({
              path: node.path,
              message: 'Missing required field: version',
              severity: 'error',
            })
          }
          else {
            // Validate semver format
            const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
            if (!semverRegex.test(packageData.version)) {
              errors.push({
                path: node.path,
                message: `Invalid version format: "${packageData.version}". Must follow semantic versioning (e.g., 1.0.0)`,
                severity: 'error',
              })
            }
          }

          // Validate other common package.json issues
          if (packageData.repository && typeof packageData.repository === 'string') {
            const urlRegex = /^https?:\/\/.+|^git\+https:\/\/.+/
            if (!urlRegex.test(packageData.repository)) {
              errors.push({
                path: node.path,
                message: `Invalid repository URL: "${packageData.repository}"`,
                severity: 'warning',
              })
            }
          }

          if (packageData.bugs && packageData.bugs.url && typeof packageData.bugs.url === 'string') {
            const urlRegex = /^https?:\/\/.+/
            if (!urlRegex.test(packageData.bugs.url)) {
              errors.push({
                path: node.path,
                message: `Invalid bugs URL: "${packageData.bugs.url}"`,
                severity: 'warning',
              })
            }
          }

          if (packageData.homepage && typeof packageData.homepage === 'string') {
            const urlRegex = /^https?:\/\/.+/
            if (!urlRegex.test(packageData.homepage)) {
              errors.push({
                path: node.path,
                message: `Invalid homepage URL: "${packageData.homepage}"`,
                severity: 'warning',
              })
            }
          }
        }

        if (type === 'tsconfig') {
          const tsconfigData = JSON.parse(node.content)
          if (!tsconfigData.compilerOptions) {
            errors.push({
              path: node.path,
              message: 'Missing compilerOptions section',
              severity: 'warning',
            })
          }
        }
      }

      if (type === 'env') {
        this.validateEnvFile(node.content, node.path, errors)
      }
    }
    catch (parseError: any) {
      errors.push({
        path: node.path,
        message: `Invalid JSON syntax: ${parseError.message}`,
        severity: 'error',
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      schemaUsed: configFile.schemaUrl ? 'basic-validation' : undefined,
    }
  }

  /**
   * Validates environment file syntax
   */
  private validateEnvFile(content: string, filePath: string, errors: ConfigValidationError[]): void {
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || ''

      if (!line || line.startsWith('#')) continue

      if (!line.includes('=')) {
        errors.push({
          path: `${filePath}:${i + 1}`,
          message: 'Invalid environment variable format. Expected KEY=value',
          severity: 'error',
        })
        continue
      }

      const [key, ...valueParts] = line.split('=')
      void valueParts // Mark as used to avoid warning
      if (!key?.trim()) {
        errors.push({
          path: `${filePath}:${i + 1}`,
          message: 'Environment variable name cannot be empty',
          severity: 'error',
        })
      }

      if (key && key.trim() && !/^[A-Z_][A-Z0-9_]*$/i.test(key.trim())) {
        errors.push({
          path: `${filePath}:${i + 1}`,
          message: `Invalid environment variable name: ${key}. Use only letters, numbers, and underscores.`,
          severity: 'warning',
        })
      }
    }
  }

  /**
   * Adds config validation findings to the result
   */
  private addConfigValidationFindings(
    configFiles: ConfigFileInfo[],
    validationResults: ConfigValidationResult[],
    result: AnalysisResult,
  ): void {
    for (let i = 0; i < configFiles.length; i++) {
      const configFile = configFiles[i]
      const validationResult = validationResults[i]

      if (!configFile || !validationResult) continue

      for (const error of validationResult.errors) {
        this.addFinding(result, {
          type: 'config-validation',
          category: 'validation_error',
          severity: error.severity === 'error' ? 'critical' : 'warning',
          location: error.path,
          description: error.message,
          context: `Configuration validation failed for ${configFile.type} file`,
        })
      }

      if (validationResult.isValid && validationResult.schemaUsed) {
        this.addFinding(result, {
          type: 'config-validation',
          category: 'validation_success',
          severity: 'info',
          location: configFile.node.path,
          description: `Configuration file validated successfully`,
          context: `${configFile.type} configuration is valid`,
        })
      }
    }
  }
}