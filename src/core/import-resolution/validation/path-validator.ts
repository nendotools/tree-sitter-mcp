/**
 * Path validation utilities for import resolution
 */

import type { TreeNode } from '../../../types/index.js'
import type { PathValidationResult } from '../types.js'

export class PathValidator {
  private fileMap: Map<string, TreeNode>

  constructor(availableFiles: TreeNode[]) {
    this.fileMap = new Map(availableFiles.map(file => [file.path, file]))
  }

  /**
   * Validates if a file path exists in the project
   */
  validatePath(path: string): PathValidationResult {
    if (!path || typeof path !== 'string') {
      return {
        isValid: false,
        error: 'Invalid path: path must be a non-empty string',
      }
    }

    const normalizedPath = this.normalizePath(path)

    if (this.fileMap.has(normalizedPath)) {
      return {
        isValid: true,
        normalizedPath,
      }
    }

    // Try with common extensions
    const pathWithExtensions = this.tryCommonExtensions(normalizedPath)
    if (pathWithExtensions) {
      return {
        isValid: true,
        normalizedPath: pathWithExtensions,
      }
    }

    return {
      isValid: false,
      normalizedPath,
      error: `File not found: ${normalizedPath}`,
    }
  }

  /**
   * Checks if a file exists with any of the common extensions (matches original behavior)
   */
  private tryCommonExtensions(basePath: string): string | null {
    // Try exact match first
    if (this.fileMap.has(basePath)) {
      return basePath
    }

    // Common extensions in priority order (most specific first) - matches original
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.mjs', '.cjs', '.json']

    // 1. Try adding extensions to the base path
    for (const ext of extensions) {
      const candidate = basePath + ext
      if (this.fileMap.has(candidate)) {
        return candidate
      }
    }

    // 2. If base path ends with .js, try .ts equivalent (TypeScript convention)
    if (basePath.endsWith('.js')) {
      const baseWithoutExt = basePath.slice(0, -3)
      const tsCandidate = baseWithoutExt + '.ts'
      if (this.fileMap.has(tsCandidate)) {
        return tsCandidate
      }
      const tsxCandidate = baseWithoutExt + '.tsx'
      if (this.fileMap.has(tsxCandidate)) {
        return tsxCandidate
      }
    }

    // 3. If base path ends with any extension, try without it
    const lastDot = basePath.lastIndexOf('.')
    if (lastDot > basePath.lastIndexOf('/')) { // Make sure it's a file extension, not a directory with dots
      const baseWithoutExt = basePath.substring(0, lastDot)

      // Try the extensionless version as a directory with index files
      for (const ext of extensions) {
        const indexCandidate = baseWithoutExt + '/index' + ext
        if (this.fileMap.has(indexCandidate)) {
          return indexCandidate
        }
      }

      // Try other extensions on the base name
      for (const ext of extensions) {
        const candidate = baseWithoutExt + ext
        if (this.fileMap.has(candidate)) {
          return candidate
        }
      }
    }

    // 4. Try index files in the directory (if basePath could be a directory)
    for (const ext of extensions) {
      const indexCandidate = basePath + '/index' + ext
      if (this.fileMap.has(indexCandidate)) {
        return indexCandidate
      }
    }

    return null
  }

  /**
   * Normalizes a file path for consistent comparison
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\\/g, '/') // Convert backslashes to forward slashes
      .replace(/\/+/g, '/') // Remove duplicate slashes
      .replace(/\/$/, '') // Remove trailing slash
  }

  /**
   * Gets all files that match a pattern
   */
  findFilesByPattern(pattern: string): TreeNode[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return Array.from(this.fileMap.values()).filter(file =>
      regex.test(file.path),
    )
  }

  /**
   * Checks if a directory exists (has files in it)
   */
  directoryExists(dirPath: string): boolean {
    const normalizedDir = this.normalizePath(dirPath)
    return Array.from(this.fileMap.keys()).some(filePath =>
      filePath.startsWith(normalizedDir + '/'),
    )
  }
}