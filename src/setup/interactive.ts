/**
 * Interactive setup and user prompts
 */

import chalk from 'chalk'
import inquirer from 'inquirer'
import { getLogger } from '../utils/logger.js'
import type { SetupMode, MCPClient } from './types.js'
import { detectMCPClients } from './client-detection.js'
import { createDefaultConfig } from './configuration.js'

/**
 * Interactive setup mode selection
 */
export async function chooseSetupMode(): Promise<SetupMode> {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to set up Tree-Sitter MCP?',
      choices: [
        {
          name: '[QUICK] Auto-detect and configure MCP clients',
          value: 'quick',
        },
        {
          name: '[NPM/NPX] Use with npx (recommended for most users)',
          value: 'npm',
        },
        {
          name: '[GLOBAL] Install globally on this machine',
          value: 'global',
        },
        {
          name: '[MANUAL] Show configuration instructions',
          value: 'manual',
        },
        {
          name: '[CONFIG] Just create the config file',
          value: 'config-only',
        },
      ],
    },
  ])

  return mode as SetupMode
}

/**
 * Quick setup workflow - auto-detect and configure clients
 */
export async function quickSetup(): Promise<void> {
  logSetupStart()

  const clients = detectMCPClients()

  if (clients.length === 0) {
    const shouldCreateConfig = await handleNoClientsFound()
    if (shouldCreateConfig) {
      await createDefaultConfig(true)
    }
    return
  }

  logFoundClients(clients)

  if (isAutoMode()) {
    await processAutoMode(clients)
  }
  else {
    await processInteractiveMode(clients)
  }

  await createDefaultConfig()
}

/**
 * Logs setup start message
 */
function logSetupStart(): void {
  const logger = getLogger()
  logger.info(chalk.cyan('\n[DETECT] Scanning for MCP clients...\n'))
}

/**
 * Handles the scenario when no MCP clients are found
 */
async function handleNoClientsFound(): Promise<boolean> {
  const logger = getLogger()
  logger.info(chalk.yellow('No MCP clients detected.\n'))

  if (isAutoMode()) {
    logger.info(chalk.dim('Run without --auto flag for manual setup options.'))
    return false
  }

  const { createConfig } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createConfig',
      message: 'Would you like to create a default configuration file anyway?',
      default: true,
    },
  ])

  return createConfig
}

/**
 * Logs found clients information
 */
function logFoundClients(clients: MCPClient[]): void {
  const logger = getLogger()
  logger.info(chalk.green(`Found ${clients.length} MCP client${clients.length > 1 ? 's' : ''}:`))
  clients.forEach((client) => {
    logger.info(chalk.cyan(`  • ${client.name}`), chalk.dim(`(${client.configPath})`))
  })
}

/**
 * Checks if running in auto mode
 */
function isAutoMode(): boolean {
  return process.argv.includes('--auto')
}

/**
 * Processes auto mode - configure all detected clients
 */
async function processAutoMode(clients: MCPClient[]): Promise<void> {
  const logger = getLogger()
  logger.info(chalk.dim('\n[AUTO] Configuring all detected clients...'))
  for (const client of clients) {
    await configureClientQuickly(client)
  }
}

/**
 * Processes interactive mode - user selects clients and method
 */
async function processInteractiveMode(clients: MCPClient[]): Promise<void> {
  const selectedClients = await getSelectedClients(clients)

  if (selectedClients.length === 0) {
    const logger = getLogger()
    logger.info(chalk.dim('\nNo clients selected.'))
    return
  }

  const method = await getInstallationMethod()
  await configureSelectedClients(selectedClients, method)
}

/**
 * Prompts user to select which clients to configure
 */
async function getSelectedClients(clients: MCPClient[]): Promise<MCPClient[]> {
  const { selectedClients } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedClients',
      message: 'Which clients would you like to configure?',
      choices: clients.map(client => ({
        name: `${client.name} (${client.type})`,
        value: client,
        checked: true,
      })),
    },
  ])

  return selectedClients
}

/**
 * Prompts user to select installation method
 */
async function getInstallationMethod(): Promise<'npx' | 'global'> {
  const { method } = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: 'Installation method:',
      choices: [
        { name: 'NPX (recommended - always latest version)', value: 'npx' },
        { name: 'Global installation', value: 'global' },
      ],
    },
  ])

  return method
}

/**
 * Configures the selected clients with the chosen method
 */
async function configureSelectedClients(clients: MCPClient[], method: 'npx' | 'global'): Promise<void> {
  for (const client of clients) {
    await configureClientQuickly(client, method)
  }
}

/**
 * Configure a client quickly with minimal prompts
 */
async function configureClientQuickly(client: MCPClient, method: 'npx' | 'global' = 'npx'): Promise<void> {
  const logger = getLogger()

  try {
    logger.info(chalk.cyan(`\n[SETUP] ${client.name}...`))

    // Import the specific platform handler
    if (client.type === 'claude-desktop') {
      const { configureClaudeDesktop } = await import('./platforms/claude-desktop.js')
      await configureClaudeDesktop(client.configPath, method)
    }
    else if (client.type === 'claude-code') {
      const { configureClaudeCode } = await import('./platforms/claude-code.js')
      await configureClaudeCode(client.configPath, method)
    }
    else {
      const { configureGenericClient } = await import('./platforms/generic.js')
      await configureGenericClient(client, method)
    }

    logger.info(chalk.green(`✓ ${client.name} configured successfully`))
  }
  catch (error) {
    logger.error(chalk.red(`✗ Failed to configure ${client.name}:`), error)
  }
}

/**
 * Manual setup workflow - show instructions
 */
export async function manualSetup(): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.cyan.bold('\n[MANUAL] Manual Setup Instructions\n'))

  const { installMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'installMethod',
      message: 'Choose installation method:',
      choices: [
        { name: 'NPX - Run directly (recommended)', value: 'npx' },
        { name: 'Global - Install globally', value: 'global' },
        { name: 'Local - Use local installation', value: 'local' },
      ],
    },
  ])

  logger.info(chalk.yellow('\nTo manually add Tree-Sitter MCP to your client:\n'))

  if (installMethod === 'npx') {
    logger.info(chalk.cyan('NPX Configuration:'))
    logger.info(chalk.white('  "tree-sitter": {'))
    logger.info(chalk.white('    "command": "npx",'))
    logger.info(chalk.white('    "args": ["@nendo/tree-sitter-mcp@latest", "--mcp"]'))
    logger.info(chalk.white('  }'))
  }
  else if (installMethod === 'global') {
    logger.info(chalk.cyan('Global Installation:'))
    logger.info(chalk.white('1. Install globally: npm install -g @nendo/tree-sitter-mcp'))
    logger.info(chalk.white('2. Add to your MCP client:'))
    logger.info(chalk.white('  "tree-sitter": {'))
    logger.info(chalk.white('    "command": "tree-sitter-mcp",'))
    logger.info(chalk.white('    "args": ["--mcp"]'))
    logger.info(chalk.white('  }'))
  }
  else {
    logger.info(chalk.cyan('Local Installation:'))
    logger.info(chalk.white('1. Install in your project: npm install @nendo/tree-sitter-mcp'))
    logger.info(chalk.white('2. Add to your MCP client:'))
    logger.info(chalk.white('  "tree-sitter": {'))
    logger.info(chalk.white('    "command": "node",'))
    logger.info(chalk.white('    "args": ["./node_modules/@nendo/tree-sitter-mcp/dist/cli.js", "--mcp"]'))
    logger.info(chalk.white('  }'))
  }

  logger.info(chalk.dim('\nFor detailed client-specific instructions, visit:'))
  logger.info(chalk.blue('https://github.com/nendo/tree-sitter-mcp#setup'))

  await createDefaultConfig(true)
}

/**
 * Config-only setup - just create the config file
 */
export async function configOnlySetup(): Promise<void> {
  await createDefaultConfig(true)
}