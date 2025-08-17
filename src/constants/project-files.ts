/**
 * Standard project files and configuration constants
 */

export const PROJECT_FILES = {
  PACKAGE_MANAGERS: {
    NPM: 'package.json',
    PNPM_WORKSPACE: 'pnpm-workspace.yaml',
    LERNA: 'lerna.json',
    MAVEN: 'pom.xml',
    GO: 'go.mod',
    CARGO: 'Cargo.toml',
  },
  VERSION_CONTROL: {
    GIT: '.git',
  },
} as const

export const WORKSPACE_FILES = [
  PROJECT_FILES.PACKAGE_MANAGERS.NPM,
  PROJECT_FILES.PACKAGE_MANAGERS.PNPM_WORKSPACE,
  PROJECT_FILES.PACKAGE_MANAGERS.LERNA,
] as const

export const MONOREPO_INDICATORS = [
  PROJECT_FILES.PACKAGE_MANAGERS.NPM,
  PROJECT_FILES.PACKAGE_MANAGERS.PNPM_WORKSPACE,
  PROJECT_FILES.PACKAGE_MANAGERS.LERNA,
  PROJECT_FILES.PACKAGE_MANAGERS.MAVEN,
  PROJECT_FILES.PACKAGE_MANAGERS.GO,
  PROJECT_FILES.PACKAGE_MANAGERS.CARGO,
] as const

export function isWorkspaceFile(fileName: string): boolean {
  return WORKSPACE_FILES.includes(fileName as any)
}

export function isMonorepoIndicator(fileName: string): boolean {
  return MONOREPO_INDICATORS.includes(fileName as any)
}