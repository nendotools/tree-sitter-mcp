/**
 * Main setup orchestrator - coordinates all setup workflows
 */

import chalk from 'chalk'
import { getLogger } from '../utils/logger.js'
import type { SetupMode } from './types.js'
import { chooseSetupMode, quickSetup, manualSetup, configOnlySetup } from './interactive.js'
import { npmSetup, globalSetup } from './installation.js'

/**
 * Main setup entry point
 */
export async function runSetup(): Promise<void> {
  const logger = getLogger()

  const args = process.argv.slice(2)
  let mode: SetupMode | undefined = parseCommandLineMode(args)

  // Show welcome message
  if (!mode) {
    logger.info(chalk.cyan.bold('\nTree-Sitter MCP Setup\n'))
    logger.info(chalk.dim('Fast, in-memory code search for LLMs\n'))
  }
  else {
    logger.info(chalk.cyan.bold('\nTree-Sitter MCP Setup\n'))
  }

  try {
    // Get setup mode if not provided via command line
    if (!mode) {
      mode = await chooseSetupMode()
    }

    // Execute the selected setup workflow
    await executeSetupMode(mode)

    // Show success message
    showSuccessMessage()
  }
  catch (error) {
    handleSetupError(error)
  }
}

/**
 * Parse command line arguments to determine setup mode
 */
function parseCommandLineMode(args: string[]): SetupMode | undefined {
  if (args.includes('--quick')) {
    return 'quick'
  }
  else if (args.includes('--npm') || args.includes('--npx')) {
    return 'npm'
  }
  else if (args.includes('--global')) {
    return 'global'
  }
  else if (args.includes('--manual')) {
    return 'manual'
  }
  else if (args.includes('--config-only')) {
    return 'config-only'
  }

  return undefined
}

/**
 * Execute the selected setup mode
 */
async function executeSetupMode(mode: SetupMode): Promise<void> {
  switch (mode) {
    case 'quick':
      await quickSetup()
      break
    case 'manual':
      await manualSetup()
      break
    case 'npm':
      await npmSetup()
      break
    case 'global':
      await globalSetup()
      break
    case 'config-only':
      await configOnlySetup()
      break
    default:
      throw new Error(`Unknown setup mode: ${mode}`)
  }
}

/**
 * Show success message after setup completion
 */
function showSuccessMessage(): void {
  const logger = getLogger()

  logger.info(chalk.green.bold('\n[SUCCESS] Setup complete!\n'))
  logger.info(chalk.dim('For more information:'))
  logger.info(chalk.white('  https://github.com/nendotools/tree-sitter-mcp\n'))
}

/**
 * Handle setup errors with appropriate messaging
 */
function handleSetupError(error: unknown): void {
  const logger = getLogger()

  if (error instanceof Error && error.message === 'User cancelled') {
    logger.info(chalk.yellow('\nSetup cancelled\n'))
  }
  else {
    logger.error('Setup failed:', error)
    process.exit(1)
  }
}

// Export all setup functionality for external use
export * from './types.js'
export * from './client-detection.js'
export * from './configuration.js'
export * from './interactive.js'
export * from './installation.js'
export * from './platforms/claude-desktop.js'
export * from './platforms/claude-code.js'
export * from './platforms/generic.js'