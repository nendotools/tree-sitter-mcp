/**
 * Svelte/SvelteKit framework analyzer for dead code detection
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { FrameworkConfig, FrameworkUsageContext } from '../types.js'
import { BaseFrameworkAnalyzer } from './base-framework-analyzer.js'

const SVELTE_CONFIG: FrameworkConfig = {
  name: 'svelte',
  indicators: ['svelte.config.js', 'vite.config.js', 'src/app.html'],
  entryPatterns: [
    'src/app.html',
    'src/main.js',
    'src/routes',
  ],
  conventionDirs: ['src', 'routes', 'lib', 'components'],
  routingSystem: 'file-based',
  buildTool: 'vite',
}

export class SvelteAnalyzer extends BaseFrameworkAnalyzer {
  constructor() {
    super(SVELTE_CONFIG)
  }

  detectUsage(fileNodes: TreeNode[], _context: FrameworkUsageContext): Set<string> {
    const usedFiles = new Set<string>()

    for (const file of fileNodes) {
      if (!file.content) continue

      // Svelte components and app files
      if (this.isSvelteFile(file.path) || this.isAppFile(file.path)) {
        usedFiles.add(file.path)
      }

      // SvelteKit routes
      if (this.isSvelteKitRoute(file.path)) {
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
   * Detects Svelte/SvelteKit specific entry points
   */
  detectEntryPoints(fileNodes: TreeNode[]): Array<{ path: string, type: 'framework_page', source: string }> {
    const entryPoints: Array<{ path: string, type: 'framework_page', source: string }> = []

    for (const node of fileNodes) {
      if (node.path === 'src/app.html'
        || node.path === 'src/main.js'
        || (node.path.includes('/routes/') && node.path.endsWith('.svelte'))) {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Svelte application entry point',
        })
      }
    }

    return entryPoints
  }

  private isSvelteFile(path: string): boolean {
    return path.endsWith('.svelte')
  }

  private isAppFile(path: string): boolean {
    return path === 'src/app.html' || path === 'src/main.js'
  }

  private isSvelteKitRoute(path: string): boolean {
    return path.includes('/routes/') && path.endsWith('.svelte')
  }
}