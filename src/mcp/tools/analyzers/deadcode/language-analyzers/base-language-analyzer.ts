/**
 * Base class for language-specific dead code analysis
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { LanguageEntryPoints, UsageAnalysisResult } from '../types.js'

export abstract class BaseLanguageAnalyzer {
  protected readonly language: string
  protected readonly entryPoints: LanguageEntryPoints

  constructor(language: string, entryPoints: LanguageEntryPoints) {
    this.language = language
    this.entryPoints = entryPoints
  }

  /**
   * Detects entry point files for this language
   */
  detectEntryPoints(fileNodes: TreeNode[]): Set<string> {
    const entryPoints = new Set<string>()

    for (const fileNode of fileNodes) {
      if (this.isLanguageFile(fileNode.path)) {
        if (this.isEntryPointByPattern(fileNode.path)
          || this.isEntryPointByContent(fileNode.content)) {
          entryPoints.add(fileNode.path)
        }
      }
    }

    return entryPoints
  }

  /**
   * Analyzes import/export usage for this language
   */
  abstract analyzeUsage(fileNodes: TreeNode[]): UsageAnalysisResult

  /**
   * Checks if a file belongs to this language
   */
  protected abstract isLanguageFile(filePath: string): boolean

  /**
   * Checks if a file is an entry point based on filename patterns
   */
  protected isEntryPointByPattern(filePath: string): boolean {
    const fileName = this.getFileNameWithoutExtension(filePath)
    return this.entryPoints.patterns.some(pattern =>
      fileName.toLowerCase().includes(pattern.toLowerCase()),
    )
  }

  /**
   * Checks if a file is an entry point based on content
   */
  protected isEntryPointByContent(content: string | undefined): boolean {
    if (!content) return false

    return this.entryPoints.contentChecks.some(check =>
      content.includes(check),
    )
  }

  /**
   * Resolves relative import paths to absolute paths
   */
  protected resolveImportPath(
    importPath: string,
    currentFile: string,
    fileNodes: TreeNode[],
  ): string | null {
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null
    }

    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'))
    let resolved: string

    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const parts = currentDir.split('/')
      const importParts = importPath.split('/')

      for (const part of importParts) {
        if (part === '..') {
          parts.pop()
        }
        else if (part !== '.') {
          parts.push(part)
        }
      }

      resolved = parts.join('/')
    }
    else {
      resolved = importPath
    }

    // First, try to find exact match (for cases where extension is already included)
    if (fileNodes.some(node => node.path === resolved)) {
      return resolved
    }

    // Handle TypeScript's .js import convention (.js imports should resolve to .ts/.tsx files)
    if (resolved.endsWith('.js')) {
      const basePath = resolved.slice(0, -3) // Remove .js extension
      const tsExtensions = ['.ts', '.tsx']
      for (const ext of tsExtensions) {
        const candidate = basePath + ext
        if (fileNodes.some(node => node.path === candidate)) {
          return candidate
        }
      }
    }
    
    if (resolved.endsWith('.mjs')) {
      const basePath = resolved.slice(0, -4) // Remove .mjs extension
      const tsExtensions = ['.ts', '.tsx']
      for (const ext of tsExtensions) {
        const candidate = basePath + ext
        if (fileNodes.some(node => node.path === candidate)) {
          return candidate
        }
      }
    }

    // Try adding file extensions if no extension present
    const extensions = this.getFileExtensions()
    for (const ext of extensions) {
      const candidate = resolved + ext
      if (fileNodes.some(node => node.path === candidate)) {
        return candidate
      }
    }

    return null
  }

  /**
   * Gets file extensions for this language
   */
  protected abstract getFileExtensions(): string[]

  /**
   * Gets the file name without extension from a file path
   */
  protected getFileNameWithoutExtension(filePath: string): string {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
    const dotIndex = fileName.lastIndexOf('.')
    return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName
  }

  /**
   * Escapes special regex characters in a string
   */
  protected escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}