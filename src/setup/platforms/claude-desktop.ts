/**
 * Claude Desktop specific configuration
 */

import { dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import chalk from 'chalk'
import { getLogger } from '../../utils/logger.js'
import { readMCPConfig, writeMCPConfig } from '../configuration.js'
import { MCP_CONFIGS } from '../types.js'
import type { MCPConfig } from '../types.js'

/**
 * Configure Claude Desktop with tree-sitter MCP
 */
export async function configureClaudeDesktop(configPath: string, method: 'npx' | 'global'): Promise<void> {
  const logger = getLogger()
  let config: MCPConfig = {}

  if (existsSync(configPath)) {
    try {
      config = readMCPConfig(configPath)
      logger.info(chalk.dim('  Updating existing configuration...'))
    }
    catch {
      logger.info(chalk.yellow('  Warning: Could not parse existing config, creating backup...'))
      const backupPath = `${configPath}.backup`
      writeFileSync(backupPath, readFileSync(configPath, 'utf-8'))
      logger.info(chalk.dim(`  Backup saved to: ${backupPath}`))
    }
  }
  else {
    logger.info(chalk.dim('  Creating new configuration...'))
    const dir = dirname(configPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  if (method === 'npx') {
    config.mcpServers['tree-sitter'] = MCP_CONFIGS.npx
  }
  else {
    config.mcpServers['tree-sitter'] = MCP_CONFIGS.global
  }

  writeMCPConfig(configPath, config)
  logger.info(chalk.green('  [OK] Claude Desktop configured'))
}