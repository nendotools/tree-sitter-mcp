/**
 * Streamlined CLI - consolidated from complex CLI sub-directories
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { analyzeProject, formatAnalysisReport } from '../analysis/index.js'
import { createProject, parseProject } from '../project/manager.js'
import { searchCode, findUsage } from '../core/search.js'
import { startMCPServer } from '../mcp/server.js'
import { renderAnalysis, type AnalysisData } from '../constants/templates.js'
import { initializeLogger, getLogger } from '../utils/logger.js'
import { getVersion } from '../utils/version.js'
import type { AnalysisOptions as CoreAnalysisOptions } from '../types/analysis.js'

export function createCLI(): Command {
  const program = new Command()
    .name('tree-sitter-mcp')
    .description('Tree-sitter MCP server for code analysis and search')
    .version(getVersion())
    .option('--mcp', 'Run as MCP server')
    .option('--debug', 'Enable debug logging')
    .option('--quiet', 'Suppress non-error output')

  program
    .command('search <query>')
    .description('Search for code elements')
    .option('-d, --directory <dir>', 'Directory to search', process.cwd())
    .option('-t, --type <types...>', 'Filter by element types (function, class, etc.)')
    .option('-l, --languages <langs...>', 'Filter by programming languages')
    .option('-m, --max-results <num>', 'Maximum number of results', '20')
    .option('--exact', 'Exact match only')
    .option('--output <format>', 'Output format (json, text)', 'json')
    .action(handleSearch)

  program
    .command('analyze [directory]')
    .description('Analyze code quality, dead code, and structure')
    .option('--quality', 'Include quality analysis', true)
    .option('--deadcode', 'Include dead code analysis')
    .option('--structure', 'Include structure analysis')
    .option('--output <format>', 'Output format (json, text, markdown)', 'json')
    .action(handleAnalysis)

  program
    .command('find-usage <identifier>')
    .description('Find all usages of an identifier')
    .option('-d, --directory <dir>', 'Directory to search', process.cwd())
    .option('-l, --languages <langs...>', 'Filter by programming languages')
    .option('--case-sensitive', 'Case sensitive search')
    .option('--exact', 'Exact match only')
    .option('--output <format>', 'Output format (json, text)', 'json')
    .action(handleFindUsage)

  program
    .command('setup')
    .description('Setup MCP integration')
    .action(handleSetup)

  program.action(handleDefaultAction)

  return program
}

interface SearchOptions {
  directory: string
  type?: string[]
  languages?: string[]
  maxResults: string
  exact?: boolean
  output: string
  debug?: boolean
  quiet?: boolean
}

async function handleSearch(query: string, options: SearchOptions): Promise<void> {
  const logger = initializeLogger(options.debug ? 'debug' : 'info', options.quiet)

  try {
    logger.info(`Searching for: ${query}`)

    const project = createProject({
      directory: options.directory,
      languages: options.languages || [],
    })

    await parseProject(project)

    const allNodes = Array.from(project.files.values())
    const elementNodes = Array.from(project.nodes.values()).flat()
    const searchNodes = [...allNodes, ...elementNodes]

    const results = searchCode(query, searchNodes, {
      maxResults: parseInt(options.maxResults),
      exactMatch: options.exact,
      types: options.type,
    })

    if (options.output === 'json') {
      logger.output(JSON.stringify({
        query,
        results: results.map(r => ({
          name: r.node.name,
          type: r.node.type,
          path: r.node.path,
          startLine: r.node.startLine,
          endLine: r.node.endLine,
          startColumn: r.node.startColumn,
          endColumn: r.node.endColumn,
          score: r.score,
          matches: r.matches,
        })),
        totalResults: results.length,
      }, null, 2))
      return
    }

    if (results.length === 0) {
      logger.output(chalk.yellow('No results found'))
      return
    }

    logger.output(chalk.cyan(`Found ${results.length} results:\n`))

    for (const result of results) {
      const { node, score } = result
      logger.output(`${chalk.green('●')} ${chalk.bold(node.name || 'unnamed')} ${chalk.dim(`(${node.type})`)}`)
      logger.output(`  ${chalk.dim(node.path)}${node.startLine ? ':' + node.startLine : ''}`)
      logger.output(`  ${chalk.dim('Score:')} ${score}`)
      logger.output('')
    }
  }
  catch (error) {
    logger.error('Search failed:', error)
    process.exit(1)
  }
}

interface AnalysisOptions {
  quality?: boolean
  deadcode?: boolean
  structure?: boolean
  output?: string
  debug?: boolean
  quiet?: boolean
}

async function handleAnalysis(directory: string = process.cwd(), options: AnalysisOptions): Promise<void> {
  const logger = initializeLogger(options.debug ? 'debug' : 'info', options.quiet)

  try {
    const analysisOptions: CoreAnalysisOptions = {
      includeQuality: options.quality,
      includeDeadcode: options.deadcode,
      includeStructure: options.structure,
    }

    logger.info(`Analyzing ${directory}...`)

    const result = await analyzeProject(directory, analysisOptions)

    // Collect data for template rendering
    const { metrics, summary } = result
    const analysisData: AnalysisData = {
      totalFindings: summary.totalFindings,
      critical: summary.criticalFindings,
      warnings: summary.warningFindings,
      info: summary.infoFindings,
      qualityScore: metrics.quality?.codeQualityScore || 0,
      avgComplexity: metrics.quality?.avgComplexity || 0,
      avgMethodLength: metrics.quality?.avgMethodLength || 0,
      totalMethods: metrics.quality?.totalMethods || 0,
      analyzedFiles: metrics.structure?.analyzedFiles || 0,
      unusedFiles: metrics.deadcode?.unusedFiles || 0,
      unusedFunctions: metrics.deadcode?.unusedFunctions || 0,
      circularDependencies: metrics.structure?.circularDependencies || 0,
    }

    if (options.output === 'json') {
      logger.output(JSON.stringify(result, null, 2))
    }
    else if (options.output === 'markdown') {
      logger.output(formatAnalysisReport(result))
    }
    else {
      logger.output('\n' + renderAnalysis(analysisData, 'console'))
    }
  }
  catch (error) {
    logger.error('Analysis failed:', error)
    process.exit(1)
  }
}

interface FindUsageOptions {
  directory: string
  languages?: string[]
  caseSensitive?: boolean
  exact?: boolean
  output: string
  debug?: boolean
  quiet?: boolean
}

async function handleFindUsage(identifier: string, options: FindUsageOptions): Promise<void> {
  const logger = initializeLogger(options.debug ? 'debug' : 'info', options.quiet)

  try {
    logger.info(`Finding usage of: ${identifier}`)

    const project = createProject({
      directory: options.directory,
      languages: options.languages || [],
    })

    await parseProject(project)

    const allNodes = Array.from(project.files.values())
    const elementNodes = Array.from(project.nodes.values()).flat()
    const searchNodes = [...allNodes, ...elementNodes]

    const results = findUsage(identifier, searchNodes, {
      caseSensitive: options.caseSensitive,
      exactMatch: options.exact,
    })

    if (options.output === 'json') {
      logger.output(JSON.stringify({
        identifier,
        usages: results.map(result => ({
          path: result.node.path,
          startLine: result.startLine,
          endLine: result.endLine,
          startColumn: result.startColumn,
          endColumn: result.endColumn,
          type: result.node.type,
          name: result.node.name,
          context: result.context,
        })),
        totalUsages: results.length,
      }, null, 2))
      return
    }

    if (results.length === 0) {
      logger.output(chalk.yellow(`No usage found for: ${identifier}`))
      return
    }

    logger.output(chalk.cyan(`Found ${results.length} usages:\n`))

    for (const result of results) {
      const position = `${result.startLine}:${result.startColumn}-${result.endLine}:${result.endColumn}`
      logger.output(`${chalk.green('●')} ${chalk.bold(result.node.path)}:${position}`)
      if (result.context) {
        const lines = result.context.split('\n')
        const previewLine = lines.find(line => line.startsWith('→ '))?.trim() || lines[0]?.trim() || ''
        if (previewLine) {
          logger.output(`  ${chalk.dim(previewLine.substring(0, 80))}${previewLine.length > 80 ? '...' : ''}`)
        }
      }
      logger.output('')
    }
  }
  catch (error) {
    logger.error('Usage search failed:', error)
    process.exit(1)
  }
}

function handleSetup(): void {
  const logger = getLogger()

  logger.output(chalk.cyan('MCP Setup Instructions:'))
  logger.output('')
  logger.output('1. Add to your Claude Desktop config (~/.config/claude-desktop/claude_desktop_config.json):')
  logger.output('')
  logger.output(chalk.gray('  {'))
  logger.output(chalk.gray('    "mcpServers": {'))
  logger.output(chalk.gray('      "tree-sitter-mcp": {'))
  logger.output(chalk.gray('        "command": "npx",'))
  logger.output(chalk.gray('        "args": ["tree-sitter-mcp", "--mcp"],'))
  logger.output(chalk.gray('        "cwd": "/path/to/your/project"'))
  logger.output(chalk.gray('      }'))
  logger.output(chalk.gray('    }'))
  logger.output(chalk.gray('  }'))
  logger.output('')
  logger.output('2. Restart Claude Desktop')
  logger.output('3. The server will be available for code analysis and search')
}

interface DefaultOptions {
  mcp?: boolean
}

function handleDefaultAction(options: DefaultOptions): void {
  if (options.mcp || !process.stdin.isTTY) {
    startMCPServer()
  }
  else {
    // eslint-disable-next-line no-console
    console.log('Use --help to see available commands')
  }
}
