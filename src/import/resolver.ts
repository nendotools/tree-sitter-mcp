/**
 * Unified import resolution - preserves sophisticated logic but eliminates class overhead
 */

import { resolve, dirname, join } from 'path'
import { isFile } from '../utils/helpers.js'
import type { ImportContext, ResolutionResult } from '../types/core.js'

/**
 * Resolves an import path using multiple resolution strategies
 */
export function resolveImport(
  importPath: string,
  currentFile: string,
  context: ImportContext,
): ResolutionResult {
  return (
    tryRelativeResolution(importPath, currentFile)
    || tryAliasResolution(importPath, context.aliases)
    || tryFrameworkResolution(importPath, context.framework)
    || tryAbsoluteResolution(importPath, context.basePath)
    || { resolved: null, isExternal: true }
  )
}

/**
 * Attempts to resolve relative imports (./ and ../)
 */
export function tryRelativeResolution(importPath: string, currentFile: string): ResolutionResult | null {
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return null
  }

  const currentDir = dirname(currentFile)
  const resolvedPath = resolve(currentDir, importPath)
  const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '/index.js', '/index.ts']

  for (const ext of extensions) {
    const candidate = resolvedPath + ext
    if (isFile(candidate)) {
      return { resolved: candidate, isExternal: false }
    }
  }

  return null
}

/**
 * Attempts to resolve alias-based imports using provided aliases
 */
export function tryAliasResolution(importPath: string, aliases?: Record<string, string>): ResolutionResult | null {
  if (!aliases) return null

  for (const [alias, target] of Object.entries(aliases)) {
    if (importPath.startsWith(alias)) {
      const resolvedPath = importPath.replace(alias, target)
      const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts']

      for (const ext of extensions) {
        const candidate = resolvedPath + ext
        if (isFile(candidate)) {
          return { resolved: candidate, isExternal: false }
        }
      }
    }
  }

  return null
}

/**
 * Attempts to resolve imports using framework-specific resolution rules
 */
export function tryFrameworkResolution(importPath: string, framework?: string): ResolutionResult | null {
  if (!framework) return null

  switch (framework) {
    case 'next':
      return resolveNextJsImport(importPath)
    case 'nuxt':
      return resolveNuxtImport(importPath)
    case 'vue':
      return resolveVueImport(importPath)
    default:
      return null
  }
}

/**
 * Attempts to resolve absolute imports from a base path
 */
export function tryAbsoluteResolution(importPath: string, basePath?: string): ResolutionResult | null {
  if (!basePath || importPath.startsWith('.')) return null

  const resolvedPath = resolve(basePath, importPath)
  const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts']

  for (const ext of extensions) {
    const candidate = resolvedPath + ext
    if (isFile(candidate)) {
      return { resolved: candidate, isExternal: false }
    }
  }

  return null
}

/**
 * Resolves Next.js specific import paths
 */
function resolveNextJsImport(importPath: string): ResolutionResult | null {
  if (importPath.startsWith('@/')) {
    const withoutAlias = importPath.substring(2)
    return tryAbsoluteResolution(withoutAlias, process.cwd())
  }

  if (importPath.startsWith('~/')) {
    const withoutAlias = importPath.substring(2)
    return tryAbsoluteResolution(withoutAlias, process.cwd())
  }

  return null
}

/**
 * Resolves Nuxt.js specific import paths
 */
function resolveNuxtImport(importPath: string): ResolutionResult | null {
  if (importPath.startsWith('~') || importPath.startsWith('@')) {
    const cleaned = importPath.startsWith('~/') ? importPath.substring(2) : importPath.substring(1)
    return tryAbsoluteResolution(cleaned, process.cwd())
  }

  return null
}

/**
 * Resolves Vue.js specific import paths
 */
function resolveVueImport(importPath: string): ResolutionResult | null {
  if (importPath.startsWith('@/')) {
    const withoutAlias = importPath.substring(2)
    return tryAbsoluteResolution(withoutAlias, join(process.cwd(), 'src'))
  }

  return null
}

/**
 * Extracts all import paths from file content
 */
export function extractImports(content: string): string[] {
  const imports: string[] = []

  const importMatches = content.match(/import\s+.*?\s+from\s+['"']([^'"']+)['"']/g)
  if (importMatches) {
    importMatches.forEach((match) => {
      const pathMatch = match.match(/from\s+['"']([^'"']+)['"']/)
      if (pathMatch?.[1]) {
        imports.push(pathMatch[1])
      }
    })
  }

  const requireMatches = content.match(/require\(['"']([^'"']+)['"']\)/g)
  if (requireMatches) {
    requireMatches.forEach((match) => {
      const pathMatch = match.match(/require\(['"']([^'"']+)['"']\)/)
      if (pathMatch?.[1]) {
        imports.push(pathMatch[1])
      }
    })
  }

  const dynamicMatches = content.match(/import\(['"']([^'"']+)['"']\)/g)
  if (dynamicMatches) {
    dynamicMatches.forEach((match) => {
      const pathMatch = match.match(/import\(['"']([^'"']+)['"']\)/)
      if (pathMatch?.[1]) {
        imports.push(pathMatch[1])
      }
    })
  }

  return imports
}