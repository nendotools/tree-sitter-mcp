/**
 * Monorepo detection and handling - preserves sophisticated detection logic
 */

import { join, resolve } from 'path'
import { readFileSync as fsReadFileSync, readdirSync } from 'fs'
import { isDirectory, isFile } from '../utils/helpers.js'
import { getLogger } from '../utils/logger.js'
import type { MonorepoInfo } from '../types/analysis.js'

const PROJECT_INDICATORS = [
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'Cargo.toml', 'go.mod', 'pyproject.toml', 'requirements.txt', 'Pipfile',
  'composer.json', 'pom.xml', 'build.gradle', 'tsconfig.json',
]

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'target', 'build', 'dist', 'out',
  '.next', '.nuxt', '.output', '.cache', '.tmp', 'vendor', '__pycache__',
  '.vscode', '.idea', 'coverage', '.nyc_output', 'venv', '.venv', '.env',
  '.pytest_cache', '.mypy_cache', '.tox', 'htmlcov', '.coverage',
  'test', 'tests', '__tests__', 'spec', 'specs', '__test__',
])

export function detectMonorepo(directory: string): MonorepoInfo {
  const logger = getLogger()

  try {
    const subProjects = findSubProjects(directory)
    const workspaces = detectWorkspaces(directory)
    const rootProject = findRootProject(directory)

    const isMonorepo = subProjects.length > 1

    if (isMonorepo) {
      logger.info(`Detected monorepo with ${subProjects.length} sub-projects`)
    }

    return {
      isMonorepo,
      subProjects,
      workspaces,
      rootProject,
    }
  }
  catch (error) {
    logger.warn('Failed to detect monorepo:', error)
    return {
      isMonorepo: false,
      subProjects: [directory],
      workspaces: [],
      rootProject: directory,
    }
  }
}

export function findSubProjects(directory: string, maxDepth = 3): string[] {
  const subProjects: string[] = []

  function search(dir: string, depth: number) {
    if (depth >= maxDepth) return

    try {
      const entries = readDirSync(dir)
      let hasProjectIndicator = false

      for (const entry of entries) {
        if (PROJECT_INDICATORS.includes(entry)) {
          hasProjectIndicator = true
          break
        }
      }

      if (hasProjectIndicator) {
        subProjects.push(dir)
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry)
        if (isDirectory(fullPath) && !IGNORE_DIRS.has(entry)) {
          search(fullPath, depth + 1)
        }
      }
    }
    catch {
      /* ignore filesystem errors */
    }
  }

  search(directory, 0)

  if (subProjects.length === 0) {
    subProjects.push(directory)
  }

  return subProjects
}

function detectNpmWorkspaces(directory: string): string[] {
  try {
    const packageJsonPath = join(directory, 'package.json')
    if (isFile(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath))

      if (packageJson.workspaces) {
        if (Array.isArray(packageJson.workspaces)) {
          return packageJson.workspaces
        }
        else if (packageJson.workspaces.packages) {
          return packageJson.workspaces.packages
        }
      }
    }
  }
  catch {
    /* ignore parsing errors */
  }

  return []
}

function detectPnpmWorkspaces(directory: string): string[] {
  try {
    const pnpmWorkspacePath = join(directory, 'pnpm-workspace.yaml')
    if (isFile(pnpmWorkspacePath)) {
      const workspaces: string[] = []
      const content = readFileSync(pnpmWorkspacePath)
      const lines = content.split('\n')
      let inPackages = false

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === 'packages:') {
          inPackages = true
        }
        else if (inPackages && trimmed.startsWith('- ')) {
          const workspace = trimmed.substring(2).replace(/['"]/g, '')
          workspaces.push(workspace)
        }
        else if (inPackages && !trimmed.startsWith('- ') && trimmed !== '') {
          inPackages = false
        }
      }

      return workspaces
    }
  }
  catch {
    /* ignore parsing errors */
  }

  return []
}

function detectLernaWorkspaces(directory: string): string[] {
  try {
    const lernaJsonPath = join(directory, 'lerna.json')
    if (isFile(lernaJsonPath)) {
      const lernaJson = JSON.parse(readFileSync(lernaJsonPath))
      if (lernaJson.packages) {
        return lernaJson.packages
      }
    }
  }
  catch {
    /* ignore parsing errors */
  }

  return []
}

export function detectWorkspaces(directory: string): string[] {
  const workspaces: string[] = []

  workspaces.push(...detectNpmWorkspaces(directory))
  workspaces.push(...detectPnpmWorkspaces(directory))
  workspaces.push(...detectLernaWorkspaces(directory))

  return workspaces
}

export function findRootProject(directory: string): string {
  let current = resolve(directory)

  while (current !== resolve(current, '..')) {
    const hasGit = isDirectory(join(current, '.git'))
    const hasPackageJson = isFile(join(current, 'package.json'))
    const hasCargoToml = isFile(join(current, 'Cargo.toml'))
    const hasGoMod = isFile(join(current, 'go.mod'))

    if (hasGit || hasPackageJson || hasCargoToml || hasGoMod) {
      return current
    }

    current = resolve(current, '..')
  }

  return directory
}

export function isMonorepoRoot(directory: string): boolean {
  const workspaces = detectWorkspaces(directory)
  const subProjects = findSubProjects(directory, 2)

  return workspaces.length > 0 || subProjects.length > 1
}

export function getMonorepoStructure(directory: string): {
  root: string
  subProjects: { path: string, name: string, type: string }[]
  workspaces: string[]
} {
  const root = findRootProject(directory)
  const subProjects = findSubProjects(root)
  const workspaces = detectWorkspaces(root)

  const projectDetails = subProjects.map(path => ({
    path,
    name: path.split('/').pop() || path,
    type: detectProjectType(path),
  }))

  return {
    root,
    subProjects: projectDetails,
    workspaces,
  }
}

function detectProjectType(projectPath: string): string {
  if (isFile(join(projectPath, 'package.json'))) return 'npm'
  if (isFile(join(projectPath, 'Cargo.toml'))) return 'rust'
  if (isFile(join(projectPath, 'go.mod'))) return 'go'
  if (isFile(join(projectPath, 'pyproject.toml'))) return 'python'
  if (isFile(join(projectPath, 'pom.xml'))) return 'java'
  return 'unknown'
}

function readDirSync(dir: string): string[] {
  try {
    return readdirSync(dir)
  }
  catch {
    return []
  }
}

function readFileSync(filePath: string): string {
  try {
    return fsReadFileSync(filePath, 'utf-8')
  }
  catch {
    return ''
  }
}