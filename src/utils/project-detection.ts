import { existsSync } from 'fs'
import { readdir } from 'fs/promises'
import { resolve, dirname, join } from 'path'

import {
  PROJECT_INDICATORS as LANGUAGE_PROJECT_INDICATORS,
  MONO_REPO_IGNORE_DIRS,
  MONO_REPO_CONFIG as MONO_REPO,
  INDICATOR_TO_LANGUAGES as INDICATOR_LANGUAGE_MAP,
} from '../constants/analysis-constants.js'
import type { MonoRepoInfo, SubProject } from '../types/index.js'

const PROJECT_ROOT_INDICATORS = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'pom.xml',
  'build.gradle',
  'tsconfig.json',
  '.git',
  '.gitignore',
  'README.md',
  'LICENSE',
] as const
export function findProjectRoot(startDir?: string): string {
  let currentDir = resolve(startDir || process.cwd())
  const rootDir = resolve('/')

  if (isMonoRepo(currentDir)) {
    return currentDir
  }

  while (currentDir !== rootDir) {
    for (const indicator of PROJECT_ROOT_INDICATORS) {
      const indicatorPath = resolve(currentDir, indicator)
      if (existsSync(indicatorPath)) {
        return currentDir
      }
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }
    currentDir = parentDir
  }

  return resolve(startDir || process.cwd())
}

export async function findProjectRootWithMonoRepo(startDir?: string): Promise<MonoRepoInfo> {
  const projectRoot = findProjectRoot(startDir)
  const monoRepo = isMonoRepo(projectRoot)

  let subProjects: SubProject[] = []
  if (monoRepo) {
    subProjects = await findSubProjects(projectRoot)
  }

  return {
    projectRoot,
    isMonoRepo: monoRepo,
    subProjects,
  }
}

export function isMonoRepo(dir: string): boolean {
  const gitPath = resolve(dir, '.git')
  return existsSync(gitPath)
}

export async function findSubProjects(
  rootDir: string,
  maxDepth: number = MONO_REPO.DEFAULT_MAX_DEPTH,
): Promise<SubProject[]> {
  const subProjects: SubProject[] = []

  async function searchDirectory(currentDir: string, depth: number): Promise<void> {
    if (depth >= maxDepth) return

    try {
      const entries = await readdir(currentDir, { withFileTypes: true })
      const indicators: string[] = []

      for (const entry of entries) {
        if (entry.isFile() && LANGUAGE_PROJECT_INDICATORS.includes(entry.name as any)) {
          indicators.push(entry.name)
        }
      }

      if (indicators.length >= MONO_REPO.MIN_INDICATORS_REQUIRED && currentDir !== rootDir) {
        const languages = getLanguagesFromIndicators(indicators)
        subProjects.push({
          path: currentDir,
          indicators,
          languages,
        })
      }

      for (const entry of entries) {
        if (entry.isDirectory() && !MONO_REPO_IGNORE_DIRS.has(entry.name)) {
          const subDir = join(currentDir, entry.name)
          await searchDirectory(subDir, depth + 1)
        }
      }
    }
    catch {
      // Skip directories we can't read
    }
  }

  await searchDirectory(rootDir, 0)
  return subProjects
}

function getLanguagesFromIndicators(indicators: string[]): string[] {
  const languages: Set<string> = new Set()

  for (const indicator of indicators) {
    const mappedLanguages
      = INDICATOR_LANGUAGE_MAP[indicator as keyof typeof INDICATOR_LANGUAGE_MAP]
    if (mappedLanguages) {
      mappedLanguages.forEach(lang => languages.add(lang))
    }
  }

  return Array.from(languages)
}
