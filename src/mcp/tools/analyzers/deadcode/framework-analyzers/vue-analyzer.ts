/**
 * Vue.js framework analyzer for dead code detection
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { FrameworkConfig, FrameworkUsageContext } from '../types.js'
import { BaseFrameworkAnalyzer } from './base-framework-analyzer.js'

const VUE_CONFIG: FrameworkConfig = {
  name: 'vue',
  indicators: ['vue.config.js', 'vite.config.js', 'src/App.vue'],
  entryPatterns: [
    'src/main',
    'src/App.vue',
    'src/app.vue',
  ],
  conventionDirs: ['src', 'components', 'views', 'router', 'store', 'composables'],
  routingSystem: 'config-based',
  buildTool: 'vite',
}

export class VueAnalyzer extends BaseFrameworkAnalyzer {
  constructor() {
    super(VUE_CONFIG)
  }

  detectUsage(fileNodes: TreeNode[], _context: FrameworkUsageContext): Set<string> {
    const usedFiles = new Set<string>()

    for (const file of fileNodes) {
      if (!file.content) continue

      // Vue components and main files
      if (this.isVueFile(file.path) || this.isMainFile(file.path)) {
        usedFiles.add(file.path)
      }

      // Extract component imports from Vue files
      if (file.path.endsWith('.vue')) {
        this.extractVueComponentImports(file.content, file.path, usedFiles)
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
   * Detects Vue.js specific entry points
   */
  detectEntryPoints(fileNodes: TreeNode[]): Array<{ path: string, type: 'framework_page', source: string }> {
    const entryPoints: Array<{ path: string, type: 'framework_page', source: string }> = []

    for (const node of fileNodes) {
      if (node.path === 'src/main.js'
        || node.path === 'src/main.ts'
        || node.path === 'src/App.vue') {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Vue.js application entry point',
        })
      }
    }

    return entryPoints
  }

  private isVueFile(path: string): boolean {
    return path.endsWith('.vue')
  }

  private isMainFile(path: string): boolean {
    return path === 'src/main.js'
      || path === 'src/main.ts'
      || path === 'src/App.vue'
  }

  private extractVueComponentImports(content: string, filePath: string, usedFiles: Set<string>): void {
    // Vue component imports in <script> sections
    const importRegex = /import\s+(?:{[^}]*}|[a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"`]([^'"`]+)['"`]/g
    let match = importRegex.exec(content)

    while (match) {
      const importPath = match[1]
      if (importPath) {
        const resolved = this.resolveImportPath(importPath, filePath)
        if (resolved) usedFiles.add(resolved)
      }
      match = importRegex.exec(content)
    }

    // Vue template component usage
    const componentRegex = /<([A-Z][a-zA-Z0-9]*)/g
    match = componentRegex.exec(content)

    while (match) {
      const componentName = match[1]
      if (componentName) {
        // Try to find the component import
        const importMatch = content.match(new RegExp(`import\\s+(?:{[^}]*${componentName}[^}]*}|${componentName})\\s+from\\s*['"\`]([^'"\`]+)['"\`]`))
        if (importMatch?.[1]) {
          const resolved = this.resolveImportPath(importMatch[1], filePath)
          if (resolved) usedFiles.add(resolved)
        }
      }
      match = componentRegex.exec(content)
    }
  }
}