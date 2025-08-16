/**
 * Enhanced dead code analyzer coordinator
 */

import { BaseAnalyzer } from '../base-analyzer.js'
import type { TreeNode, AnalysisResult } from '../../../../types/index.js'

// Language analyzers
import { JavaScriptAnalyzer } from './language-analyzers/javascript-analyzer.js'
import { PythonAnalyzer } from './language-analyzers/python-analyzer.js'

// Framework analyzers
import { ReactAnalyzer } from './framework-analyzers/react-analyzer.js'

// Detection strategies
import { PackageAnalyzer } from './detection-strategies/package-analyzer.js'

// Types
import type { UsageAnalysisResult } from './types.js'

/**
 * Enhanced dead code analyzer that uses language and framework-specific detection
 */
export class DeadCodeCoordinator extends BaseAnalyzer {
  private packageAnalyzer: PackageAnalyzer

  constructor() {
    super()
    this.packageAnalyzer = new PackageAnalyzer()
  }

  async analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void> {
    const startTime = performance.now()
    console.log(`🚀 DeadCodeCoordinator starting analysis of ${nodes.length} nodes`)

    const fileNodes = this.getFileNodes(nodes)
    console.log(`📁 Filtered to ${fileNodes.length} file nodes in ${performance.now() - startTime}ms`)

    if (fileNodes.length === 0) {
      result.metrics.deadCode = {
        orphanedFiles: 0,
        unusedExports: 0,
        unusedDependencies: 0,
      }
      return
    }

    // Get package.json info for framework detection
    const packageTime = performance.now()
    const packageJsonFile = fileNodes.find(f => f.path.endsWith('package.json'))
    const frameworkHints = packageJsonFile?.content
      ? this.packageAnalyzer.getFrameworkHints(JSON.parse(packageJsonFile.content))
      : {}
    console.log(`📦 Package analysis completed in ${performance.now() - packageTime}ms`)

    // Analyze usage patterns
    const usageTime = performance.now()
    const usageResult = this.analyzeUsage(fileNodes, frameworkHints)
    console.log(`🔍 Usage analysis completed in ${performance.now() - usageTime}ms`)

    // Find dead code
    const deadCodeTime = performance.now()
    const orphanedFiles = this.findOrphanedFiles(fileNodes, usageResult)
    const unusedExports = this.findUnusedExports(fileNodes, usageResult)
    const unusedDependencies = this.findUnusedDependencies(fileNodes)
    console.log(`💀 Dead code detection completed in ${performance.now() - deadCodeTime}ms`)

    // Update metrics
    result.metrics.deadCode = {
      orphanedFiles: orphanedFiles.length,
      unusedExports: unusedExports.length,
      unusedDependencies: unusedDependencies.length,
    }

    // Add findings to result
    const findingsTime = performance.now()
    this.addDeadCodeFindings(orphanedFiles, unusedExports, unusedDependencies, result)
    console.log(`📝 Findings generation completed in ${performance.now() - findingsTime}ms`)

    console.log(`✅ DeadCodeCoordinator total analysis time: ${performance.now() - startTime}ms`)
  }

  /**
   * Analyzes usage patterns using language and framework-specific analyzers
   */
  private analyzeUsage(fileNodes: TreeNode[], frameworkHints: Record<string, boolean>): UsageAnalysisResult {
    const usageStartTime = performance.now()
    const allUsedFiles = new Set<string>()
    const allEntryPoints = new Set<string>()
    const allImportMap = new Map<string, string[]>()
    const allExports = new Map<string, string[]>()

    // Language-specific analysis
    const langStartTime = performance.now()
    const languageAnalyzers = [
      new JavaScriptAnalyzer(),
      new PythonAnalyzer(),
    ]

    for (const analyzer of languageAnalyzers) {
      const analyzerStartTime = performance.now()
      const languageResult = analyzer.analyzeUsage(fileNodes)
      console.log(`  📝 ${analyzer.constructor.name} completed in ${performance.now() - analyzerStartTime}ms`)

      // Merge results
      languageResult.usedFiles.forEach(file => allUsedFiles.add(file))
      languageResult.entryPoints.forEach(entry => allEntryPoints.add(entry))

      for (const [file, imports] of languageResult.importMap) {
        const existing = allImportMap.get(file) || []
        allImportMap.set(file, [...existing, ...imports])
      }

      for (const [file, exports] of languageResult.exports) {
        allExports.set(file, exports)
      }
    }
    console.log(`📚 Language analysis completed in ${performance.now() - langStartTime}ms`)

    // Framework-specific analysis
    if (frameworkHints.react || frameworkHints.nextjs) {
      const frameworkStartTime = performance.now()
      const reactAnalyzer = new ReactAnalyzer(fileNodes)
      if (reactAnalyzer.isFrameworkDetected(fileNodes)) {
        const frameworkUsage = reactAnalyzer.detectUsage(fileNodes, reactAnalyzer.getUsageContext())
        frameworkUsage.forEach(file => allUsedFiles.add(file))

        const frameworkEntryPoints = reactAnalyzer.detectFrameworkEntryPoints(fileNodes)
        frameworkEntryPoints.forEach(entry => allEntryPoints.add(entry))
      }
      console.log(`⚛️ Framework analysis completed in ${performance.now() - frameworkStartTime}ms`)
    }

    // Package.json entry points
    const packageStartTime = performance.now()
    const packageJsonFile = fileNodes.find(f => f.path.endsWith('package.json'))
    if (packageJsonFile?.content) {
      try {
        const packageJson = JSON.parse(packageJsonFile.content)
        const packageEntryPoints = this.packageAnalyzer.getEntryPoints(packageJson)

        packageEntryPoints.forEach((entry) => {
          // Resolve relative paths
          if (entry.startsWith('./')) {
            const resolved = entry.substring(2)
            if (fileNodes.some(f => f.path.endsWith(resolved))) {
              allEntryPoints.add(fileNodes.find(f => f.path.endsWith(resolved))?.path || '')
            }
          }
          else {
            allEntryPoints.add(entry)
          }
        })
      }
      catch {
        // Ignore JSON parse errors
      }
    }
    console.log(`📦 Package entry points completed in ${performance.now() - packageStartTime}ms`)

    // Mark all entry points as used
    allEntryPoints.forEach(entry => allUsedFiles.add(entry))

    console.log(`🔍 Total usage analysis: ${performance.now() - usageStartTime}ms`)
    return {
      usedFiles: allUsedFiles,
      entryPoints: allEntryPoints,
      importMap: allImportMap,
      exports: allExports,
    }
  }

  /**
   * Finds orphaned files that are not used anywhere
   */
  private findOrphanedFiles(fileNodes: TreeNode[], usageResult: UsageAnalysisResult): string[] {
    const orphanedFiles: string[] = []

    for (const fileNode of fileNodes) {
      if (!usageResult.usedFiles.has(fileNode.path)
        && !usageResult.entryPoints.has(fileNode.path)) {
        // Skip build output directories, generated files, and config files
        if (!this.isBuildOutputOrGenerated(fileNode.path) && !this.isConfigFile(fileNode.path)) {
          orphanedFiles.push(fileNode.path)
        }
      }
    }

    return orphanedFiles
  }

  /**
   * Finds unused exports
   */
  private findUnusedExports(fileNodes: TreeNode[], usageResult: UsageAnalysisResult): Array<{
    file: string
    export: string
    type: string
  }> {
    const unusedExports: Array<{ file: string, export: string, type: string }> = []

    for (const [filePath, exports] of usageResult.exports) {
      const fileNode = fileNodes.find(f => f.path === filePath)
      if (!fileNode?.content) continue

      for (const exportName of exports) {
        let isUsed = false

        // Check if export is imported in other files
        for (const [importingFile, imports] of usageResult.importMap) {
          if (importingFile !== filePath && imports.includes(filePath)) {
            // Check if the specific export is used
            const importingFileNode = fileNodes.find(f => f.path === importingFile)
            if (importingFileNode?.content?.includes(exportName)) {
              isUsed = true
              break
            }
          }
        }

        // Check if export is used within the same file (multiple times)
        if (!isUsed && fileNode.content) {
          const regex = new RegExp(`\\b${this.escapeRegExp(exportName)}\\b`, 'g')
          const matches = fileNode.content.match(regex)
          if (matches && matches.length > 1) {
            isUsed = true
          }
        }

        if (!isUsed) {
          unusedExports.push({
            file: filePath,
            export: exportName,
            type: 'unknown',
          })
        }
      }
    }

    return unusedExports
  }

  /**
   * Finds unused dependencies in package.json
   */
  private findUnusedDependencies(fileNodes: TreeNode[]): string[] {
    const unusedDependencies: string[] = []

    const packageJsonFile = fileNodes.find(f => f.path.endsWith('package.json'))
    if (!packageJsonFile?.content) {
      return unusedDependencies
    }

    try {
      const packageJson = JSON.parse(packageJsonFile.content) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      for (const depName of Object.keys(dependencies)) {
        let isUsed = false

        for (const fileNode of fileNodes) {
          if (!fileNode.content) continue

          const importRegex = new RegExp(`['"\`]${this.escapeRegExp(depName)}['"\`]`, 'g')
          if (importRegex.test(fileNode.content)) {
            isUsed = true
            break
          }
        }

        if (!isUsed) {
          unusedDependencies.push(depName)
        }
      }
    }
    catch {
      // Ignore JSON parsing errors for package.json
    }

    return unusedDependencies
  }

  /**
   * Checks if a file path represents build output or generated files that should be ignored
   */
  private isBuildOutputOrGenerated(filePath: string): boolean {
    const buildOutputPatterns = [
      // JavaScript/TypeScript build outputs
      '.output/',
      'dist/',
      'build/',
      '.next/',
      '.nuxt/',
      '_nuxt/',
      '.vite/',
      '.vercel/',
      '.netlify/',

      // Package manager outputs
      'node_modules/',
      '.pnpm/',
      '.yarn/',

      // Generated files
      '.generated/',
      '.cache/',
      '.temp/',
      '.tmp/',
      'coverage/',

      // Common generated file extensions
      '.map',
      '.tsbuildinfo',

      // Generated API/documentation files
      'api-docs/bruno.json',
      'api-docs/environments/',

      // Environment and config files that are typically not imported
      '.env',
      '.env.local',
      '.env.production',
      '.env.development',

      // Framework-specific files that are auto-imported or used conventionally
      'components.json', // Nuxt/Vue component definitions
      'nuxt.config.',
      'tailwind.config.',
      'vite.config.',
      'webpack.config.',
      'postcss.config.',
      'eslint.config.',

      // Package manager files
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',

      // IDE/Editor files
      '.vscode/',
      '.idea/',
      '.claude/',

      // Git files
      '.git/',

      // OS files
      '.DS_Store',
      'Thumbs.db',
    ]

    return buildOutputPatterns.some((pattern) => {
      if (pattern.endsWith('/')) {
        return filePath.includes(pattern)
      }
      else {
        return filePath.endsWith(pattern) || filePath.includes(`/${pattern}`)
      }
    })
  }

  /**
   * Checks if a file path represents configuration files that should not be marked as orphaned
   */
  private isConfigFile(filePath: string): boolean {
    const configFilePatterns = [
      // ESLint configurations
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
      'eslint.config.ts',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      '.eslintignore',

      // Prettier configurations
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yaml',
      '.prettierrc.yml',
      'prettier.config.js',
      '.prettierignore',

      // TypeScript configurations
      'tsconfig.json',
      'tsconfig.node.json',
      'tsconfig.eslint.json',
      'tsconfig.build.json',

      // Build tool configurations
      'webpack.config.js',
      'webpack.config.ts',
      'vite.config.js',
      'vite.config.ts',
      'rollup.config.js',
      'rollup.config.ts',

      // Next.js configurations
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',

      // Nuxt configurations
      'nuxt.config.js',
      'nuxt.config.ts',

      // Vue configurations
      'vue.config.js',
      'vue.config.ts',

      // PostCSS configurations
      'postcss.config.js',
      'postcss.config.ts',

      // Tailwind CSS configurations
      'tailwind.config.js',
      'tailwind.config.ts',

      // Babel configurations
      '.babelrc',
      '.babelrc.js',
      '.babelrc.json',
      'babel.config.js',
      'babel.config.json',

      // Testing configurations
      'vitest.config.js',
      'vitest.config.ts',
      'jest.config.js',
      'jest.config.ts',
      'karma.conf.js',
      'playwright.config.js',
      'playwright.config.ts',

      // Package manager configurations
      'package.json',
      '.npmrc',
      '.yarnrc',
      '.yarnrc.yml',
      'pnpm-workspace.yaml',

      // Environment files
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.test',

      // Git configurations
      '.gitignore',
      '.gitattributes',

      // Editor configurations
      '.editorconfig',

      // Docker configurations
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',

      // CI/CD configurations
      '.github/',
      '.gitlab-ci.yml',
      'azure-pipelines.yml',

      // Other common config files
      'LICENSE',
      'README.md',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      '.nvmrc',
      'renovate.json',
      'dependabot.yml',
    ]

    return configFilePatterns.some((pattern) => {
      if (pattern.endsWith('/')) {
        return filePath.includes(pattern)
      }
      else {
        return filePath.endsWith(pattern) || filePath === pattern
      }
    })
  }

  /**
   * Adds dead code findings to the result
   */
  private addDeadCodeFindings(
    orphanedFiles: string[],
    unusedExports: Array<{ file: string, export: string, type: string }>,
    unusedDependencies: string[],
    result: AnalysisResult,
  ): void {
    for (const file of orphanedFiles) {
      this.addFinding(result, {
        type: 'deadcode',
        category: 'orphaned_file',
        severity: 'warning',
        location: file,
        description: 'File appears to be unused (not imported anywhere)',
        context: 'Consider removing unused files or ensuring they are properly referenced',
      })
    }

    for (const { file, export: exportName } of unusedExports) {
      this.addFinding(result, {
        type: 'deadcode',
        category: 'unused_export',
        severity: 'info',
        location: file,
        description: `Exported symbol '${exportName}' appears to be unused`,
        context: 'Consider removing unused exports to reduce bundle size',
      })
    }

    for (const dep of unusedDependencies) {
      this.addFinding(result, {
        type: 'deadcode',
        category: 'unused_dependency',
        severity: 'info',
        location: 'package.json',
        description: `Dependency '${dep}' appears to be unused`,
        context: 'Consider removing unused dependencies to reduce bundle size and security surface',
      })
    }
  }
}