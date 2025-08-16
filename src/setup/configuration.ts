/**
 * Configuration management functions
 */

import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { getLogger } from '../utils/logger.js'
import type { MCPConfig } from './types.js'

/**
 * Utility function to log JSON configuration with consistent formatting
 */
export function logJsonConfig(config: unknown): void {
  getLogger().output(chalk.gray(formatJsonConfig(config)))
}

/**
 * Utility function to create formatted JSON string for file writing
 */
export function formatJsonConfig(config: unknown): string {
  return JSON.stringify(config, null, 2)
}

/**
 * Read and parse MCP configuration from file
 */
export function readMCPConfig(configPath: string): MCPConfig {
  try {
    const content = readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return {}
  }
}

/**
 * Write MCP configuration to file
 */
export function writeMCPConfig(configPath: string, config: MCPConfig): void {
  writeFileSync(configPath, formatJsonConfig(config), 'utf-8')
}

/**
 * Merge tree-sitter configuration into existing MCP config
 */
export function mergeMCPConfig(existingConfig: MCPConfig, newServerConfig: any): MCPConfig {
  return {
    ...existingConfig,
    mcpServers: {
      ...existingConfig.mcpServers,
      ...newServerConfig.mcpServers,
    },
  }
}

/**
 * Create default tree-sitter configuration file
 */
export async function createDefaultConfig(interactive: boolean = false): Promise<void> {
  const logger = getLogger()
  const home = homedir()
  const configDir = join(home, '.config', 'tree-sitter-mcp')
  const configPath = join(configDir, 'config.json')

  if (existsSync(configPath)) {
    if (interactive) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Configuration file already exists. Overwrite?',
          default: false,
        },
      ])

      if (!overwrite) {
        logger.info(chalk.dim('\nKeeping existing configuration.'))
        return
      }
    }
    else {
      logger.info(chalk.dim('\n[INFO] Configuration already exists at:'))
      logger.info(chalk.cyan(`   ${configPath}`))
      return
    }
  }

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  const defaultConfig = {
    workingDir: '.',
    languages: [], // Empty means all supported languages
    maxDepth: 10,
    ignoreDirs: [
      '.git',
      'node_modules',
      '.node_modules',
      'vendor',
      'target',
      'build',
      'dist',
      'out',
      'coverage',
      '.next',
      '.nuxt',
      '.cache',
      '.vscode',
      '.idea',
      '*.log',
      'tmp',
      'temp',
    ],
  }

  let finalConfig = defaultConfig

  if (interactive) {
    finalConfig = await customizeConfig(defaultConfig)
  }

  writeFileSync(configPath, formatJsonConfig(finalConfig), 'utf-8')

  logger.info(chalk.green('\n✓ Default configuration created:'))
  logger.info(chalk.cyan(`   ${configPath}`))
  logger.info(chalk.dim('\nConfiguration:'))
  logJsonConfig(finalConfig)
}

/**
 * Interactive configuration customization
 */
async function customizeConfig(defaultConfig: any): Promise<any> {
  const { customize } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customize',
      message: 'Would you like to customize the configuration?',
      default: false,
    },
  ])

  if (!customize) {
    return defaultConfig
  }

  const maxDepthAnswer = await inquirer.prompt({
    type: 'number',
    name: 'maxDepth',
    message: 'Maximum directory depth to scan:',
    default: defaultConfig.maxDepth,
    validate: (input: number | undefined) => (input !== undefined && input > 0) || 'Must be greater than 0',
  })

  const languagesAnswer = await inquirer.prompt({
    type: 'input',
    name: 'languages',
    message: 'Languages to parse (comma-separated, empty for all):',
    default: '',
    filter: (input: string) => input.trim() ? input.split(',').map((s: string) => s.trim()) : [],
  })

  const maxDepth = maxDepthAnswer.maxDepth
  const languages = languagesAnswer.languages

  return {
    ...defaultConfig,
    maxDepth,
    languages,
  }
}

/**
 * Show configuration file locations
 */
export function showConfigLocations(): void {
  const logger = getLogger()
  const home = homedir()

  logger.info(chalk.cyan('\n[CONFIG] Configuration locations:'))
  logger.info(chalk.dim('• User config:'), chalk.cyan(join(home, '.config', 'tree-sitter-mcp', 'config.json')))
  logger.info(chalk.dim('• Project config:'), chalk.cyan('./tree-sitter-mcp.config.json'))
  logger.info(chalk.dim('• Package.json:'), chalk.cyan('./package.json (treeSitterMcp section)'))
}