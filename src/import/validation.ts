/**
 * Path validation utilities for import resolution
 */

import { resolve, normalize } from 'path'

export function isValidPath(path: string): boolean {
  try {
    return path.length > 0 && !path.includes('\0') && !path.includes('..')
  }
  catch {
    return false
  }
}

export function isExternalModule(importPath: string): boolean {
  return !importPath.startsWith('./')
    && !importPath.startsWith('../')
    && !importPath.startsWith('/')
    && !importPath.startsWith('@/')
    && !importPath.startsWith('~/')
}

export function normalizePath(path: string): string {
  try {
    return normalize(path).replace(/\\/g, '/')
  }
  catch {
    return path
  }
}

export function validateImportPath(importPath: string, currentFile: string): {
  isValid: boolean
  reason?: string
} {
  if (!importPath) {
    return { isValid: false, reason: 'Empty import path' }
  }

  if (importPath.includes('\0')) {
    return { isValid: false, reason: 'Contains null character' }
  }

  if (importPath.length > 260) {
    return { isValid: false, reason: 'Path too long' }
  }

  // Check for circular imports (basic check)
  if (importPath === currentFile) {
    return { isValid: false, reason: 'Circular import detected' }
  }

  return { isValid: true }
}

export function resolveAndValidate(importPath: string, basePath: string): string | null {
  try {
    if (!isValidPath(importPath)) return null

    const resolved = resolve(basePath, importPath)
    const normalized = normalizePath(resolved)

    // Security check - ensure resolved path is within project bounds
    if (!normalized.startsWith(normalizePath(basePath))) {
      return null
    }

    return normalized
  }
  catch {
    return null
  }
}

export function getImportType(importPath: string): 'relative' | 'absolute' | 'alias' | 'external' {
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return 'relative'
  }

  if (importPath.startsWith('/')) {
    return 'absolute'
  }

  if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
    return 'alias'
  }

  return 'external'
}