#!/usr/bin/env node

/**
 * Command-line interface for the Tree-Sitter MCP service
 *
 * This CLI provides multiple execution modes:
 * - MCP server mode for integration with MCP clients
 * - Standalone analysis mode for direct code analysis
 * - Interactive setup for MCP configuration
 * - Language listing and project analysis commands
 */

import { Command } from 'commander'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import chalk from 'chalk'

import { SERVICE } from './constants/service-constants.js'
import { LOG_LEVELS } from './constants/cli-constants.js'
import type { CLIOptions, Config } from './types/index.js'
import { ConsoleLogger, setLogger, getLogger } from './utils/logger.js'
import { startMCPServer } from './mcp/server.js'
import { runStandaloneMode } from './standalone/index.js'
import { runSetup } from './setup.js'
import { listSupportedLanguages } from './parsers/registry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Package.json interface for version information
 */
interface PackageJson {
  version: string
  [key: string]: unknown
}

/**
 * Load package.json with fallback for different execution contexts
 */
let packageJson: PackageJson
try {
  packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
  ) as PackageJson
}
catch {
  packageJson = { version: '1.0.0' } as PackageJson
}

/**
 * Main CLI program configuration
 */
const program = new Command()

program
  .name(SERVICE.NAME)
  .description(SERVICE.DESCRIPTION)
  .version(packageJson.version, '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command')
  .option('--mcp', 'Run as MCP server')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-d, --dir <path>', 'Working directory to analyze', '.')
  .option('-l, --languages <languages>', 'Comma-separated list of languages to parse')
  .option('--max-depth <depth>', 'Maximum directory depth to traverse', '10')
  .option('--ignore <dirs>', 'Comma-separated list of directories to ignore')
  .option('--list-languages', 'List all supported languages and exit')
  .option('--verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress all non-error output')
  .option('--setup', 'Run interactive setup to configure MCP')
  .action(async (options: CLIOptions) => {
    await handleMainAction(options)
  })

// Add subcommands
program
  .command('setup')
  .description('Run interactive setup to configure MCP integration')
  .option('--quick', 'Quick setup with auto-detection')
  .option('--auto', 'Auto-configure all detected clients (use with --quick)')
  .option('--npm, --npx', 'Show NPX configuration')
  .option('--global', 'Install globally and show configuration')
  .option('--manual', 'Show manual configuration instructions')
  .option('--config-only', 'Only create configuration file')
  .helpOption('-h, --help', 'Display help for setup command')
  .action(async () => {
    await handleSetup()
  })

program
  .command('languages')
  .description('List all supported programming languages')
  .action(() => {
    handleListLanguages()
  })

program
  .command('analyze [directory]')
  .description('Analyze a directory and output the parsed tree')
  .option('-l, --languages <languages>', 'Comma-separated list of languages')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('--json', 'Output as JSON (default)')
  .option('--pretty', 'Pretty-print JSON output')
  .action(
    async (
      directory: string = '.',
      options: {
        languages?: string
        output?: string
        pretty?: boolean
      },
    ) => {
      const opts = program.opts() as CLIOptions
      const config: Config = {
        workingDir: resolve(directory),
        languages: options.languages ? options.languages.split(',') : [],
        maxDepth: 10,
        ignoreDirs: [],
        verbose: opts.verbose,
        quiet: opts.quiet,
      }

      await runStandaloneMode({
        ...config,
        output: options.output as string | undefined,
        pretty: options.pretty as boolean | undefined,
      })
    },
  )

/**
 * Determines execution mode and logs debug information
 *
 * @param options - CLI options
 * @param logger - Logger instance for debug output
 * @returns True if should run MCP mode, false for standalone
 */
function determineExecutionMode(options: CLIOptions, logger: ConsoleLogger): boolean {
  // Debug logging for mode detection
  logger.debug(`CLI args: ${process.argv.join(' ')}`)
  logger.debug(`--mcp flag: ${options.mcp || false}`)
  logger.debug(`stdin.isTTY: ${process.stdin.isTTY}`)
  logger.debug(`Environment: NODE_ENV=${process.env.NODE_ENV || 'undefined'}`)

  // Determine execution mode
  const shouldRunMCP = options.mcp || !process.stdin.isTTY
  logger.debug(
    `Mode decision: ${shouldRunMCP ? 'MCP Server' : 'Standalone'} (--mcp=${options.mcp || false}, !stdin.isTTY=${!process.stdin.isTTY})`,
  )

  return shouldRunMCP
}

/**
 * Runs the appropriate execution mode
 *
 * @param shouldRunMCP - Whether to run MCP server mode
 * @param config - Parsed configuration
 * @param logger - Logger instance
 */
async function runExecutionMode(
  shouldRunMCP: boolean,
  config: Config,
  logger: ConsoleLogger,
): Promise<void> {
  if (shouldRunMCP) {
    // Run in MCP mode
    logger.info('Starting Tree-Sitter MCP server...')
    logger.debug('Mode: MCP Server')
    await startMCPServer(config)
  }
  else {
    // Run in standalone mode
    logger.info('Running Tree-Sitter analysis...')
    logger.debug('Mode: Standalone')
    await runStandaloneMode(config)
  }
}

/**
 * Main action handler for the CLI program
 *
 * Coordinates all CLI operations including setup, configuration parsing,
 * mode detection, and execution of the appropriate service mode.
 *
 * @param options - Parsed CLI options from commander
 */
async function handleMainAction(options: CLIOptions): Promise<void> {
  const logger = new ConsoleLogger({
    level: options.verbose ? LOG_LEVELS.VERBOSE : LOG_LEVELS.INFO,
    quiet: options.quiet || false,
    useColors: true,
  })
  setLogger(logger)

  // Write debug log if enabled
  if (process.env.TREE_SITTER_MCP_DEBUG === 'true') {
    try {
      const { homedir } = await import('os')
      const { appendFileSync } = await import('fs')
      const globalLogPath = resolve(homedir(), '.tree-sitter-mcp-debug.log')
      const timestamp = new Date().toISOString()
      const cliStartupInfo = `[${timestamp}] CLI Startup:
  - Raw Args: ${JSON.stringify(process.argv)}
  - Parsed Options: ${JSON.stringify(options)}
  - Process CWD: ${process.cwd()}
  - stdin.isTTY: ${process.stdin.isTTY}
  - Environment: NODE_ENV=${process.env.NODE_ENV || 'undefined'}
\n`
      appendFileSync(globalLogPath, cliStartupInfo)
    }
    catch {
      // Ignore errors writing to global debug log
    }
  }

  try {
    // Handle special commands first
    if (options.listLanguages) {
      handleListLanguages()
      process.exit(0)
    }

    if (options.setup) {
      await handleSetup()
      process.exit(0)
    }

    // Parse configuration
    const config = parseConfig(options)

    // Determine and run execution mode
    const shouldRunMCP = determineExecutionMode(options, logger)
    await runExecutionMode(shouldRunMCP, config, logger)
  }
  catch (error) {
    logger.error('Fatal error:', error)
    process.exit(1)
  }
}

/**
 * Parses CLI options and optional config file into a unified configuration
 *
 * Merges settings from multiple sources with the following precedence:
 * 1. CLI options (highest priority)
 * 2. Configuration file settings
 * 3. Default values (lowest priority)
 *
 * @param options - Parsed CLI options from commander
 * @returns Merged configuration object
 * @throws Error if config file loading fails
 */
function parseConfig(options: CLIOptions): Config {
  let config: Config = {
    workingDir: resolve(options.dir || '.'),
    languages: options.languages ? options.languages.split(',').map(l => l.trim()) : [],
    maxDepth: parseInt(String(options.maxDepth || '10'), 10),
    ignoreDirs: options.ignore ? options.ignore.split(',').map(d => d.trim()) : [],
    verbose: options.verbose,
    quiet: options.quiet,
  }

  if (options.config) {
    try {
      const configPath = resolve(options.config)
      const configFile = JSON.parse(readFileSync(configPath, 'utf-8')) as Partial<Config>

      config = {
        ...configFile,
        ...config,
        languages: options.languages ? config.languages : configFile.languages || config.languages,
        ignoreDirs: options.ignore ? config.ignoreDirs : configFile.ignoreDirs || config.ignoreDirs,
      }
    }
    catch (error) {
      throw new Error(`Failed to load config file: ${String(error)}`)
    }
  }

  return config
}

/**
 * Displays a formatted list of all supported programming languages
 *
 * Shows language names, supported file extensions, and total count
 * with color-coded output for better readability.
 */
function handleListLanguages(): void {
  const logger = getLogger()
  const languages = listSupportedLanguages()

  logger.info(chalk.cyan('\nSupported Languages:\n'))

  languages.forEach((lang) => {
    logger.info(`  ${chalk.green('•')} ${chalk.bold(lang.name)}`)
    logger.info(`    Extensions: ${chalk.dim(lang.extensions.join(', '))}`)
  })

  logger.info(chalk.dim(`\n  Total: ${languages.length} languages supported`))
  logger.info('')
}

/**
 * Launches the interactive MCP setup process
 *
 * Delegates to the setup module which handles client detection,
 * configuration generation, and installation instructions.
 */
async function handleSetup(): Promise<void> {
  await runSetup()
}

// Enhanced help text
program.addHelpText(
  'after',
  `

${chalk.cyan('Examples:')}
  
  ${chalk.dim('# Run as MCP server')}
  $ @nendo/tree-sitter-mcp --mcp
  
  ${chalk.dim('# Analyze current directory')}
  $ @nendo/tree-sitter-mcp analyze
  
  ${chalk.dim('# Analyze specific directory with filters')}
  $ @nendo/tree-sitter-mcp analyze ./src --languages typescript,javascript
  
  ${chalk.dim('# Use configuration file')}
  $ @nendo/tree-sitter-mcp --mcp --config ./config.json
  
  ${chalk.dim('# Run interactive setup')}
  $ @nendo/tree-sitter-mcp setup
  
  ${chalk.dim('# List supported languages')}
  $ @nendo/tree-sitter-mcp languages

${chalk.cyan('Configuration File Format:')}
  
  {
    "workingDir": "./src",
    "languages": ["typescript", "javascript"],
    "maxDepth": 10,
    "ignoreDirs": [".git", "node_modules", "dist"],
    "verbose": false,
    "quiet": false
  }

${chalk.cyan('Environment Variables:')}
  
  TREE_SITTER_MCP_LOG_LEVEL    Set log level (error, warn, info, debug, verbose)
  TREE_SITTER_MCP_CONFIG        Default config file path
  TREE_SITTER_MCP_MAX_MEMORY    Maximum memory usage in MB (default: 1024)

${chalk.cyan('More Information:')}
  
  Repository: ${chalk.underline('https://github.com/your-username/tree-sitter-mcp')}
  MCP Docs:   ${chalk.underline('https://modelcontextprotocol.io')}
`,
)

// Parse arguments and run
program.parse(process.argv)

// Show help if no arguments provided AND stdin is a TTY (not piped from MCP client)
if (process.argv.length === 2 && process.stdin.isTTY) {
  program.help()
}
