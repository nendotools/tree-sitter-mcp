#!/usr/bin/env node

/**
 * CLI entry point for the Tree-Sitter MCP service
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

import { SERVICE } from './constants/service-constants.js';
import { LOG_LEVELS } from './constants/cli-constants.js';
import type { CLIOptions, Config } from './types/index.js';
import { ConsoleLogger, setLogger, getLogger } from './utils/logger.js';
import { startMCPServer } from './mcp/server.js';
import { runStandaloneMode } from './standalone/index.js';
import { runSetup } from './setup.js';
import { listSupportedLanguages } from './parsers/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version
interface PackageJson {
  version: string;
  [key: string]: unknown;
}

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
) as PackageJson;

// Create the CLI program
const program = new Command();

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
    // Configure logger
    const logger = new ConsoleLogger({
      level: options.verbose ? LOG_LEVELS.VERBOSE : LOG_LEVELS.INFO,
      quiet: options.quiet || false,
      useColors: true,
    });
    setLogger(logger);

    try {
      // Handle special commands first
      if (options.listLanguages) {
        handleListLanguages();
        process.exit(0);
      }

      if (options.setup) {
        handleSetup();
        process.exit(0);
      }

      // Parse configuration
      const config = parseConfig(options);

      // Run in appropriate mode
      if (options.mcp) {
        logger.info(chalk.cyan('Starting Tree-Sitter MCP server...'));
        await startMCPServer(config);
      } else {
        // Standalone mode for testing/debugging
        await runStandaloneMode(config);
      }
    } catch (error) {
      logger.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    }
  });

// Add subcommands
program
  .command('setup')
  .description('Run interactive setup to configure MCP integration')
  .action(() => {
    handleSetup();
  });

program
  .command('languages')
  .description('List all supported programming languages')
  .action(() => {
    handleListLanguages();
  });

program
  .command('analyze [directory]')
  .description('Analyze a directory and output the parsed tree')
  .option('-l, --languages <languages>', 'Comma-separated list of languages')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('--json', 'Output as JSON (default)')
  .option('--pretty', 'Pretty-print JSON output')
  .action(async (directory: string = '.', options: {
    languages?: string;
    output?: string;
    pretty?: boolean;
  }) => {
    const opts = program.opts() as CLIOptions;
    const config: Config = {
      workingDir: resolve(directory),
      languages: options.languages ? options.languages.split(',') : [],
      maxDepth: 10,
      ignoreDirs: [],
      verbose: opts.verbose,
      quiet: opts.quiet,
    };

    await runStandaloneMode({
      ...config,
      output: options.output as string | undefined,
      pretty: options.pretty as boolean | undefined,
    });
  });

// Parse configuration from CLI options and config file
function parseConfig(options: CLIOptions): Config {
  let config: Config = {
    workingDir: resolve(options.dir || '.'),
    languages: options.languages ? options.languages.split(',').map(l => l.trim()) : [],
    maxDepth: parseInt(options.maxDepth || '10', 10),
    ignoreDirs: options.ignore ? options.ignore.split(',').map(d => d.trim()) : [],
    verbose: options.verbose,
    quiet: options.quiet,
  };

  // Load config file if provided
  if (options.config) {
    try {
      const configPath = resolve(options.config);
      const configFile = JSON.parse(readFileSync(configPath, 'utf-8')) as Partial<Config>;
      
      // Merge config file with CLI options (CLI takes precedence)
      config = {
        ...configFile,
        ...config,
        // Arrays need special handling for merging
        languages: options.languages ? config.languages : (configFile.languages || config.languages),
        ignoreDirs: options.ignore ? config.ignoreDirs : (configFile.ignoreDirs || config.ignoreDirs),
      };
    } catch (error) {
      throw new Error(`Failed to load config file: ${String(error)}`);
    }
  }

  return config;
}

// Handle list languages command
function handleListLanguages(): void {
  const logger = getLogger();
  const languages = listSupportedLanguages();
  
  logger.info(chalk.cyan('\n📚 Supported Languages:\n'));
  
  languages.forEach(lang => {
    logger.info(`  ${chalk.green('•')} ${chalk.bold(lang.name)}`);
    logger.info(`    Extensions: ${chalk.dim(lang.extensions.join(', '))}`);
  });
  
  logger.info(chalk.dim(`\n  Total: ${languages.length} languages supported`));
  logger.info('');
}

// Handle setup command
function handleSetup(): void {
  const logger = getLogger();
  logger.info(chalk.cyan('\n🚀 Tree-Sitter MCP Setup\n'));
  runSetup();
}

// Enhanced help text
program.addHelpText('after', `

${chalk.cyan('Examples:')}
  
  ${chalk.dim('# Run as MCP server')}
  $ tree-sitter-mcp --mcp
  
  ${chalk.dim('# Analyze current directory')}
  $ tree-sitter-mcp analyze
  
  ${chalk.dim('# Analyze specific directory with filters')}
  $ tree-sitter-mcp analyze ./src --languages typescript,javascript
  
  ${chalk.dim('# Use configuration file')}
  $ tree-sitter-mcp --mcp --config ./config.json
  
  ${chalk.dim('# Run interactive setup')}
  $ tree-sitter-mcp setup
  
  ${chalk.dim('# List supported languages')}
  $ tree-sitter-mcp languages

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
`);

// Parse arguments and run
program.parse(process.argv);

// Show help if no arguments provided
if (process.argv.length === 2) {
  program.help();
}