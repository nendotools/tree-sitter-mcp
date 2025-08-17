/**
 * All import resolution strategies in one file - eliminates separate strategy classes
 */

import { resolve, dirname, basename } from 'path'
import { isFile, isDirectory } from '../utils/helpers.js'
import type { ImportContext } from '../types/core.js'

export interface ExtendedImportContext extends ImportContext {
  currentFile?: string
  projectRoot?: string
  availableFiles?: string[]
}

export interface ImportStrategy {
  canResolve: (path: string, context?: ExtendedImportContext) => boolean
  resolve: (path: string, context: ExtendedImportContext) => string | null
}

/**
 * Resolves relative imports starting with ./ or ../
 */
export const RelativeResolver: ImportStrategy = {
  canResolve: (path: string) => path.startsWith('./') || path.startsWith('../'),

  resolve: (path: string, context: ExtendedImportContext) => {
    if (!context.currentFile) return null
    const currentDir = dirname(context.currentFile)
    const resolvedPath = resolve(currentDir, path)

    return findFileWithExtensions(resolvedPath)
  },
}

/**
 * Resolves alias-based imports like @/ and ~/
 */
export const AliasResolver: ImportStrategy = {
  canResolve: (path: string, context?: ExtendedImportContext) => {
    if (!context?.aliases) return false
    return Object.keys(context.aliases).some(alias => path.startsWith(alias))
  },

  resolve: (path: string, context: ExtendedImportContext) => {
    if (!context.aliases) return null
    for (const [alias, target] of Object.entries(context.aliases)) {
      if (path.startsWith(alias)) {
        const resolvedPath = path.replace(alias, target)
        return findFileWithExtensions(resolvedPath)
      }
    }
    return null
  },
}

/**
 * Resolves framework-specific imports for Next.js, Nuxt, and Vue
 */
export const FrameworkResolver: ImportStrategy = {
  canResolve: (path: string, context?: ExtendedImportContext) => {
    if (!context?.framework) return false

    const framework = context.framework.toLowerCase()

    switch (framework) {
      case 'next':
        return path.startsWith('@/') || path.startsWith('~/')
          || path.startsWith('components/') || path.startsWith('pages/')
      case 'nuxt':
        return path.startsWith('~') || path.startsWith('@')
          || path.startsWith('components/') || path.startsWith('composables/')
      case 'vue':
        return path.startsWith('@/') || path.startsWith('src/')
      default:
        return false
    }
  },

  resolve: (path: string, context: ExtendedImportContext) => {
    if (!context.framework || !context.projectRoot) return null
    const framework = context.framework.toLowerCase()

    switch (framework) {
      case 'next':
        return resolveNextJs(path, context.projectRoot)
      case 'nuxt':
        return resolveNuxt(path, context.projectRoot)
      case 'vue':
        return resolveVue(path, context.projectRoot)
      default:
        return null
    }
  },
}

/**
 * Resolves absolute imports from project root or node_modules
 */
export const AbsoluteResolver: ImportStrategy = {
  canResolve: (path: string) => {
    return !path.startsWith('.') && !path.startsWith('/')
      && !path.includes('@/') && !path.includes('~/')
  },

  resolve: (path: string, context: ExtendedImportContext) => {
    if (!context.projectRoot) return null

    const projectPath = resolve(context.projectRoot, path)
    const found = findFileWithExtensions(projectPath)
    if (found) return found

    const srcDirs = ['src', 'lib', 'app', 'pages', 'components']
    for (const srcDir of srcDirs) {
      const srcPath = resolve(context.projectRoot, srcDir, path)
      const foundInSrc = findFileWithExtensions(srcPath)
      if (foundInSrc) return foundInSrc
    }

    if (context.availableFiles) {
      return findInAvailableFiles(path, context.availableFiles)
    }

    return null
  },
}

/**
 * Resolves Next.js specific import paths
 */
function resolveNextJs(path: string, projectRoot: string): string | null {
  if (path.startsWith('@/')) {
    const withoutAlias = path.substring(2)
    return findFileWithExtensions(resolve(projectRoot, withoutAlias))
  }

  if (path.startsWith('~/')) {
    const withoutAlias = path.substring(2)
    return findFileWithExtensions(resolve(projectRoot, withoutAlias))
  }

  if (path.startsWith('components/')) {
    return findFileWithExtensions(resolve(projectRoot, path))
      || findFileWithExtensions(resolve(projectRoot, 'src', path))
  }

  if (path.startsWith('pages/')) {
    return findFileWithExtensions(resolve(projectRoot, path))
  }

  return null
}

/**
 * Resolves Nuxt.js specific import paths
 */
function resolveNuxt(path: string, projectRoot: string): string | null {
  if (path.startsWith('~/') || path.startsWith('@/')) {
    const withoutAlias = path.substring(2)
    return findFileWithExtensions(resolve(projectRoot, withoutAlias))
  }

  if (path.startsWith('~') || path.startsWith('@')) {
    const withoutAlias = path.substring(1)
    return findFileWithExtensions(resolve(projectRoot, withoutAlias))
  }

  const nuxtDirs = ['components', 'composables', 'utils', 'plugins', 'middleware']
  for (const dir of nuxtDirs) {
    if (path.startsWith(`${dir}/`)) {
      return findFileWithExtensions(resolve(projectRoot, path))
    }
  }

  return null
}

/**
 * Resolves Vue.js specific import paths
 */
function resolveVue(path: string, projectRoot: string): string | null {
  if (path.startsWith('@/')) {
    const withoutAlias = path.substring(2)
    return findFileWithExtensions(resolve(projectRoot, 'src', withoutAlias))
  }

  if (path.startsWith('src/')) {
    return findFileWithExtensions(resolve(projectRoot, path))
  }

  return null
}

/**
 * Attempts to find a file by trying various extensions and index files
 */
function findFileWithExtensions(basePath: string): string | null {
  const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.vue', '.mjs', '.cjs']
  const indexFiles = ['/index.js', '/index.ts', '/index.jsx', '/index.tsx']

  for (const ext of extensions) {
    const candidate = basePath + ext
    if (isFile(candidate)) {
      return candidate
    }
  }

  if (isDirectory(basePath)) {
    for (const indexFile of indexFiles) {
      const candidate = basePath + indexFile
      if (isFile(candidate)) {
        return candidate
      }
    }
  }

  return null
}

/**
 * Searches for a file in available files using fuzzy matching
 */
function findInAvailableFiles(path: string, availableFiles: string[]): string | null {
  const pathLower = path.toLowerCase()
  const pathBase = basename(path).toLowerCase()

  for (const file of availableFiles) {
    const fileLower = file.toLowerCase()
    if (fileLower.includes(pathLower) || basename(file).toLowerCase() === pathBase) {
      return file
    }
  }

  return null
}