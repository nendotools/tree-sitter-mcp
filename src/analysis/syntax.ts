/**
 * Syntax error analysis using tree-sitter error nodes
 */

import type { Project } from '../types/core.js'
import type { Finding, SyntaxMetrics } from '../types/analysis.js'
import { countErrorNodes } from './errors.js'

export interface SyntaxError {
  file: string
  line: number
  column: number
  endLine: number
  endColumn: number
  message: string
  errorType: string
  context: string
}

/**
 * Analyzes syntax errors using tree-sitter error nodes
 */
export function analyzeSyntaxErrors(project: Project): {
  findings: Finding[]
  metrics: SyntaxMetrics
} {
  const findings: Finding[] = []
  const errorsByType: Record<string, number> = {}
  const filesWithErrors = new Set<string>()
  let totalSyntaxErrors = 0
  let totalErrorNodes = 0

  // Analyze main project files
  totalErrorNodes += analyzeProjectFiles(project, findings, errorsByType, filesWithErrors)

  // Analyze sub-projects if this is a monorepo
  if (project.subProjects) {
    for (const subProject of project.subProjects) {
      totalErrorNodes += analyzeProjectFiles(subProject, findings, errorsByType, filesWithErrors)
    }
  }

  totalSyntaxErrors = findings.length

  const metrics: SyntaxMetrics = {
    totalFiles: project.files.size + (project.subProjects?.reduce((acc, sub) => acc + sub.files.size, 0) || 0),
    filesWithErrors: filesWithErrors.size,
    totalSyntaxErrors,
    totalErrorNodes,
    errorsByType,
  }

  return { findings, metrics }
}

function analyzeProjectFiles(
  project: Project,
  findings: Finding[],
  errorsByType: Record<string, number>,
  filesWithErrors: Set<string>,
): number {
  let totalErrorNodes = 0

  for (const [filePath, fileNode] of project.files) {
    if (fileNode?.skipped) {
      filesWithErrors.add(filePath)
      errorsByType['file_too_large'] = (errorsByType['file_too_large'] || 0) + 1

      findings.push({
        type: 'syntax',
        category: 'Parse Skipped',
        severity: 'critical',
        location: filePath,
        description: fileNode.skipReason || 'File skipped during parsing',
        metrics: {
          errorType: 'file_too_large',
          skipped: true,
        },
      })
      continue
    }

    // Use the raw tree-sitter node if available
    if (fileNode?.rawNode) {
      // Count nodes with hasError for simple metrics
      const errorNodeCount = countErrorNodes(fileNode.rawNode)
      totalErrorNodes += errorNodeCount

      // Only create findings if there are actual actionable errors
      const syntaxErrors = findSyntaxErrorsInNode(fileNode.rawNode, filePath)

      if (syntaxErrors.length > 0) {
        filesWithErrors.add(filePath)

        for (const error of syntaxErrors) {
          // Count error types
          errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1

          // Create finding
          findings.push({
            type: 'syntax',
            category: 'Syntax Error',
            severity: 'critical', // Syntax errors are always critical
            location: `${error.file}:${error.line}:${error.column}`,
            description: error.message,
            metrics: {
              errorType: error.errorType,
              startLine: error.line,
              endLine: error.endLine,
              startColumn: error.column,
              endColumn: error.endColumn,
              errorNodeCount, // Include count of nodes with hasError
            },
          })
        }
      }
    }
  }

  return totalErrorNodes
}

/**
 * Recursively finds syntax errors (error nodes) in a tree-sitter node
 */
function findSyntaxErrorsInNode(node: any, filePath: string): SyntaxError[] {
  const errors: SyntaxError[] = []

  // Check if this node is specifically an ERROR node
  if (node.type === 'ERROR') {
    const startPos = node.startPosition || { row: 0, column: 0 }
    const endPos = node.endPosition || startPos

    // Get context around the error
    const context = getErrorContext(node, filePath)

    // Determine error type based on context and node properties
    const errorType = determineErrorType(node, context)

    errors.push({
      file: filePath,
      line: startPos.row + 1, // Convert to 1-based line numbers
      column: startPos.column + 1,
      endLine: endPos.row + 1,
      endColumn: endPos.column + 1,
      message: generateErrorMessage(node, errorType),
      errorType,
      context,
    })
  }

  // Recursively check children for error nodes
  if (node.children) {
    for (const child of node.children) {
      errors.push(...findSyntaxErrorsInNode(child, filePath))
    }
  }

  return errors
}

/**
 * Gets contextual text around an error for better understanding
 */
function getErrorContext(node: any, _filePath: string): string {
  try {
    // Try to get the text content of the error node and surrounding context
    const nodeText = node.text || 'Unknown error'

    // If we have access to the source text, get surrounding lines
    if (node.startPosition && node.endPosition) {
      // Could extract surrounding lines from source file
      // const startLine = Math.max(0, node.startPosition.row - 1)
      // const endLine = node.endPosition.row + 1

      // For now, just return the node text
      // In a full implementation, you'd read the source file and extract lines
      return `Error at line ${node.startPosition.row + 1}: ${nodeText}`
    }

    return nodeText
  }
  catch {
    return 'Unable to extract error context'
  }
}

/**
 * Determines the type of syntax error based on node and context
 */
function determineErrorType(_node: any, context: string): string {
  // Basic error type classification
  if (context.includes('(') || context.includes(')')) {
    return 'parentheses_mismatch'
  }

  if (context.includes('{') || context.includes('}')) {
    return 'brace_mismatch'
  }

  if (context.includes('[') || context.includes(']')) {
    return 'bracket_mismatch'
  }

  if (context.includes('"') || context.includes('\'')) {
    return 'quote_mismatch'
  }

  if (context.includes(';')) {
    return 'semicolon_error'
  }

  if (context.includes('function') || context.includes('class') || context.includes('interface')) {
    return 'declaration_error'
  }

  if (context.includes('import') || context.includes('export')) {
    return 'import_export_error'
  }

  // Default error type
  return 'unknown_syntax_error'
}

/**
 * Generates a human-readable error message
 */
function generateErrorMessage(node: any, errorType: string): string {
  const typeMessages: Record<string, string> = {
    parentheses_mismatch: 'Mismatched or missing parentheses',
    brace_mismatch: 'Mismatched or missing braces',
    bracket_mismatch: 'Mismatched or missing brackets',
    quote_mismatch: 'Mismatched or missing quotes',
    semicolon_error: 'Missing or misplaced semicolon',
    declaration_error: 'Invalid function, class, or interface declaration',
    import_export_error: 'Invalid import or export statement',
    unknown_syntax_error: 'Syntax error detected',
  }

  const baseMessage = typeMessages[errorType] || 'Syntax error detected'

  // Add additional context if available
  try {
    if (node?.text && typeof node.text === 'string' && node.text.length < 50) {
      return `${baseMessage}: "${node.text}"`
    }
  }
  catch {
    // Ignore errors accessing node.text
  }

  return baseMessage
}