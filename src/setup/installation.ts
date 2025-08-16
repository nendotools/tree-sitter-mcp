/**
 * Installation methods (NPX, global, local)
 */

import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { getLogger } from '../utils/logger.js'
import { createMCPServerConfig, MCP_CONFIGS } from './types.js'
import { logJsonConfig, createDefaultConfig } from './configuration.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * NPM/NPX setup workflow
 */
export async function npmSetup(): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.cyan('\n=== NPM/NPX Setup ===\n'))
  logger.info(chalk.white('Add this to your MCP client configuration:\n'))

  const config = createMCPServerConfig(MCP_CONFIGS.npx)

  logJsonConfig(config)

  logger.info(chalk.cyan('\nConfiguration locations:\n'))

  logger.info(chalk.white('Claude Desktop:'))
  logger.info(
    chalk.dim('  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json'),
  )
  logger.info(chalk.dim('  Linux: ~/.config/Claude/claude_desktop_config.json'))
  logger.info(chalk.dim('  Windows: %APPDATA%\\Claude\\claude_desktop_config.json\n'))

  logger.info(chalk.white('VS Code / Cursor / Windsurf:'))
  logger.info(chalk.dim('  1. Open command palette (Cmd+Shift+P or Ctrl+Shift+P)'))
  logger.info(chalk.dim('  2. Run "MCP: Edit Settings"'))
  logger.info(chalk.dim('  3. Add the configuration shown above\n'))

  await createDefaultConfig()
}

/**
 * Global installation setup workflow
 */
export async function globalSetup(): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.cyan('\n=== Global Installation Setup ===\n'))

  if (!checkGlobalInstallation()) {
    logger.info(chalk.yellow('Tree-Sitter MCP is not installed globally.\n'))

    logger.info(chalk.white('To install globally, run:'))
    logger.info(chalk.cyan('  npm install -g @nendo/tree-sitter-mcp\n'))

    logger.info(chalk.dim('Or install locally:'))
    installGlobally()
  }
  else {
    logger.info(chalk.green('✓ Tree-Sitter MCP is already installed globally\n'))
  }

  logger.info(chalk.white('Add this to your MCP client configuration:\n'))

  const config = createMCPServerConfig(MCP_CONFIGS.global)
  logJsonConfig(config)

  await createDefaultConfig()
}

/**
 * Check if tree-sitter-mcp is installed globally
 */
export function checkGlobalInstallation(): boolean {
  try {
    const result = execSync('npm list -g @nendo/tree-sitter-mcp', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    return result.includes('tree-sitter-mcp')
  }
  catch {
    return false
  }
}

/**
 * Install tree-sitter-mcp globally
 */
export function installGlobally(): void {
  const logger = getLogger()
  try {
    logger.info(chalk.dim('Running: npm install -g .'))
    execSync('npm install -g .', {
      stdio: 'inherit',
      cwd: join(__dirname, '..', '..'),
    })
  }
  catch (error) {
    throw new Error(`Failed to install globally: ${error}`)
  }
}

/**
 * Get local CLI path for local installation
 */
export function getLocalCLIPath(): string {
  return join(__dirname, '..', '..', 'dist', 'cli.js')
}

/**
 * Create local installation configuration
 */
export function createLocalConfig(): any {
  const cliPath = getLocalCLIPath()
  return createMCPServerConfig(MCP_CONFIGS.local(cliPath))
}