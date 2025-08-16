/**
 * Context extraction functions for search results
 */

import { readFileSync } from 'fs'

/**
 * Extracts a context snippet showing the containing method/function or surrounding code
 *
 * @param filePath - Path to the file containing the declaration
 * @param startLine - Starting line of the declaration (1-based)
 * @param endLine - Ending line of the declaration (1-based)
 * @returns Formatted context snippet or null if file cannot be read
 */
export function getContextSnippet(filePath: string, startLine: number, endLine: number): string | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    // First, try to find the containing method/function
    const containingMethod = findContainingMethod(lines, startLine - 1) // Convert to 0-based
    if (containingMethod) {
      return formatMethodContext(lines, containingMethod, startLine, endLine)
    }

    // Fallback to showing lines around the declaration
    return formatSurroundingContext(lines, startLine, endLine)
  }
  catch {
    return null
  }
}

/**
 * Finds the containing method/function for a given line
 */
export function findContainingMethod(lines: string[], targetLineIndex: number): { name: string, startLine: number, endLine: number } | null {
  // Common patterns for method/function declarations
  const functionPatterns = [
    // TypeScript/JavaScript functions and methods
    /^\s*(?:export\s+)?(?:async\s+)?(?:static\s+)?(?:public|private|protected\s+)?(?:async\s+)?(function\s+(\w+)|(\w+)\s*\(|(\w+)\s*:\s*\([^)]*\)\s*=>|(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/,
    // Class methods
    /^\s*(?:public|private|protected\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\(/,
    // Arrow functions assigned to variables
    /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
    // Vue Component definitions
    /^\s*(?:export\s+)?(?:default\s+)?defineComponent\s*\(\s*\{/,
    /^\s*(?:const|let|var)\s+(\w+)\s*=\s*defineComponent\s*\(/,
    /^\s*(?:export\s+)?(?:default\s+)?\{\s*(?:name\s*:\s*['"`](\w+)['"`])?/,
    // Vue Composition API setup function
    /^\s*setup\s*\(/,
    // Vue Options API methods
    /^\s*(?:async\s+)?(\w+)\s*\(\s*[^)]*\s*\)\s*\{/,
    // Vue computed and watch functions
    /^\s*(?:computed|watch|methods)\s*:\s*\{/,
  ]

  // Search backwards from the target line to find the containing method
  for (let i = targetLineIndex; i >= 0; i--) {
    const line = lines[i]?.trim()
    if (!line) continue

    for (const pattern of functionPatterns) {
      const match = line.match(pattern)
      if (match) {
        // Extract function/method name from the match groups
        let name = match[2] || match[3] || match[4] || match[5] || match[1]

        // Handle special cases for Vue components
        if (!name) {
          if (line.includes('defineComponent')) {
            name = 'VueComponent'
          }
          else if (line.includes('setup(')) {
            name = 'setup'
          }
          else if (line.includes('computed:') || line.includes('watch:') || line.includes('methods:')) {
            name = 'VueOptions'
          }
        }

        if (name) {
          const endLine = findMethodEndLine(lines, i)
          return {
            name,
            startLine: i + 1, // Convert back to 1-based
            endLine: endLine + 1, // Convert back to 1-based
          }
        }
      }
    }
  }

  return null
}

/**
 * Finds the end line of a method by tracking brace balance
 */
export function findMethodEndLine(lines: string[], startLineIndex: number): number {
  let braceCount = 0
  let foundOpeningBrace = false

  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i] || ''

    for (const char of line) {
      if (char === '{') {
        braceCount++
        foundOpeningBrace = true
      }
      else if (char === '}') {
        braceCount--
        if (foundOpeningBrace && braceCount === 0) {
          return i
        }
      }
    }
  }

  // If we can't find the end, just show a few lines
  return Math.min(startLineIndex + 10, lines.length - 1)
}

/**
 * Formats the context showing the containing method
 */
export function formatMethodContext(
  lines: string[],
  method: { name: string, startLine: number, endLine: number },
  declarationStartLine: number,
  declarationEndLine: number,
): string {
  const contextLines: string[] = []

  // Show the method signature
  const methodLine = lines[method.startLine - 1] || ''
  const displayMethodLine = methodLine.length > 100 ? `${methodLine.slice(0, 97)}...` : methodLine
  contextLines.push(`     ${method.startLine.toString().padStart(3)}: → ${displayMethodLine.trim()}`)

  // Add a separator to show we're inside the method
  contextLines.push('         ...')

  // Show the declaration lines within the method
  for (let lineNum = declarationStartLine; lineNum <= declarationEndLine; lineNum++) {
    const line = lines[lineNum - 1] || ''
    const displayLine = line.length > 100 ? `${line.slice(0, 97)}...` : line
    contextLines.push(`     ${lineNum.toString().padStart(3)}: → ${displayLine}`)
  }

  contextLines.push(`         (in method: ${method.name})`)

  return contextLines.join('\n')
}

/**
 * Fallback to show surrounding context when no containing method is found
 */
export function formatSurroundingContext(lines: string[], startLine: number, endLine: number): string {
  const contextBefore = 2
  const contextAfter = 2
  const snippetStart = Math.max(0, startLine - 1 - contextBefore)
  const snippetEnd = Math.min(lines.length, endLine + contextAfter)

  const contextLines: string[] = []

  for (let i = snippetStart; i < snippetEnd; i++) {
    const lineNum = i + 1
    const isDeclarationLine = lineNum >= startLine && lineNum <= endLine
    const marker = isDeclarationLine ? '→ ' : '  '
    const line = lines[i] || ''

    // Limit line length to prevent overly long output
    const displayLine = line.length > 100 ? `${line.slice(0, 97)}...` : line
    contextLines.push(`     ${lineNum.toString().padStart(3)}: ${marker}${displayLine}`)
  }

  return contextLines.join('\n')
}