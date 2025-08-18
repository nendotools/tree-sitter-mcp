/**
 * Streamlined CLI - consolidated from complex CLI sub-directories
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { execSync } from 'child_process'
import { analyzeProject, formatAnalysisReport } from '../analysis/index.js'
import { searchCode, findUsage } from '../core/search.js'
import { createPersistentManager, getOrCreateProject } from '../project/persistent-manager.js'
import { startMCPServer } from '../mcp/server.js'
import { renderAnalysis, type AnalysisData, SETUP_TEMPLATE, SETUP_AUTO_SUCCESS_TEMPLATE, SETUP_AUTO_EXISTS_TEMPLATE, SETUP_AUTO_FAILED_TEMPLATE, SETUP_CLAUDE_NOT_FOUND_TEMPLATE } from '../constants/templates.js'
import { initializeLogger, getLogger } from '../utils/logger.js'
import { getVersion } from '../utils/version.js'
import type { AnalysisOptions as CoreAnalysisOptions } from '../types/analysis.js'

const persistentManager = createPersistentManager(10)

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
    .option('-p, --project-id <id>', 'Project ID for persistent AST caching')
    .option('--path-pattern <pattern>', 'Filter by file path pattern')
    .option('-t, --type <types...>', 'Filter by element types (function, class, etc.)')
    .option('-l, --languages <langs...>', 'Filter by programming languages')
    .option('-m, --max-results <num>', 'Maximum number of results', '20')
    .option('--exact', 'Exact match only')
    .option('--output <format>', 'Output format (json, text)', 'json')
    .action(handleSearch)

  program
    .command('analyze [directory]')
    .description('Analyze code quality, dead code, and structure')
    .option('-p, --project-id <id>', 'Project ID for persistent AST caching')
    .option('--path-pattern <pattern>', 'Filter by file path pattern')
    .option('--quality', 'Include quality analysis', true)
    .option('--deadcode', 'Include dead code analysis')
    .option('--structure', 'Include structure analysis')
    .option('--max-results <num>', 'Maximum number of findings to return', '20')
    .option('--output <format>', 'Output format (json, text, markdown)', 'json')
    .action(handleAnalysis)

  program
    .command('find-usage <identifier>')
    .description('Find all usages of an identifier')
    .option('-d, --directory <dir>', 'Directory to search', process.cwd())
    .option('-p, --project-id <id>', 'Project ID for persistent AST caching')
    .option('--path-pattern <pattern>', 'Filter by file path pattern')
    .option('-l, --languages <langs...>', 'Filter by programming languages')
    .option('--case-sensitive', 'Case sensitive search')
    .option('--exact', 'Exact match only')
    .option('--output <format>', 'Output format (json, text)', 'json')
    .action(handleFindUsage)

  program
    .command('setup')
    .description('Setup MCP integration')
    .option('--auto', 'Automatically run the Claude MCP add command')
    .action(handleSetup)

  program.action(handleDefaultAction)

  return program
}

interface SearchOptions {
  directory: string
  projectId?: string
  pathPattern?: string
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

    const project = await getOrCreateProject(persistentManager, {
      directory: options.directory,
      languages: options.languages || [],
      autoWatch: false,
    }, options.projectId)

    const allNodes = Array.from(project.files.values())
    const elementNodes = Array.from(project.nodes.values()).flat()

    if (project.subProjects) {
      for (const subProject of project.subProjects) {
        allNodes.push(...Array.from(subProject.files.values()))
        elementNodes.push(...Array.from(subProject.nodes.values()).flat())
      }
    }

    const searchNodes = [...allNodes, ...elementNodes]

    const results = searchCode(query, searchNodes, {
      maxResults: parseInt(options.maxResults),
      exactMatch: options.exact,
      types: options.type,
      pathPattern: options.pathPattern,
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
  projectId?: string
  pathPattern?: string
  quality?: boolean
  deadcode?: boolean
  structure?: boolean
  maxResults?: string
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

    const project = await getOrCreateProject(persistentManager, {
      directory,
      autoWatch: false,
    }, options.projectId)

    logger.info(`Analyzing ${project.config.directory} (project: ${project.id})...`)

    const result = await analyzeProject(project.config.directory, analysisOptions)

    let filteredFindings = result.findings
    if (options.pathPattern) {
      filteredFindings = result.findings.filter(finding =>
        finding.location.includes(options.pathPattern!),
      )
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 }
    filteredFindings.sort((a, b) => {
      const aOrder = severityOrder[a.severity] ?? 3
      const bOrder = severityOrder[b.severity] ?? 3
      return aOrder - bOrder
    })

    const maxResults = options.maxResults ? parseInt(options.maxResults) : 20
    const limitedFindings = filteredFindings.slice(0, maxResults)

    const filteredResult = {
      ...result,
      findings: limitedFindings,
    }

    const { metrics, summary } = filteredResult
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
  projectId?: string
  pathPattern?: string
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

    const project = await getOrCreateProject(persistentManager, {
      directory: options.directory,
      languages: options.languages || [],
      autoWatch: false,
    }, options.projectId)

    const allNodes = Array.from(project.files.values())
    const elementNodes = Array.from(project.nodes.values()).flat()

    if (project.subProjects) {
      for (const subProject of project.subProjects) {
        allNodes.push(...Array.from(subProject.files.values()))
        elementNodes.push(...Array.from(subProject.nodes.values()).flat())
      }
    }

    const searchNodes = [...allNodes, ...elementNodes]

    const results = findUsage(identifier, searchNodes, {
      caseSensitive: options.caseSensitive,
      exactMatch: options.exact,
      pathPattern: options.pathPattern,
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

interface SetupOptions {
  auto?: boolean
}

async function handleSetup(options: SetupOptions): Promise<void> {
  const logger = getLogger()

  if (options.auto) {
    await runAutoSetup(logger)
  }
  else {
    logger.output(SETUP_TEMPLATE)
  }
}

async function runAutoSetup(logger: any): Promise<void> {
  try {
    execSync('claude --version', { stdio: 'pipe' })

    const output = execSync('claude mcp list', { encoding: 'utf8' })

    if (output.includes('tree-sitter-mcp')) {
      logger.output(SETUP_AUTO_EXISTS_TEMPLATE)
    }
    else {
      execSync('claude mcp add tree-sitter-mcp -s user -- npx -y @nendo/tree-sitter-mcp --mcp', { stdio: 'inherit' })
      logger.output(SETUP_AUTO_SUCCESS_TEMPLATE)
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('claude: command not found') || errorMessage.includes('not recognized')) {
      const claudeNotFoundOutput = SETUP_CLAUDE_NOT_FOUND_TEMPLATE
        .replace('{manualInstructions}', SETUP_TEMPLATE)
      logger.output(claudeNotFoundOutput)
    }
    else {
      const failedOutput = SETUP_AUTO_FAILED_TEMPLATE
        .replace('{error}', errorMessage)
        .replace('{manualInstructions}', SETUP_TEMPLATE)
      logger.output(failedOutput)
    }
  }
}

interface DefaultOptions {
  mcp?: boolean
}

function handleDefaultAction(options: DefaultOptions): void {
  if (options.mcp || !process.stdin.isTTY) {
    startMCPServer()
  }
  else {
    console.info('Use --help to see available commands')
  }
}
