/**
 * Traversal-based dead code detector using top-down approach
 *
 * Algorithm:
 * 1. Identify all entry points (package.json scripts, framework conventions, etc.)
 * 2. Traverse dependency tree starting from entry points using AST import data
 * 3. Mark all reachable files as "alive"
 * 4. Everything else is dead code
 */

import type { TreeNode, AnalysisResult } from '../../../../types/index.js'
import { BaseAnalyzer } from '../base-analyzer.js'
import { BarrelExportAnalyzer, type BarrelGroup } from './barrel-export-analyzer.js'
import { ImportResolver } from '../../../../core/import-resolution/index.js'
import { FrameworkManager } from './framework-analyzers/framework-manager.js'

interface EntryPoint {
  path: string
  type: 'package_script' | 'package_main' | 'package_bin' | 'framework_page' | 'framework_api' | 'test_file' | 'config_file'
  source: string // Description of why this is an entry point
}

interface DependencyGraph {
  entryPoints: Set<string>
  reachableFiles: Set<string>
  dependencyMap: Map<string, string[]> // file -> files it imports
  unreachableFiles: Set<string>
  unusedExports: Map<string, string[]> // file -> unused export names
}

export class TraversalDeadCodeDetector extends BaseAnalyzer {
  private barrelAnalyzer: BarrelExportAnalyzer
  private importResolver: ImportResolver

  constructor() {
    super()
    this.barrelAnalyzer = new BarrelExportAnalyzer()
    this.importResolver = new ImportResolver()
  }

  async analyze(fileNodes: TreeNode[], result: AnalysisResult): Promise<void> {
    // Initialize import resolver with available files
    this.importResolver.initialize(fileNodes)

    // Step 1: Build comprehensive entry point list
    const entryPoints = this.detectAllEntryPoints(fileNodes)

    // Step 2: Build dependency graph using AST data
    const dependencyGraph = this.buildDependencyGraph(fileNodes, entryPoints)

    // Step 3: Traverse from entry points to find all reachable files
    this.traverseFromEntryPoints(dependencyGraph)

    // Step 4: Analyze barrel export patterns
    const barrelGroups = this.analyzeBarrelExports(fileNodes, dependencyGraph)

    // Step 5: Identify dead code (including unused barrel groups)
    this.identifyDeadCode(fileNodes, dependencyGraph, result, barrelGroups)
  }

  /**
   * Step 1: Comprehensive entry point detection
   */
  private detectAllEntryPoints(fileNodes: TreeNode[]): EntryPoint[] {
    const entryPoints: EntryPoint[] = []

    // Package.json analysis
    entryPoints.push(...this.detectPackageEntryPoints(fileNodes))

    // Framework conventions (with auto-detection)
    entryPoints.push(...this.detectFrameworkEntryPoints(fileNodes))

    // Test files (test runners execute these directly)
    entryPoints.push(...this.detectTestEntryPoints(fileNodes))

    // Config files (tools execute these directly)
    entryPoints.push(...this.detectConfigEntryPoints(fileNodes))

    return entryPoints
  }

  private detectPackageEntryPoints(fileNodes: TreeNode[]): EntryPoint[] {
    const entryPoints: EntryPoint[] = []
    // Find the root package.json first (shortest path = closest to project root)
    const packageJsonFiles = fileNodes.filter(node =>
      node.path === 'package.json' || node.path.endsWith('/package.json'),
    ).sort((a, b) => a.path.length - b.path.length) // Shortest path first (root)

    const packageJson = packageJsonFiles[0] // Use the root package.json

    if (!packageJson?.content) return entryPoints

    try {
      const pkg = JSON.parse(packageJson.content) as any

      // Auto-detect frameworks from dependencies
      this.detectFrameworks(pkg)

      // Main entry points
      if (pkg.main) {
        entryPoints.push({
          path: this.resolvePath(pkg.main),
          type: 'package_main',
          source: 'package.json main field',
        })
      }

      if (pkg.module) {
        entryPoints.push({
          path: this.resolvePath(pkg.module),
          type: 'package_main',
          source: 'package.json module field',
        })
      }

      // Binary entries
      if (pkg.bin) {
        const binEntries = typeof pkg.bin === 'string' ? [pkg.bin] : Object.values(pkg.bin)
        for (const binPath of binEntries) {
          // Map built files back to source files
          const sourcePath = this.mapBuildToSource(binPath as string, fileNodes)

          if (sourcePath) {
            entryPoints.push({
              path: sourcePath,
              type: 'package_bin',
              source: 'package.json bin field (mapped to source)',
            })
          }
          else {
            entryPoints.push({
              path: this.resolvePath(binPath as string),
              type: 'package_bin',
              source: 'package.json bin field',
            })
          }
        }
      }

      // Script entries (these execute files directly)
      if (pkg.scripts) {
        for (const [scriptName, script] of Object.entries(pkg.scripts)) {
          const scriptPaths = this.extractScriptEntryPoints(script as string)
          for (const scriptPath of scriptPaths) {
            entryPoints.push({
              path: scriptPath,
              type: 'package_script',
              source: `package.json script: ${scriptName}`,
            })
          }
        }
      }
    }
    catch (error) {
      console.warn('Failed to parse package.json:', error)
    }

    return entryPoints
  }

  private extractScriptEntryPoints(script: string): string[] {
    const entryPoints: string[] = []

    // Common patterns that indicate file execution
    const patterns = [
      // Node.js execution: node script.js, node src/index.js
      /(?:^|\s)node\s+([^\s]+\.(?:js|ts|mjs|cjs))(?:\s|$)/g,
      // TypeScript execution: tsx script.ts, ts-node src/main.ts
      /(?:^|\s)(?:tsx?|ts-node)\s+([^\s]+\.(?:ts|tsx))(?:\s|$)/g,
      // Direct file execution: ./script.js, src/cli.ts
      /(?:^|\s)\.?\/([^\s]+\.(?:js|ts|jsx|tsx|mjs|cjs))(?:\s|$)/g,
      // Vitest, Jest test execution patterns
      /(?:vitest|jest)\s+([^\s]+\.(?:test|spec)\.(?:js|ts|jsx|tsx))/g,
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(script)) !== null) {
        if (match[1]) {
          entryPoints.push(this.resolvePath(match[1]))
        }
      }
    }

    return entryPoints
  }

  /**
   * Parse framework configuration files to get custom directory structures
   */
  private parseFrameworkConfigs(fileNodes: TreeNode[], detectedFrameworks: string[]): Record<string, any> {
    const configs: Record<string, any> = {}

    // Nuxt.js configuration
    if (detectedFrameworks.includes('nuxt')) {
      const nuxtConfig = fileNodes.find(node =>
        node.path.endsWith('/nuxt.config.js')
        || node.path.endsWith('/nuxt.config.ts')
        || node.path === 'nuxt.config.js'
        || node.path === 'nuxt.config.ts',
      )

      if (nuxtConfig?.content) {
        configs.nuxt = this.parseNuxtConfig(nuxtConfig.content)
      }
      else {
        // Use Nuxt defaults
        configs.nuxt = {
          dirs: {
            pages: 'pages',
            layouts: 'layouts',
            middleware: 'middleware',
            plugins: 'plugins',
            composables: 'composables',
            serverApi: 'server/api',
          },
        }
      }
    }

    // Next.js configuration
    if (detectedFrameworks.includes('nextjs')) {
      const nextConfig = fileNodes.find(node =>
        node.path.endsWith('/next.config.js')
        || node.path.endsWith('/next.config.ts')
        || node.path === 'next.config.js'
        || node.path === 'next.config.ts',
      )

      if (nextConfig?.content) {
        configs.nextjs = this.parseNextConfig(nextConfig.content)
      }
      else {
        // Use Next.js defaults
        configs.nextjs = {
          dirs: {
            pages: 'pages',
            app: 'app', // App Router
            api: 'pages/api',
          },
        }
      }
    }

    return configs
  }

  /**
   * Parse Nuxt config for custom directory settings
   */
  private parseNuxtConfig(content: string): any {
    const defaults = {
      dirs: {
        pages: 'pages',
        layouts: 'layouts',
        middleware: 'middleware',
        plugins: 'plugins',
        composables: 'composables',
        serverApi: 'server/api',
      },
    }

    try {
      // Simple regex-based parsing for common config patterns
      // This could be enhanced with a proper JS parser if needed

      // Look for dir config: dir: { pages: 'custom-pages' }
      const dirMatch = content.match(/dir\s*:\s*\{([^}]+)\}/)
      if (dirMatch && dirMatch[1]) {
        const dirConfig = dirMatch[1]

        // Extract individual directory settings
        const pagesMatch = dirConfig.match(/pages\s*:\s*['"`]([^'"`]+)['"`]/)
        const layoutsMatch = dirConfig.match(/layouts\s*:\s*['"`]([^'"`]+)['"`]/)
        const middlewareMatch = dirConfig.match(/middleware\s*:\s*['"`]([^'"`]+)['"`]/)
        const pluginsMatch = dirConfig.match(/plugins\s*:\s*['"`]([^'"`]+)['"`]/)

        if (pagesMatch && pagesMatch[1]) defaults.dirs.pages = pagesMatch[1]
        if (layoutsMatch && layoutsMatch[1]) defaults.dirs.layouts = layoutsMatch[1]
        if (middlewareMatch && middlewareMatch[1]) defaults.dirs.middleware = middlewareMatch[1]
        if (pluginsMatch && pluginsMatch[1]) defaults.dirs.plugins = pluginsMatch[1]
      }

      // Look for serverDir config
      const serverDirMatch = content.match(/serverDir\s*:\s*['"`]([^'"`]+)['"`]/)
      if (serverDirMatch && serverDirMatch[1]) {
        defaults.dirs.serverApi = `${serverDirMatch[1]}/api`
      }
    }
    catch {
      // Fall back to defaults if parsing fails
    }

    return defaults
  }

  /**
   * Parse Next.js config for custom directory settings
   */
  private parseNextConfig(content: string): any {
    const defaults = {
      dirs: {
        pages: 'pages',
        app: 'app',
        api: 'pages/api',
      },
    }

    try {
      // Look for custom page extensions, src directory, etc.
      const srcDirMatch = content.match(/experimental\s*:\s*\{[^}]*appDir\s*:\s*['"`]([^'"`]+)['"`]/)
      if (srcDirMatch && srcDirMatch[1]) {
        defaults.dirs.app = srcDirMatch[1]
      }
    }
    catch {
      // Fall back to defaults
    }

    return defaults
  }

  private detectFrameworkEntryPoints(fileNodes: TreeNode[]): EntryPoint[] {
    // Get detected frameworks from package.json
    const detectedFrameworks = this.getDetectedFrameworks(fileNodes)

    // Parse framework configurations to get custom directory structures
    const frameworkConfigs = this.parseFrameworkConfigs(fileNodes, detectedFrameworks)

    // Use framework manager to delegate entry point detection
    const frameworkManager = new FrameworkManager(fileNodes, detectedFrameworks)
    const frameworkEntryPoints = frameworkManager.detectFrameworkEntryPoints(fileNodes, frameworkConfigs)

    return frameworkEntryPoints
  }

  /**
   * Extract package.json parsing logic into reusable helper
   */
  private getDetectedFrameworks(fileNodes: TreeNode[]): string[] {
    const packageJsonNodes = fileNodes.filter(node =>
      node.path === 'package.json' || node.path.endsWith('/package.json'),
    )
    // Prefer root package.json or main project package.json over build outputs
    const packageJson = packageJsonNodes.find(node =>
      node.path === 'package.json'
      || node.path === 'client/package.json'
      || (!node.path.includes('/.output/') && !node.path.includes('/dist/') && !node.path.includes('/build/')),
    ) || packageJsonNodes[0]

    if (!packageJson?.content) {
      return []
    }

    try {
      const pkg = JSON.parse(packageJson.content) as any
      return this.detectFrameworks(pkg)
    }
    catch {
      // Ignore parsing errors
      return []
    }
  }

  private detectTestEntryPoints(_fileNodes: TreeNode[]): EntryPoint[] {
    // Skip test entry points entirely - tests should be ignored from dead code analysis
    return []
  }

  private detectConfigEntryPoints(fileNodes: TreeNode[]): EntryPoint[] {
    const entryPoints: EntryPoint[] = []

    // Get detected frameworks using the extracted helper
    const detectedFrameworks = this.getDetectedFrameworks(fileNodes)

    // Base config patterns (always check these)
    const baseConfigPatterns = [
      // Build tools
      /^(webpack|vite|rollup)\.config\.(js|ts|mjs)$/,
      // Linting/formatting
      /^(eslint\.config\.(js|mjs|cjs)|\.eslintrc\.(js|cjs))$/,
      // Testing
      /^(vitest|jest|karma)\.config\.(js|ts)$/,
      // TypeScript
      /^tsconfig.*\.json$/,
      // Package managers
      /^(package|pnpm-workspace|lerna|rush)\.json$/,
    ]

    // Framework-specific config patterns
    const frameworkConfigPatterns: Record<string, RegExp[]> = {
      nextjs: [/^next\.config\.(js|ts|mjs)$/, /^middleware\.(js|ts)$/],
      nuxt: [/^nuxt\.config\.(js|ts)$/],
      vue: [/^vue\.config\.(js|ts)$/],
      gatsby: [/^gatsby-config\.(js|ts)$/, /^gatsby-node\.(js|ts)$/],
      remix: [/^remix\.config\.(js|ts)$/],
      astro: [/^astro\.config\.(js|ts|mjs)$/],
      svelte: [/^svelte\.config\.(js|ts)$/],
      vite: [/^vite\.config\.(js|ts)$/],
      turbo: [/^turbo\.json$/],
      nx: [/^nx\.json$/, /^workspace\.json$/],
    }

    for (const node of fileNodes) {
      const fileName = node.path.split('/').pop() || ''
      let isConfigFile = false

      // Check base patterns
      for (const pattern of baseConfigPatterns) {
        if (pattern.test(fileName)) {
          entryPoints.push({
            path: node.path,
            type: 'config_file',
            source: 'Tool configuration file',
          })
          isConfigFile = true
          break
        }
      }

      // Check framework-specific patterns only if framework is detected
      if (!isConfigFile) {
        for (const framework of detectedFrameworks) {
          const patterns = frameworkConfigPatterns[framework]
          if (patterns) {
            for (const pattern of patterns) {
              if (pattern.test(fileName)) {
                entryPoints.push({
                  path: node.path,
                  type: 'config_file',
                  source: `${framework.charAt(0).toUpperCase() + framework.slice(1)} configuration file`,
                })
                isConfigFile = true
                break
              }
            }
          }
          if (isConfigFile) break
        }
      }
    }

    return entryPoints
  }

  /**
   * Step 2: Build dependency graph using AST import data
   */
  private buildDependencyGraph(fileNodes: TreeNode[], entryPoints: EntryPoint[]): DependencyGraph {
    const dependencyMap = new Map<string, string[]>()
    const entryPointPaths = new Set(entryPoints.map(ep => ep.path))

    for (const fileNode of fileNodes) {
      if (fileNode.type !== 'file') continue

      // Use unified import resolver
      const importedFiles = this.importResolver.resolveImportsFromAST(fileNode)
      dependencyMap.set(fileNode.path, importedFiles)
    }

    return {
      entryPoints: entryPointPaths,
      reachableFiles: new Set(),
      dependencyMap,
      unreachableFiles: new Set(),
      unusedExports: new Map(),
    }
  }

  // Import resolution methods removed - now handled by unified ImportResolver

  /**
   * Step 3: Traverse from entry points to find all reachable files
   */
  private traverseFromEntryPoints(graph: DependencyGraph): void {
    const toVisit = Array.from(graph.entryPoints)
    const visited = new Set<string>()

    while (toVisit.length > 0) {
      const currentFile = toVisit.pop()!

      if (visited.has(currentFile)) continue
      visited.add(currentFile)

      graph.reachableFiles.add(currentFile)

      // Add all dependencies to visit queue
      const dependencies = graph.dependencyMap.get(currentFile) || []

      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          toVisit.push(dep)
        }
      }
    }
  }

  /**
   * Step 4: Analyze barrel export patterns
   */
  private analyzeBarrelExports(fileNodes: TreeNode[], graph: DependencyGraph): BarrelGroup[] {
    // Find all barrel groups
    const barrelGroups = this.barrelAnalyzer.analyzeBarrelGroups(fileNodes)

    // Analyze external usage for each barrel group
    this.barrelAnalyzer.analyzeExternalUsage(barrelGroups, fileNodes, graph.reachableFiles)

    this.barrelAnalyzer.getUnusedBarrelGroups(barrelGroups)

    return barrelGroups
  }

  /**
   * Step 5: Identify dead code (including unused barrel groups)
   */
  private identifyDeadCode(fileNodes: TreeNode[], graph: DependencyGraph, result: AnalysisResult, barrelGroups: BarrelGroup[]): void {
    // Get unused barrel groups
    const unusedBarrelGroups = this.barrelAnalyzer.getUnusedBarrelGroups(barrelGroups)
    const unusedBarrelFiles = new Set<string>()

    // Mark unused barrel group files for different handling
    for (const group of unusedBarrelGroups) {
      unusedBarrelFiles.add(group.barrelFile)
      for (const component of group.exportedComponents) {
        unusedBarrelFiles.add(component)
      }
    }

    // Add unused barrel groups as findings
    for (const group of unusedBarrelGroups) {
      // Add finding for the entire barrel group
      result.findings.push({
        type: 'deadcode',
        category: 'unused_barrel_group',
        severity: 'info',
        description: `Unused ${group.pattern} module barrel: ${group.barrelFile} and ${group.exportedComponents.length} modules`,
        location: group.barrelFile,
        context: `Barrel exports ${group.exportedComponents.length} modules but has no external usage. Safe to remove: ${group.barrelFile}${group.exportedComponents.length > 0 ? ', ' + group.exportedComponents.join(', ') : ''}`,
      })
    }

    // Find orphaned files (excluding test content, dot files, and barrel-handled files)
    for (const fileNode of fileNodes) {
      if (fileNode.type === 'file' && !graph.reachableFiles.has(fileNode.path)) {
        // Skip test fixtures, dot files, and other non-source content
        if (this.shouldIgnoreFile(fileNode.path)) {
          continue
        }

        // Skip files that are part of unused barrel groups (already handled above)
        if (unusedBarrelFiles.has(fileNode.path)) {
          continue
        }

        graph.unreachableFiles.add(fileNode.path)

        result.findings.push({
          type: 'deadcode',
          category: 'orphaned_file',
          severity: 'warning',
          description: 'File appears to be unused (not reachable from any entry point)',
          location: fileNode.path,
          context: 'Consider removing this file if it is truly unused',
        })
      }
    }

    // Find unused exports in reachable files
    this.findUnusedExports(fileNodes, graph, result)

    // Update metrics
    if (!result.metrics.deadCode) {
      result.metrics.deadCode = { orphanedFiles: 0, unusedExports: 0, unusedDependencies: 0 }
    }
    result.metrics.deadCode.orphanedFiles = graph.unreachableFiles.size
    result.metrics.deadCode.unusedExports = Array.from(graph.unusedExports.values()).reduce((sum, exports) => sum + exports.length, 0)
  }

  private findUnusedExports(fileNodes: TreeNode[], graph: DependencyGraph, result: AnalysisResult): void {
    // For each reachable file, check which exports are actually imported
    for (const fileNode of fileNodes) {
      if (fileNode.type !== 'file' || !graph.reachableFiles.has(fileNode.path)) continue
      if (!fileNode.exports || fileNode.exports.length === 0) continue

      const usedExports = new Set<string>()

      // Check what exports are actually imported by other files
      for (const [importerPath, dependencies] of graph.dependencyMap.entries()) {
        if (!dependencies.includes(fileNode.path)) continue

        const importerNode = fileNodes.find(node => node.path === importerPath)
        if (importerNode) {
          // TODO: Analyze specific imported symbols (requires more detailed AST analysis)
          // For now, assume all exports are used if the file is imported
          // This is conservative but avoids false positives
          fileNode.exports.forEach(exp => usedExports.add(exp))
        }
      }

      // Find unused exports
      const unusedExports = fileNode.exports.filter(exp => !usedExports.has(exp))
      if (unusedExports.length > 0) {
        graph.unusedExports.set(fileNode.path, unusedExports)

        for (const unusedExport of unusedExports) {
          result.findings.push({
            type: 'deadcode',
            category: 'unused_export',
            severity: 'info',
            description: `Exported symbol '${unusedExport}' appears to be unused`,
            location: fileNode.path,
            context: 'Consider removing unused exports to reduce bundle size',
          })
        }
      }
    }
  }

  private resolvePath(path: string): string {
    // Remove leading ./ and resolve relative paths
    return path.replace(/^\.\//, '')
  }

  /**
   * Map built files back to their source equivalents
   */
  private mapBuildToSource(buildPath: string, fileNodes: TreeNode[]): string | null {
    // Common build path mappings
    const mappings = [
      // dist/cli.js -> src/cli.ts
      { from: /^dist\/(.+)\.js$/, to: 'src/$1.ts' },
      { from: /^dist\/(.+)\.mjs$/, to: 'src/$1.ts' },
      // lib/index.js -> src/index.ts
      { from: /^lib\/(.+)\.js$/, to: 'src/$1.ts' },
      // build/main.js -> src/main.ts
      { from: /^build\/(.+)\.js$/, to: 'src/$1.ts' },
    ]

    for (const mapping of mappings) {
      const match = buildPath.match(mapping.from)
      if (match) {
        const sourcePath = mapping.to.replace('$1', match[1] || '')
        // Check if the source file actually exists
        if (fileNodes.some(node => node.path === sourcePath)) {
          return sourcePath
        }
      }
    }

    return null
  }

  /**
   * Auto-detect frameworks from package.json dependencies
   */
  private detectFrameworks(pkg: any): string[] {
    const frameworks: string[] = []
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    }

    // Framework detection patterns (ordered by priority - more specific frameworks first)
    const frameworkPatterns = [
      { name: 'nuxt', patterns: ['nuxt', '@nuxt/', 'h3', 'ofetch', 'ufo', 'unhead'] }, // Check Nuxt before Vue - include Nuxt 3 packages
      { name: 'nextjs', patterns: ['next', '@next/'] },
      { name: 'gatsby', patterns: ['gatsby', 'gatsby-'] },
      { name: 'remix', patterns: ['@remix-run/', 'remix'] },
      { name: 'astro', patterns: ['astro', '@astrojs/'] },
      { name: 'svelte', patterns: ['svelte', '@sveltejs/', 'kit'] },
      { name: 'vue', patterns: ['vue', '@vue/'] }, // Vue after more specific frameworks
      { name: 'react', patterns: ['react', '@types/react'] },
      { name: 'angular', patterns: ['@angular/', 'ng-'] },
      { name: 'solid', patterns: ['solid-js', '@solidjs/'] },
      { name: 'qwik', patterns: ['@builder.io/qwik'] },
      { name: 'preact', patterns: ['preact', '@preact/'] },
      { name: 'lit', patterns: ['lit', '@lit/'] },
      { name: 'stencil', patterns: ['@stencil/core'] },
      { name: 'nestjs', patterns: ['@nestjs/'] },
      { name: 'express', patterns: ['express', '@types/express'] },
      { name: 'fastify', patterns: ['fastify', '@fastify/'] },
      { name: 'vite', patterns: ['vite', '@vitejs/'] },
      { name: 'webpack', patterns: ['webpack', 'webpack-'] },
      { name: 'rollup', patterns: ['rollup', '@rollup/'] },
      { name: 'parcel', patterns: ['parcel', '@parcel/'] },
      { name: 'esbuild', patterns: ['esbuild'] },
      { name: 'turbo', patterns: ['turbo', '@turbo/'] },
      { name: 'lerna', patterns: ['lerna', '@lerna/'] },
      { name: 'rush', patterns: ['@microsoft/rush'] },
      { name: 'nx', patterns: ['@nx/', 'nx'] },
    ]

    // Debug: Log dependencies for troubleshooting

    // Check each framework pattern in priority order
    for (const { name: framework, patterns } of frameworkPatterns) {
      const isDetected = patterns.some(pattern =>
        Object.keys(allDeps).some(dep =>
          pattern.endsWith('/') ? dep.startsWith(pattern) : dep.includes(pattern),
        ),
      )

      if (isDetected) {
        frameworks.push(framework)
      }
    }

    return frameworks
  }

  /**
   * Check if a file should be ignored from dead code analysis
   */
  private shouldIgnoreFile(filePath: string): boolean {
    // Ignore dot files and folders
    if (filePath.startsWith('.') || filePath.includes('/.')) {
      return true
    }

    // Ignore ALL test files and test directories
    if (filePath.includes('/test/') || filePath.includes('\\test\\')
      || filePath.endsWith('.test.ts') || filePath.endsWith('.test.js')
      || filePath.endsWith('.spec.ts') || filePath.endsWith('.spec.js')
      || filePath.includes('__tests__') || filePath.includes('/tests/')) {
      return true
    }

    // Ignore build/output directories and files
    if (filePath.includes('/dist/') || filePath.includes('/build/')
      || filePath.includes('/out/') || filePath.includes('/lib/')
      || filePath.includes('/coverage/') || filePath.includes('/.next/')
      || filePath.includes('/target/') || filePath.includes('/bin/')
      || filePath.startsWith('dist/') || filePath.startsWith('build/')
      || filePath.startsWith('out/') || filePath.startsWith('lib/')) {
      return true
    }

    // Ignore generated files
    if (filePath.includes('package-lock.json') || filePath.includes('yarn.lock')
      || filePath.includes('pnpm-lock.yaml') || filePath.includes('bun.lockb')) {
      return true
    }

    // Ignore debug/temp scripts
    if (filePath.endsWith('.mjs') && (filePath.includes('debug') || filePath.includes('analyze'))) {
      return true
    }

    // Ignore documentation and markdown files
    if (filePath.endsWith('.md') || filePath.endsWith('.txt')
      || filePath.endsWith('.rst') || filePath.endsWith('.adoc')) {
      return true
    }

    // Ignore common generated/compiled file extensions
    if (filePath.endsWith('.map') || filePath.endsWith('.d.ts.map')
      || filePath.endsWith('.tsbuildinfo')) {
      return true
    }

    return false
  }
}