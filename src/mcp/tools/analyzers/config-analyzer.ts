/**
 * Config Validation Analyzer - Validates configuration files against JSON schemas
 */

import { BaseAnalyzer } from './base-analyzer.js'
import type { TreeNode, AnalysisResult } from '../../../types/index.js'
import { validateSingleConfig } from './config-validation/index.js'
import type {
  ConfigFileInfo as ModularConfigFileInfo,
} from './config-validation/index.js'

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
   * Validates a single configuration file using modular validation
   */
  private async validateSingleConfig(configFile: ConfigFileInfo): Promise<ConfigValidationResult> {
    // Delegate to modular validation system
    const modularConfigFile: ModularConfigFileInfo = {
      node: configFile.node,
      type: configFile.type,
      schemaUrl: configFile.schemaUrl,
    }
    return await validateSingleConfig(modularConfigFile)
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