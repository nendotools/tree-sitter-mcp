/**
 * Nuxt.js framework analyzer for dead code detection
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { FrameworkConfig, FrameworkUsageContext } from '../types.js'
import { BaseFrameworkAnalyzer } from './base-framework-analyzer.js'

const NUXT_CONFIG: FrameworkConfig = {
  name: 'nuxt',
  indicators: ['nuxt.config.js', 'nuxt.config.ts', 'nuxt.config.mjs'],
  entryPatterns: [
    'pages',
    'layouts',
    'middleware',
    'plugins',
    'composables',
    'server/api',
    'app.vue',
  ],
  conventionDirs: ['pages', 'layouts', 'middleware', 'plugins', 'composables', 'server', 'components'],
  routingSystem: 'file-based',
  buildTool: 'vite',
}

export class NuxtAnalyzer extends BaseFrameworkAnalyzer {
  constructor() {
    super(NUXT_CONFIG)
  }

  detectUsage(fileNodes: TreeNode[], _context: FrameworkUsageContext): Set<string> {
    const usedFiles = new Set<string>()

    // Parse Nuxt config to get custom directories
    const nuxtConfig = this.parseNuxtConfig(fileNodes)

    for (const file of fileNodes) {
      if (!file.content) continue

      // Nuxt convention directories
      if (this.isInNuxtConventionDirectory(file.path, nuxtConfig)) {
        usedFiles.add(file.path)
      }

      // App.vue entry point
      if (this.isAppVue(file.path)) {
        usedFiles.add(file.path)
      }

      // Check for dynamic imports
      this.extractDynamicImports(file.content).forEach((imp) => {
        const resolved = this.resolveImportPath(imp, file.path)
        if (resolved) usedFiles.add(resolved)
      })
    }

    return usedFiles
  }

  /**
   * Detects Nuxt.js specific entry points using config-aware directories
   */
  detectEntryPoints(fileNodes: TreeNode[], frameworkConfigs?: Record<string, any>): Array<{ path: string, type: 'framework_page' | 'framework_api' | 'config_file', source: string }> {
    const entryPoints: Array<{ path: string, type: 'framework_page' | 'framework_api' | 'config_file', source: string }> = []

    // Get Nuxt config or use defaults
    const nuxtConfig = frameworkConfigs?.nuxt || this.parseNuxtConfig(fileNodes)
    const dirs = nuxtConfig?.dirs || {
      pages: 'pages',
      layouts: 'layouts',
      middleware: 'middleware',
      plugins: 'plugins',
      composables: 'composables',
      serverApi: 'server/api',
    }

    for (const node of fileNodes) {
      // Pages (file-based routing)
      if (node.path.includes(`/${dirs.pages}/`) && this.hasValidVueExtension(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Nuxt.js file-based routing',
        })
      }

      // Layouts
      if (node.path.includes(`/${dirs.layouts}/`) && this.hasValidVueExtension(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Nuxt.js layout',
        })
      }

      // Plugins
      if (node.path.includes(`/${dirs.plugins}/`) && this.hasValidExtension(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Nuxt.js plugin',
        })
      }

      // Middleware
      if (node.path.includes(`/${dirs.middleware}/`) && this.hasValidTsExtension(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Nuxt.js middleware',
        })
      }

      // Composables (auto-imported)
      if (node.path.includes(`/${dirs.composables}/`) && this.hasValidTsExtension(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Nuxt.js composable (auto-imported)',
        })
      }

      // Server API routes
      if (node.path.includes(`/${dirs.serverApi}/`) && this.hasValidTsExtension(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'framework_api',
          source: 'Nuxt.js server API route',
        })
      }

      // App.vue
      if (this.isAppVue(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Nuxt.js App.vue entry point',
        })
      }

      // Nuxt config
      if (this.isNuxtConfig(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'config_file',
          source: 'Nuxt.js configuration',
        })
      }
    }

    return entryPoints
  }

  private parseNuxtConfig(fileNodes: TreeNode[]): any {
    const nuxtConfigFile = fileNodes.find(node =>
      node.path.endsWith('/nuxt.config.js')
      || node.path.endsWith('/nuxt.config.ts')
      || node.path === 'nuxt.config.js'
      || node.path === 'nuxt.config.ts',
    )

    if (!nuxtConfigFile?.content) {
      return {}
    }

    try {
      // Basic parsing - extract dir configurations
      const content = nuxtConfigFile.content
      const dirMatches = content.match(/dir\s*:\s*{([^}]+)}/s)
      if (dirMatches?.[1]) {
        const dirConfig: Record<string, string> = {}
        const assignments = dirMatches[1].match(/(\w+)\s*:\s*['"`]([^'"`]+)['"`]/g)
        if (assignments) {
          for (const assignment of assignments) {
            const match = assignment.match(/(\w+)\s*:\s*['"`]([^'"`]+)['"`]/)
            if (match && match[1] && match[2]) {
              dirConfig[match[1]] = match[2]
            }
          }
        }
        return { dirs: dirConfig }
      }
    }
    catch {
      // Ignore parsing errors, use defaults
    }

    return {}
  }

  private isInNuxtConventionDirectory(path: string, config: any): boolean {
    const dirs = config?.dirs || this.config.conventionDirs
    return Object.values(dirs).some((dir: any) =>
      path.includes(`/${dir}/`) || path.startsWith(`${dir}/`),
    )
  }

  private isAppVue(path: string): boolean {
    return path.endsWith('/app.vue') || path === 'app.vue'
  }

  private isNuxtConfig(path: string): boolean {
    return path.endsWith('/nuxt.config.ts')
      || path.endsWith('/nuxt.config.js')
      || path === 'nuxt.config.ts'
      || path === 'nuxt.config.js'
  }

  private hasValidVueExtension(path: string): boolean {
    return path.endsWith('.vue')
      || path.endsWith('.ts')
      || path.endsWith('.js')
  }

  private hasValidExtension(path: string): boolean {
    return path.endsWith('.ts')
      || path.endsWith('.js')
      || path.endsWith('.vue')
  }

  private hasValidTsExtension(path: string): boolean {
    return path.endsWith('.ts') || path.endsWith('.js')
  }
}