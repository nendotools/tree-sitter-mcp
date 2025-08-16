/**
 * Generic MCP client configuration (CLI clients, VS Code, etc.)
 */

import { dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import chalk from 'chalk'
import { getLogger } from '../../utils/logger.js'
import { readMCPConfig, writeMCPConfig, formatJsonConfig } from '../configuration.js'
import { createMCPServerConfig, MCP_CONFIGS } from '../types.js'
import type { MCPClient, MCPConfig } from '../types.js'

/**
 * Configure generic MCP clients (CLI-based like Gemini, Qwen)
 */
export async function configureGenericClient(client: MCPClient, method: 'npx' | 'global'): Promise<void> {
  // Handle VS Code-style clients that don't support automatic configuration
  if (['vscode', 'cursor', 'windsurf'].includes(client.type)) {
    await showManualInstructions(client, method)
    return
  }

  // Handle CLI clients with direct configuration files
  await configureFileBasedClient(client, method)
}

/**
 * Configure clients that use configuration files (Gemini CLI, Qwen CLI, etc.)
 */
async function configureFileBasedClient(client: MCPClient, method: 'npx' | 'global'): Promise<void> {
  const logger = getLogger()
  let config: MCPConfig = {}

  // Read or create configuration
  if (existsSync(client.configPath)) {
    try {
      config = readMCPConfig(client.configPath)
      logger.info(chalk.dim('  Updating existing configuration...'))
    }
    catch {
      await createBackup(client.configPath)
    }
  }
  else {
    await createConfigDirectory(client.configPath)
    logger.info(chalk.dim('  Creating new configuration...'))
  }

  // Add tree-sitter MCP server configuration
  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  if (method === 'npx') {
    config.mcpServers['tree-sitter'] = MCP_CONFIGS.npx
  }
  else {
    config.mcpServers['tree-sitter'] = MCP_CONFIGS.global
  }

  // Write configuration
  writeMCPConfig(client.configPath, config)
  logger.info(chalk.green(`  [OK] ${client.name} configured`))
}

/**
 * Show manual configuration instructions for VS Code-style clients
 */
async function showManualInstructions(client: MCPClient, method: 'npx' | 'global'): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.yellow(`  Automatic configuration for ${client.name} not yet supported`))
  logger.info(chalk.dim('  Please add the configuration manually using:'))
  logger.info(chalk.dim('  Command palette → "MCP: Edit Settings"'))

  const config = method === 'npx' ? MCP_CONFIGS.npx : MCP_CONFIGS.global
  const serverConfig = createMCPServerConfig(config)

  logger.info(chalk.gray('\n' + formatJsonConfig(serverConfig)))

  logger.info(chalk.cyan('\n  Manual setup steps:'))
  logger.info(chalk.dim('  1. Open command palette (Cmd+Shift+P or Ctrl+Shift+P)'))
  logger.info(chalk.dim('  2. Search for "MCP: Edit Settings"'))
  logger.info(chalk.dim('  3. Add the JSON configuration shown above'))
  logger.info(chalk.dim('  4. Save and restart the application'))
}

/**
 * Create backup of existing configuration file
 */
async function createBackup(configPath: string): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.yellow('  Warning: Could not parse existing config, creating backup...'))
  const backupPath = `${configPath}.backup`
  writeFileSync(backupPath, readFileSync(configPath, 'utf-8'))
  logger.info(chalk.dim(`  Backup saved to: ${backupPath}`))
}

/**
 * Create configuration directory if it doesn't exist
 */
async function createConfigDirectory(configPath: string): Promise<void> {
  const dir = dirname(configPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/**
 * Get supported client types for generic configuration
 */
export function getSupportedClientTypes(): string[] {
  return ['gemini-cli', 'qwen-cli', 'vscode', 'cursor', 'windsurf', 'other']
}

/**
 * Check if client requires manual configuration
 */
export function requiresManualConfiguration(clientType: string): boolean {
  return ['vscode', 'cursor', 'windsurf'].includes(clientType)
}