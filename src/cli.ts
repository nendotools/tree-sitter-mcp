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
import { homedir } from 'os'
import { appendFileSync } from 'fs'
import chalk from 'chalk'

import { SERVICE } from './constants/service-constants.js'
import { LOG_LEVELS } from './constants/app-constants.js'
import type { CLIOptions, Config, Logger } from './types/index.js'
import { initializeLogger, getLogger } from './utils/logger.js'
import { startMCPServer } from './mcp/server.js'
import { runStandaloneMode } from './standalone/index.js'
import { runSetup } from './setup.js'
import { listSupportedLanguages } from './parsers/registry.js'

// Import all modules statically for better dependency analysis and performance
import { handleSearch as executeModularSearch } from './cli/search/index.js'
import { TreeManager } from './core/tree-manager.js'
import { getParserRegistry } from './parsers/registry.js'
import { DeadCodeCoordinator } from './mcp/tools/analyzers/deadcode/deadcode-coordinator.js'
import { QualityAnalyzer } from './mcp/tools/analyzers/quality-analyzer.js'

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
  .description('Analyze a directory and output the parsed tree or run code analysis')
  .option('-l, --languages <languages>', 'Comma-separated list of languages')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('--json', 'Output as JSON (default)')
  .option('--pretty', 'Pretty-print JSON output')
  .option('--analysis-type <type>', 'Type of analysis: tree (default), deadcode, quality, structure, config-validation')
  .option('--include-metrics', 'Include quantitative metrics in analysis output')
  .action(
    async (
      directory: string = '.',
      options: {
        languages?: string
        output?: string
        pretty?: boolean
        analysisType?: string
        includeMetrics?: boolean
      },
    ) => {
      const analysisType = options.analysisType || 'tree'

      if (analysisType === 'tree') {
        // Original tree output mode
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
      }
      else {
        // Code analysis mode
        await handleAnalyzeCode(directory, analysisType, options)
      }
    },
  )

program
  .command('search <query> [directory]')
  .description('Search for code elements in a directory')
  .option('-l, --languages <languages>', 'Comma-separated list of languages')
  .option('-t, --types <types>', 'Comma-separated list of element types (function, class, method, interface, variable)')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('--exact', 'Use exact matching instead of fuzzy')
  .option('--pretty', 'Pretty-print JSON output')
  .option('--max-results <count>', 'Maximum number of results', '50')
  .action(
    async (
      query: string,
      directory: string = '.',
      options: {
        languages?: string
        types?: string
        output?: string
        exact?: boolean
        pretty?: boolean
        maxResults?: string
      },
    ) => {
      await handleSearch(query, directory, options)
    },
  )

/**
 * Determines execution mode and logs debug information
 *
 * @param options - CLI options
 * @param logger - Logger instance for debug output
 * @returns True if should run MCP mode, false for standalone
 */
function determineExecutionMode(options: CLIOptions, logger: Logger): boolean {
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
  logger: Logger,
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
  // Initialize the singleton logger with CLI options
  const logger = initializeLogger({
    level: options.verbose ? LOG_LEVELS.VERBOSE : LOG_LEVELS.INFO,
    quiet: options.quiet || false,
    useColors: true,
  })

  // Write debug log if enabled
  if (process.env.TREE_SITTER_MCP_DEBUG === 'true') {
    try {
      // Using static imports now
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

  logger.output(chalk.cyan('\nSupported Languages:\n'))

  languages.forEach((lang) => {
    logger.output(`  ${chalk.green('•')} ${chalk.bold(lang.name)}`)
    logger.output(`    Extensions: ${chalk.dim(lang.extensions.join(', '))}`)
  })

  logger.output(chalk.dim(`\n  Total: ${languages.length} languages supported`))
  logger.output('')
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

/**
 * Handles the search command for finding code elements
 *
 * @param query - Search query string
 * @param directory - Directory to search in
 * @param options - Search options
 */
async function handleSearch(
  query: string,
  directory: string,
  options: {
    languages?: string
    types?: string
    output?: string
    exact?: boolean
    pretty?: boolean
    maxResults?: string
  },
): Promise<void> {
  const opts = program.opts() as CLIOptions

  // Delegate to modular search system
  await executeModularSearch(query, directory, options, opts)
}

/**
 * Handles code analysis commands (deadcode, quality, etc.)
 *
 * @param directory - Directory to analyze
 * @param analysisType - Type of analysis to run
 * @param options - Analysis options
 */
async function handleAnalyzeCode(directory: string, analysisType: string, options: any): Promise<void> {
  const logger = getLogger()
  const projectId = `cli-analysis-${Date.now()}`

  try {
    logger.output(chalk.cyan(`🔍 Running ${analysisType} analysis on ${directory}...`))

    // Setup TreeManager and parse files
    const treeManager = new TreeManager(getParserRegistry())

    // Smart language detection for JS/TS projects
    const languages = options.languages ? options.languages.split(',') : ['typescript', 'javascript', 'tsx', 'jsx']

    // Auto-include JSON for JS/TS projects to parse package.json and configs
    const isJsProject = languages.some((lang: string) => ['typescript', 'javascript', 'tsx', 'jsx'].includes(lang))
    if (isJsProject && !languages.includes('json')) {
      languages.push('json')
    }

    // Auto-include Vue for Vue/Nuxt projects (check for vue dependencies in package.json)
    try {
      // Try multiple package.json locations for mono-repos
      const packageJsonPaths = [
        `${directory}/package.json`,
        `${directory}/client/package.json`, // Common mono-repo pattern
        `${directory}/frontend/package.json`, // Alternative pattern
      ]

      for (const packageJsonPath of packageJsonPaths) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
          const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }

          if ((allDeps.vue || allDeps.nuxt || allDeps['@nuxt/core']) && !languages.includes('vue')) {
            languages.push('vue')
            break
          }
        }
        catch {
          // Try next path
          continue
        }
      }
    }
    catch {
      // Ignore package.json read errors
    }

    const config = {
      workingDir: directory,
      languages,
      maxDepth: 10,
      ignoreDirs: [
        'node_modules', '.git', 'dist', 'build', 'out', 'lib',
        'coverage', '.next', 'target', 'bin', '.turbo', '.cache',
        '__pycache__', '.pytest_cache', '.mypy_cache',
      ],
    }

    await treeManager.createProject(projectId, config)
    await treeManager.initializeProject(projectId)

    const project = treeManager.getProject(projectId)
    if (!project) {
      throw new Error('Failed to initialize project')
    }

    logger.output(chalk.dim(`📁 Analyzed ${project.fileIndex.size} files`))

    // Get appropriate analyzer
    let analyzer: any
    switch (analysisType) {
      case 'deadcode':
        analyzer = new DeadCodeCoordinator()
        break
      case 'quality':
        analyzer = new QualityAnalyzer()
        break
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`)
    }

    // Prepare analysis result structure
    const result = {
      projectId,
      analysisTypes: [analysisType as any],
      scope: 'project' as const,
      summary: { totalFindings: 0, criticalFindings: 0, warningFindings: 0, infoFindings: 0 },
      findings: [] as any[],
      metrics: {} as any,
    }

    const allNodes = Array.from(project.fileIndex.values())
    await analyzer.analyze(allNodes, result)

    // Format and display results
    logger.output(chalk.cyan(`\n📊 ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis Results:`))

    if (result.findings.length === 0) {
      logger.output(chalk.green('✅ No issues found!'))
    }
    else {
      if (analysisType === 'deadcode') {
        // Dead code specific formatting
        const orphanedFiles = result.findings.filter(f => f.category === 'orphaned_file')
        const unusedExports = result.findings.filter(f => f.category === 'unused_export')
        const unusedBarrelGroups = result.findings.filter(f => f.category === 'unused_barrel_group')

        if (unusedBarrelGroups.length > 0) {
          logger.output(chalk.blue(`\n📦 Unused Module Barrels (${unusedBarrelGroups.length}):`))
          unusedBarrelGroups.forEach((finding) => {
            logger.output(`  ${chalk.blue('•')} ${finding.description}`)
            logger.output(`    ${chalk.dim(finding.context)}`)
          })
        }

        if (orphanedFiles.length > 0) {
          logger.output(chalk.yellow(`\n💀 Orphaned Files (${orphanedFiles.length}):`))
          orphanedFiles.slice(0, 20).forEach((finding) => {
            logger.output(`  ${chalk.red('•')} ${finding.location}`)
          })
          if (orphanedFiles.length > 20) {
            logger.output(chalk.dim(`    ... and ${orphanedFiles.length - 20} more`))
          }
        }

        if (unusedExports.length > 0) {
          logger.output(chalk.yellow(`\n📤 Unused Exports (${unusedExports.length}):`))
          unusedExports.slice(0, 10).forEach((finding) => {
            logger.output(`  ${chalk.yellow('•')} ${finding.description}`)
            logger.output(`    ${chalk.dim(finding.location)}`)
          })
          if (unusedExports.length > 10) {
            logger.output(chalk.dim(`    ... and ${unusedExports.length - 10} more`))
          }
        }
      }
      else {
        // Generic findings formatting
        const groupedFindings = result.findings.reduce((acc, finding) => {
          const key = finding.severity || 'info'
          if (!acc[key]) acc[key] = []
          acc[key].push(finding)
          return acc
        }, {} as Record<string, any[]>)

        for (const [severity, findings] of Object.entries(groupedFindings)) {
          const icon = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵'
          const findingList = findings as any[]
          logger.output(chalk.yellow(`\n${icon} ${severity.toUpperCase()} (${findingList.length}):`))
          findingList.slice(0, 10).forEach((finding: any) => {
            logger.output(`  • ${finding.description}`)
            logger.output(`    ${chalk.dim(finding.location)}`)
          })
          if (findingList.length > 10) {
            logger.output(chalk.dim(`    ... and ${findingList.length - 10} more`))
          }
        }
      }
    }

    // Show metrics if requested
    if (options.includeMetrics && result.metrics) {
      logger.output(chalk.cyan('\n📈 Metrics:'))
      if (analysisType === 'deadcode' && result.metrics.deadCode) {
        const metrics = result.metrics.deadCode
        logger.output(`  Orphaned files: ${metrics.orphanedFiles}`)
        logger.output(`  Unused exports: ${metrics.unusedExports}`)
        logger.output(`  Unused dependencies: ${metrics.unusedDependencies}`)
      }
      else {
        // Generic metrics display
        Object.entries(result.metrics).forEach(([key, value]) => {
          logger.output(`  ${key}: ${JSON.stringify(value)}`)
        })
      }
    }

    logger.output('')

    // Cleanup
    treeManager.destroyProject(projectId)
  }
  catch (error) {
    logger.error(`${analysisType} analysis failed: ${error}`)
    process.exit(1)
  }
}

// Enhanced help text
program.addHelpText(
  'after',
  `

${chalk.cyan('Examples:')}
  
  ${chalk.dim('# Run as MCP server')}
  $ @nendo/tree-sitter-mcp --mcp
  
  ${chalk.dim('# Search for functions in current directory')}
  $ @nendo/tree-sitter-mcp search "handleRequest" 
  
  ${chalk.dim('# Search with filters')}
  $ @nendo/tree-sitter-mcp search "User" --types class,interface --languages typescript
  
  ${chalk.dim('# Analyze current directory')}
  $ @nendo/tree-sitter-mcp analyze
  
  ${chalk.dim('# Analyze specific directory with filters')}
  $ @nendo/tree-sitter-mcp analyze ./src --languages typescript,javascript
  
  ${chalk.dim('# Use configuration file')}
  $ @nendo/tree-sitter-mcp --mcp --config ./config.json
  
  ${chalk.dim('# Run interactive setup')}
  $ @nendo/tree-sitter-mcp setup
  
  ${chalk.dim('# List supported languages (20 total: 16 programming + 4 config)')}
  $ @nendo/tree-sitter-mcp languages

${chalk.cyan('Configuration File Format:')}
  
  {
    "workingDir": "./src",
    "languages": ["typescript", "javascript", "json", "yaml"],
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
  
  Repository: ${chalk.underline('https://github.com/nendotools/tree-sitter-mcp')}
  MCP Docs:   ${chalk.underline('https://modelcontextprotocol.io')}
`,
)

// Parse arguments and run
program.parse(process.argv)

// Show help if no arguments provided AND stdin is a TTY (not piped from MCP client)
if (process.argv.length === 2 && process.stdin.isTTY) {
  program.help()
}
