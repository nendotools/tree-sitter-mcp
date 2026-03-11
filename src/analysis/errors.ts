/**
 * Actionable error detection and analysis using tree-sitter
 */

import type { Project } from '../types/core.js'

const ERROR_TYPES = {
  MISSING: 'missing',
  PARSE_ERROR: 'parse_error',
  EXTRA: 'extra',
} as const

const CLOSING_SYMBOLS = {
  BRACE: '}',
  PAREN: ')',
  BRACKET: ']',
  SEMICOLON: ';',
  QUOTE: '"',
  SINGLE_QUOTE: '\'',
} as const

const NODE_PATTERNS = {
  STATEMENT_BLOCK: 'statement_block',
  FUNCTION: 'function',
  IF_STATEMENT: 'if_statement',
  INTERFACE: 'interface',
  FORMAL_PARAMETERS: 'formal_parameters',
  FOR_STATEMENT: 'for_statement',
  WHILE_STATEMENT: 'while_statement',
  CLASS: 'class',
  ERROR: 'ERROR',
} as const

const COMMENT_NODE_TYPES = new Set([
  'comment',
  'line_comment',
  'multiline_comment',
  'block_comment',
  'doc_comment',
])

const MAX_ERROR_TEXT_LENGTH = 120

export interface ActionableError {
  type: 'missing' | 'parse_error' | 'extra'
  nodeType: string
  file: string
  line: number
  column: number
  endLine: number
  endColumn: number
  text: string
  context: string
  suggestion: string
  parentContext?: string
  enclosingFunction?: EnclosingContext
}

export interface EnclosingContext {
  name: string
  type: string
  startLine: number
  endLine: number
}

export interface DependencyModuleSummary {
  module: string
  path: string
  errorCount: number
  fileCount: number
  topTypes: Record<string, number>
}

export interface PartitionedErrors {
  sourceErrors: ActionableError[]
  dependencyModuleErrors: DependencyModuleSummary[]
  totalDependencyErrors: number
}

export interface ErrorAnalysisResult {
  errors: ActionableError[]
  summary: ErrorSummary
  metrics: ErrorMetrics
}

export interface ErrorSummary {
  totalErrors: number
  missingErrors: number
  parseErrors: number
  extraErrors: number
  filesWithErrors: number
}

export interface ErrorMetrics {
  totalFiles: number
  totalErrorNodes: number
  errorsByType: Record<string, number>
  errorsByFile: Record<string, number>
}

export function analyzeErrors(project: Project): ErrorAnalysisResult {
  const errors: ActionableError[] = []
  const errorsByType: Record<string, number> = {}
  const errorsByFile: Record<string, number> = {}
  const filesWithErrors = new Set<string>()

  const totalErrorNodes = collectAllErrors(project, errors, errorsByType, errorsByFile, filesWithErrors)
  const summary = createErrorSummary(errors, filesWithErrors)
  const metrics = createErrorMetrics(project, totalErrorNodes, errorsByType, errorsByFile)

  return { errors, summary, metrics }
}

function collectAllErrors(
  project: Project,
  errors: ActionableError[],
  errorsByType: Record<string, number>,
  errorsByFile: Record<string, number>,
  filesWithErrors: Set<string>,
): number {
  let totalErrorNodes = 0

  analyzeProjectErrors(project, errors, errorsByType, errorsByFile, filesWithErrors)
  totalErrorNodes += countProjectErrorNodes(project)

  if (project.subProjects) {
    for (const subProject of project.subProjects) {
      analyzeProjectErrors(subProject, errors, errorsByType, errorsByFile, filesWithErrors)
      totalErrorNodes += countProjectErrorNodes(subProject)
    }
  }

  return totalErrorNodes
}

function createErrorSummary(errors: ActionableError[], filesWithErrors: Set<string>): ErrorSummary {
  return {
    totalErrors: errors.length,
    missingErrors: errors.filter(e => e.type === ERROR_TYPES.MISSING).length,
    parseErrors: errors.filter(e => e.type === ERROR_TYPES.PARSE_ERROR).length,
    extraErrors: errors.filter(e => e.type === ERROR_TYPES.EXTRA).length,
    filesWithErrors: filesWithErrors.size,
  }
}

function createErrorMetrics(
  project: Project,
  totalErrorNodes: number,
  errorsByType: Record<string, number>,
  errorsByFile: Record<string, number>,
): ErrorMetrics {
  const totalFiles = project.files.size + (project.subProjects?.reduce((acc, sub) => acc + sub.files.size, 0) || 0)

  return {
    totalFiles,
    totalErrorNodes,
    errorsByType,
    errorsByFile,
  }
}

function analyzeProjectErrors(
  project: Project,
  errors: ActionableError[],
  errorsByType: Record<string, number>,
  errorsByFile: Record<string, number>,
  filesWithErrors: Set<string>,
): void {
  for (const [filePath, fileNode] of project.files) {
    if (!fileNode?.rawNode) continue

    const fileErrors = extractActionableErrors(fileNode.rawNode, filePath)
    if (fileErrors.length === 0) continue

    processFileErrors(filePath, fileErrors, errors, errorsByType, errorsByFile, filesWithErrors)
  }
}

function processFileErrors(
  filePath: string,
  fileErrors: ActionableError[],
  errors: ActionableError[],
  errorsByType: Record<string, number>,
  errorsByFile: Record<string, number>,
  filesWithErrors: Set<string>,
): void {
  filesWithErrors.add(filePath)
  errorsByFile[filePath] = fileErrors.length

  for (const error of fileErrors) {
    errors.push(error)
    errorsByType[error.type] = (errorsByType[error.type] || 0) + 1
  }
}

function countProjectErrorNodes(project: Project): number {
  let count = 0
  for (const [, fileNode] of project.files) {
    if (fileNode?.rawNode) {
      count += countErrorNodes(fileNode.rawNode)
    }
  }
  return count
}

export function countErrorNodes(node: any): number {
  let count = 0

  if (node.hasError) {
    count++
  }

  if (node.children) {
    for (const child of node.children) {
      count += countErrorNodes(child)
    }
  }

  return count
}

function extractActionableErrors(node: any, filePath: string): ActionableError[] {
  const errors: ActionableError[] = []
  collectErrorsRecursively(node, filePath, errors)
  return errors
}

function collectErrorsRecursively(node: any, filePath: string, errors: ActionableError[]): void {
  if (isActionableErrorNode(node)) {
    const error = createActionableError(node, filePath)
    errors.push(error)
  }

  for (const child of node.children || []) {
    collectErrorsRecursively(child, filePath, errors)
  }
}

function isCommentNode(node: any): boolean {
  return COMMENT_NODE_TYPES.has(node.type)
}

function isActionableErrorNode(node: any): boolean {
  if (node.isExtra && isCommentNode(node)) return false

  return node.isMissing || node.type === NODE_PATTERNS.ERROR || node.isExtra
}

function truncateText(text: string): string {
  if (!text) return ''
  const singleLine = text.replace(/\n/g, ' ').trim()
  if (singleLine.length <= MAX_ERROR_TEXT_LENGTH) return singleLine
  return singleLine.substring(0, MAX_ERROR_TEXT_LENGTH) + '...'
}

function findEnclosingFunction(node: any): EnclosingContext | undefined {
  let current = node.parent
  while (current) {
    if (isEnclosingNode(current)) {
      const name = current.childForFieldName?.('name')?.text
        || findChildIdentifier(current)
      if (name) {
        return {
          name,
          type: current.type,
          startLine: (current.startPosition?.row ?? 0) + 1,
          endLine: (current.endPosition?.row ?? 0) + 1,
        }
      }
    }
    current = current.parent
  }
  return undefined
}

function isEnclosingNode(node: any): boolean {
  const type = node.type
  return type.includes('function')
    || type.includes('method')
    || type === 'class_declaration'
    || type === 'object_declaration'
    || type === 'class_definition'
    || type === 'class_specifier'
}

function findChildIdentifier(node: any): string | null {
  for (const child of node.children || []) {
    if (child.type === 'identifier' || child.type === 'simple_identifier' || child.type === 'type_identifier') {
      return child.text
    }
  }
  return null
}

function createActionableError(node: any, filePath: string): ActionableError {
  const position = node.startPosition || { row: 0, column: 0 }
  const endPosition = node.endPosition || position

  return {
    type: determineErrorType(node),
    nodeType: node.type,
    file: filePath,
    line: position.row + 1,
    column: position.column + 1,
    endLine: endPosition.row + 1,
    endColumn: endPosition.column + 1,
    text: truncateText(node.text || ''),
    context: getActionableContext(node),
    suggestion: generateSuggestion(node),
    parentContext: node.parent?.type,
    enclosingFunction: findEnclosingFunction(node),
  }
}

function determineErrorType(node: any): 'missing' | 'parse_error' | 'extra' {
  if (node.isMissing) return ERROR_TYPES.MISSING
  if (node.isExtra) return ERROR_TYPES.EXTRA
  return ERROR_TYPES.PARSE_ERROR
}

function getActionableContext(node: any): string {
  if (!node.parent) return 'Unknown context'

  if (node.isMissing) {
    return getMissingNodeContext(node)
  }

  return getGeneralNodeContext(node.parent)
}

function getMissingNodeContext(node: any): string {
  const parentType = node.parent.type

  if (parentType.includes(NODE_PATTERNS.STATEMENT_BLOCK)) {
    return `Missing closing brace for ${getBlockContext(node.parent)}`
  }

  if (parentType.includes(NODE_PATTERNS.FUNCTION)) {
    return 'Missing syntax in function declaration'
  }

  if (parentType.includes(NODE_PATTERNS.IF_STATEMENT)) {
    return 'Missing syntax in if statement'
  }

  if (parentType.includes(NODE_PATTERNS.INTERFACE)) {
    return 'Missing closing brace for interface'
  }

  if (parentType.includes(NODE_PATTERNS.FORMAL_PARAMETERS)) {
    return 'Missing closing parenthesis in function parameters'
  }

  return getGeneralNodeContext(node.parent)
}

function getGeneralNodeContext(parentNode: any): string {
  const parentText = (parentNode.text || '').slice(0, 50).replace(/\n/g, ' ')
  return `In ${parentNode.type}: "${parentText}..."`
}

function getBlockContext(blockNode: any): string {
  let current = blockNode.parent

  while (current) {
    const contextType = identifyContextType(current)
    if (contextType) return contextType
    current = current.parent
  }

  return 'code block'
}

function identifyContextType(node: any): string | null {
  const type = node.type

  if (type.includes(NODE_PATTERNS.FUNCTION)) {
    const name = getFunctionName(node)
    return name ? `function ${name}` : 'anonymous function'
  }

  if (type.includes(NODE_PATTERNS.IF_STATEMENT)) return 'if statement'
  if (type.includes(NODE_PATTERNS.FOR_STATEMENT)) return 'for loop'
  if (type.includes(NODE_PATTERNS.WHILE_STATEMENT)) return 'while loop'
  if (type.includes(NODE_PATTERNS.CLASS)) return 'class declaration'
  if (type.includes(NODE_PATTERNS.INTERFACE)) return 'interface declaration'

  return null
}

function getFunctionName(funcNode: any): string | null {
  const nameChild = funcNode.childForFieldName?.('name')
  return nameChild ? nameChild.text : null
}

function generateSuggestion(node: any): string {
  if (node.isMissing) {
    return generateMissingSuggestion(node.type)
  }

  if (node.type === NODE_PATTERNS.ERROR) {
    return generateErrorSuggestion(node.text || '')
  }

  if (node.isExtra) {
    return 'Remove unexpected syntax or fix surrounding code'
  }

  return 'Review syntax'
}

function generateMissingSuggestion(nodeType: string): string {
  switch (nodeType) {
    case CLOSING_SYMBOLS.BRACE:
      return `Add closing brace "${CLOSING_SYMBOLS.BRACE}"`
    case CLOSING_SYMBOLS.PAREN:
      return `Add closing parenthesis "${CLOSING_SYMBOLS.PAREN}"`
    case CLOSING_SYMBOLS.BRACKET:
      return `Add closing bracket "${CLOSING_SYMBOLS.BRACKET}"`
    case CLOSING_SYMBOLS.SEMICOLON:
      return `Add semicolon "${CLOSING_SYMBOLS.SEMICOLON}"`
    case CLOSING_SYMBOLS.QUOTE:
    case CLOSING_SYMBOLS.SINGLE_QUOTE:
      return 'Close the string literal'
    default:
      return `Add missing ${nodeType}`
  }
}

function generateErrorSuggestion(text: string): string {
  const trimmedText = text.trim()

  if (trimmedText.includes(NODE_PATTERNS.FUNCTION) && !trimmedText.includes(CLOSING_SYMBOLS.PAREN)) {
    return 'Complete function declaration with proper parentheses'
  }

  if (trimmedText.includes(CLOSING_SYMBOLS.QUOTE) && !trimmedText.endsWith(CLOSING_SYMBOLS.QUOTE)) {
    return 'Close the string literal'
  }

  if (trimmedText.includes(NODE_PATTERNS.INTERFACE) || trimmedText.includes(NODE_PATTERNS.CLASS)) {
    return 'Complete the declaration with proper braces'
  }

  return 'Fix syntax error'
}

export function partitionErrors(
  errors: ActionableError[],
  dependencyDirs: string[],
): PartitionedErrors {
  if (dependencyDirs.length === 0) {
    return { sourceErrors: errors, dependencyModuleErrors: [], totalDependencyErrors: 0 }
  }

  const sourceErrors: ActionableError[] = []
  const depErrorsByDir = new Map<string, ActionableError[]>()

  for (const error of errors) {
    const depDir = findMatchingDependencyDir(error.file, dependencyDirs)
    if (depDir) {
      const list = depErrorsByDir.get(depDir) ?? []
      list.push(error)
      depErrorsByDir.set(depDir, list)
    }
    else {
      sourceErrors.push(error)
    }
  }

  let totalDependencyErrors = 0
  const dependencyModuleErrors: DependencyModuleSummary[] = []

  for (const [dir, depErrors] of depErrorsByDir) {
    totalDependencyErrors += depErrors.length
    dependencyModuleErrors.push(createModuleSummary(dir, depErrors))
  }

  dependencyModuleErrors.sort((a, b) => b.errorCount - a.errorCount)

  return { sourceErrors, dependencyModuleErrors, totalDependencyErrors }
}

function findMatchingDependencyDir(filePath: string, dependencyDirs: string[]): string | undefined {
  return dependencyDirs.find(dir => filePath.startsWith(dir + '/') || filePath.startsWith(dir + '\\'))
}

function createModuleSummary(dirPath: string, errors: ActionableError[]): DependencyModuleSummary {
  const filesWithErrors = new Set(errors.map(e => e.file))
  const topTypes: Record<string, number> = {}

  for (const error of errors) {
    topTypes[error.type] = (topTypes[error.type] ?? 0) + 1
  }

  return {
    module: dirPath.split('/').pop() ?? dirPath,
    path: dirPath,
    errorCount: errors.length,
    fileCount: filesWithErrors.size,
    topTypes,
  }
}
