/**
 * Streamlined CLI - consolidated from complex CLI sub-directories
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { execSync } from 'child_process'
import { analyzeProject, formatAnalysisReport } from '../analysis/index.js'
import { analyzeErrors } from '../analysis/errors.js'
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
    .description('Search for code elements with progressive content inclusion')
    .option('-d, --directory <dir>', 'Directory to search (default: current directory)')
    .option('-p, --project-id <id>', 'Optional: Project ID for persistent AST caching')
    .option('--path-pattern <pattern>', 'Optional: Filter results to files containing this text in their path')
    .option('-t, --type <types...>', 'Filter by element types (function, class, etc.)')
    .option('-m, --max-results <num>', 'Maximum number of results', '20')
    .option('--fuzzy-threshold <num>', 'Minimum fuzzy match score (0-100)', '30')
    .option('--exact', 'Exact match only')
    .option('--force-content-inclusion', 'Force content inclusion even with 4+ results')
    .option('--max-content-lines <num>', 'Maximum lines for content truncation', '150')
    .option('--disable-content-inclusion', 'Disable content inclusion entirely')
    .option('--ignore-dirs <dirs...>', 'Additional directories to ignore (beyond default ignore list)')
    .option('--output <format>', 'Output format (json, text)', 'json')
    .action(handleSearch)

  program
    .command('analyze')
    .description('Analyze code quality, structure, dead code, and configuration issues')
    .option('-d, --directory <dir>', 'Directory to analyze (default: current directory)')
    .option('-p, --project-id <id>', 'Optional: Project ID for persistent AST caching')
    .option('--path-pattern <pattern>', 'Optional: Filter results to files containing this text in their path')
    .option('-a, --analysis-types <types...>', 'Analysis types to run: quality, deadcode, structure (default: quality)', ['quality'])
    .option('--ignore-dirs <dirs...>', 'Additional directories to ignore (beyond default ignore list)')
    .option('--max-results <num>', 'Maximum number of findings to return', '20')
    .option('--output <format>', 'Output format (json, text, markdown)', 'json')
    .action(handleAnalysis)

  program
    .command('errors')
    .description('Find actionable syntax errors with detailed context and suggestions')
    .option('-d, --directory <dir>', 'Directory to analyze (default: current directory)')
    .option('-p, --project-id <id>', 'Optional: Project ID for persistent AST caching')
    .option('--path-pattern <pattern>', 'Optional: Filter results to files containing this text in their path')
    .option('--ignore-dirs <dirs...>', 'Additional directories to ignore (beyond default ignore list)')
    .option('--max-results <num>', 'Maximum number of errors to return', '50')
    .option('--output <format>', 'Output format (json, text)', 'json')
    .action(handleErrors)

  program
    .command('find-usage <identifier>')
    .description('Find all usages of an identifier')
    .option('-d, --directory <dir>', 'Directory to search (default: current directory)')
    .option('-p, --project-id <id>', 'Optional: Project ID for persistent AST caching')
    .option('--path-pattern <pattern>', 'Optional: Filter results to files containing this text in their path')
    .option('--case-sensitive', 'Case sensitive search')
    .option('--exact', 'Exact match only')
    .option('--ignore-dirs <dirs...>', 'Additional directories to ignore (beyond default ignore list)')
    .option('-m, --max-results <num>', 'Maximum number of results', '50')
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
  directory?: string
  projectId?: string
  pathPattern?: string
  type?: string[]
  maxResults: string
  fuzzyThreshold: string
  exact?: boolean
  ignoreDirs?: string[]
  output: string
  debug?: boolean
  quiet?: boolean

  // Content inclusion options
  forceContentInclusion?: boolean
  maxContentLines?: string
  disableContentInclusion?: boolean
}

async function handleSearch(query: string, options: SearchOptions): Promise<void> {
  const logger = initializeLogger(options.debug ? 'debug' : 'info', options.quiet)

  try {
    logger.info(`Searching for: ${query}`)

    const project = await getOrCreateProject(persistentManager, {
      directory: options.directory || process.cwd(),
      languages: [],
      ignoreDirs: options.ignoreDirs || [],
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

    let maxResults = 20
    if (options.maxResults) {
      const parsed = parseInt(options.maxResults)
      if (isNaN(parsed) || parsed < 0) {
        throw new Error(`Invalid max-results value: ${options.maxResults}. Must be a non-negative number.`)
      }
      maxResults = parsed
    }

    let fuzzyThreshold = 30
    if (options.fuzzyThreshold) {
      const parsed = parseInt(options.fuzzyThreshold)
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        throw new Error(`Invalid fuzzy-threshold value: ${options.fuzzyThreshold}. Must be a number between 0 and 100.`)
      }
      fuzzyThreshold = parsed
    }

    let maxContentLines = 150
    if (options.maxContentLines) {
      const parsed = parseInt(options.maxContentLines)
      if (isNaN(parsed) || parsed < 1) {
        throw new Error(`Invalid max-content-lines value: ${options.maxContentLines}. Must be a positive number.`)
      }
      maxContentLines = parsed
    }

    const results = searchCode(query, searchNodes, {
      maxResults,
      fuzzyThreshold,
      exactMatch: options.exact,
      types: options.type,
      pathPattern: options.pathPattern,
      // New content inclusion options
      forceContentInclusion: options.forceContentInclusion,
      maxContentLines,
      disableContentInclusion: options.disableContentInclusion,
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
          // New content inclusion fields
          contentIncluded: r.contentIncluded,
          content: r.content,
          contentTruncated: r.contentTruncated,
          contentLines: r.contentLines,
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

      // Show content inclusion status and content if available
      if (result.contentIncluded && result.content) {
        logger.output(`  ${chalk.dim('Content:')} ${result.contentTruncated ? `${result.contentLines} lines (truncated)` : `${result.contentLines} lines`}`)
        logger.output('')
        logger.output(chalk.dim('  ┌─ Content:'))
        // Show content with indentation
        const contentLines = result.content.split('\n')
        const maxShowLines = 10 // Show max 10 lines in text mode for readability
        const showLines = contentLines.slice(0, Math.min(maxShowLines, contentLines.length))
        showLines.forEach((line) => {
          logger.output(chalk.dim('  │ ') + line)
        })
        if (contentLines.length > maxShowLines) {
          logger.output(chalk.dim(`  │ ... (${contentLines.length - maxShowLines} more lines)`))
        }
        logger.output(chalk.dim('  └─'))
      }
      else if (result.contentIncluded === false) {
        logger.output(`  ${chalk.dim('Content:')} Not included (${results.length >= 4 ? 'discovery mode' : 'no content available'})`)
      }

      logger.output('')
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (options.output === 'json') {
      logger.output(JSON.stringify({
        error: true,
        message: errorMessage,
        query,
        results: [],
        totalResults: 0,
      }, null, 2))
    }
    else {
      logger.output(chalk.red(`Search failed: ${errorMessage}`))
    }

    process.exit(1)
  }
}

interface AnalysisOptions {
  directory?: string
  projectId?: string
  pathPattern?: string
  analysisTypes?: string[]
  ignoreDirs?: string[]
  maxResults?: string
  output?: string
  debug?: boolean
  quiet?: boolean
}

interface ErrorsOptions {
  directory?: string
  projectId?: string
  pathPattern?: string
  ignoreDirs?: string[]
  maxResults?: string
  output?: string
  debug?: boolean
  quiet?: boolean
}

async function handleAnalysis(options: AnalysisOptions): Promise<void> {
  const logger = initializeLogger(options.debug ? 'debug' : 'info', options.quiet)

  try {
    const analysisTypes = options.analysisTypes || ['quality']
    const analysisOptions: CoreAnalysisOptions = {
      includeQuality: analysisTypes.includes('quality'),
      includeDeadcode: analysisTypes.includes('deadcode'),
      includeStructure: analysisTypes.includes('structure'),
      includeSyntax: analysisTypes.includes('syntax'),
    }

    const project = await getOrCreateProject(persistentManager, {
      directory: options.directory || process.cwd(),
      ignoreDirs: options.ignoreDirs || [],
      autoWatch: false,
    }, options.projectId)

    logger.info(`Analyzing ${project.config.directory} (project: ${project.id})...`)

    const result = await analyzeProject(project, analysisOptions)

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

    let maxResults = 20
    if (options.maxResults) {
      const parsed = parseInt(options.maxResults)
      if (isNaN(parsed) || parsed < 0) {
        throw new Error(`Invalid max-results value: ${options.maxResults}. Must be a non-negative number.`)
      }
      maxResults = parsed
    }
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
      filesWithErrors: metrics.syntax?.filesWithErrors || 0,
      totalSyntaxErrors: metrics.syntax?.totalSyntaxErrors || 0,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (options.output === 'json') {
      logger.output(JSON.stringify({
        error: true,
        message: errorMessage,
        findings: [],
        metrics: {},
        summary: { totalFindings: 0, criticalFindings: 0, warningFindings: 0, infoFindings: 0 },
      }, null, 2))
    }
    else {
      logger.output(chalk.red(`Analysis failed: ${errorMessage}`))
    }

    process.exit(1)
  }
}

async function handleErrors(options: ErrorsOptions): Promise<void> {
  const logger = initializeLogger(options.debug ? 'debug' : 'info', options.quiet)

  try {
    const project = await getOrCreateProject(persistentManager, {
      directory: options.directory || process.cwd(),
      ignoreDirs: options.ignoreDirs || [],
      autoWatch: false,
    }, options.projectId)

    logger.info(`Finding errors in ${project.config.directory} (project: ${project.id})...`)
    const result = analyzeErrors(project)

    let filteredErrors = result.errors
    if (options.pathPattern) {
      filteredErrors = result.errors.filter(error =>
        error.file.includes(options.pathPattern!),
      )
    }

    const maxResults = options.maxResults ? parseInt(options.maxResults) : 50
    const limitedErrors = filteredErrors.slice(0, maxResults)

    const filteredResult = {
      ...result,
      errors: limitedErrors,
    }

    if (options.output === 'json') {
      logger.output(JSON.stringify(filteredResult, null, 2))
    }
    else {
      logger.output(formatErrorsReport(filteredResult))
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (options.output === 'json') {
      logger.output(JSON.stringify({
        error: true,
        message: errorMessage,
        errors: [],
        summary: { totalErrors: 0, filesWithErrors: 0, missingErrors: 0, parseErrors: 0, extraErrors: 0 },
        metrics: { totalFiles: 0, totalErrorNodes: 0, errorsByType: {}, errorsByFile: {} },
      }, null, 2))
    }
    else {
      logger.output(chalk.red(`Error analysis failed: ${errorMessage}`))
    }

    process.exit(1)
  }
}

function formatErrorsReport(result: any): string {
  const { errors, summary } = result

  let output = '\n=== Syntax Errors Analysis ===\n'
  output += `Total errors: ${summary.totalErrors}\n`
  output += `Files with errors: ${summary.filesWithErrors}\n`
  output += `Missing syntax: ${summary.missingErrors}\n`
  output += `Parse errors: ${summary.parseErrors}\n`
  output += `Extra syntax: ${summary.extraErrors}\n\n`

  if (errors.length === 0) {
    output += chalk.green('No syntax errors found! ✓\n')
    return output
  }

  // Group errors by type
  const errorsByType = {
    missing: errors.filter((e: any) => e.type === 'missing'),
    parse_error: errors.filter((e: any) => e.type === 'parse_error'),
    extra: errors.filter((e: any) => e.type === 'extra'),
  }

  if (errorsByType.missing.length > 0) {
    output += `=== Missing Syntax (${errorsByType.missing.length}) ===\n`
    for (const error of errorsByType.missing) {
      output += `  ${error.file}:${error.line}:${error.column}\n`
      output += `    Missing: ${error.nodeType}\n`
      output += `    Context: ${error.context}\n`
      output += `    Fix: ${error.suggestion}\n\n`
    }
  }

  if (errorsByType.parse_error.length > 0) {
    output += `=== Parse Errors (${errorsByType.parse_error.length}) ===\n`
    for (const error of errorsByType.parse_error) {
      output += `  ${error.file}:${error.line}:${error.column}\n`
      output += `    Error: "${error.text}"\n`
      output += `    Context: ${error.context}\n`
      output += `    Fix: ${error.suggestion}\n\n`
    }
  }

  if (errorsByType.extra.length > 0) {
    output += `=== Extra Syntax (${errorsByType.extra.length}) ===\n`
    for (const error of errorsByType.extra) {
      output += `  ${error.file}:${error.line}:${error.column}\n`
      output += `    Extra: "${error.text}"\n`
      output += `    Context: ${error.context}\n`
      output += `    Fix: ${error.suggestion}\n\n`
    }
  }

  return output
}

interface FindUsageOptions {
  directory?: string
  projectId?: string
  pathPattern?: string
  caseSensitive?: boolean
  exact?: boolean
  ignoreDirs?: string[]
  maxResults: string
  output: string
  debug?: boolean
  quiet?: boolean
}

async function handleFindUsage(identifier: string, options: FindUsageOptions): Promise<void> {
  const logger = initializeLogger(options.debug ? 'debug' : 'info', options.quiet)

  try {
    // Handle empty identifier gracefully
    if (!identifier || identifier.trim() === '') {
      if (options.output === 'json') {
        logger.output(JSON.stringify({
          identifier: identifier || '',
          usages: [],
          totalUsages: 0,
          displayedUsages: 0,
        }, null, 2))
      }
      else {
        logger.output(chalk.yellow('No identifier provided. No usages found.'))
      }
      return
    }

    logger.info(`Finding usage of: ${identifier}`)

    const project = await getOrCreateProject(persistentManager, {
      directory: options.directory || process.cwd(),
      languages: [],
      ignoreDirs: options.ignoreDirs || [],
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

    let maxResults = 50
    if (options.maxResults) {
      const parsed = parseInt(options.maxResults)
      if (isNaN(parsed) || parsed < 0) {
        throw new Error(`Invalid max-results value: ${options.maxResults}. Must be a non-negative number.`)
      }
      maxResults = parsed
    }
    const limitedResults = results.slice(0, maxResults)

    if (options.output === 'json') {
      logger.output(JSON.stringify({
        identifier,
        usages: limitedResults.map(result => ({
          path: result.node.path,
          startLine: result.startLine,
          endLine: result.endLine,
          startColumn: result.startColumn,
          endColumn: result.endColumn,
          type: result.node.type,
          name: result.node.name || '',
          context: result.context,
        })),
        totalUsages: results.length,
        displayedUsages: limitedResults.length,
      }, null, 2))
      return
    }

    if (limitedResults.length === 0) {
      logger.output(chalk.yellow(`No usage found for: ${identifier}`))
      return
    }

    const displayText = results.length > limitedResults.length
      ? `Found ${results.length} usages (showing first ${limitedResults.length}):\n`
      : `Found ${results.length} usages:\n`
    logger.output(chalk.cyan(displayText))

    for (const result of limitedResults) {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (options.output === 'json') {
      logger.output(JSON.stringify({
        error: true,
        message: errorMessage,
        identifier,
        usages: [],
        totalUsages: 0,
      }, null, 2))
    }
    else {
      logger.output(chalk.red(`Usage search failed: ${errorMessage}`))
    }

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
