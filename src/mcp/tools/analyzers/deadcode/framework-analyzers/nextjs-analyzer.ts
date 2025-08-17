/**
 * Next.js framework analyzer for dead code detection
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { FrameworkConfig, FrameworkUsageContext } from '../types.js'
import { BaseFrameworkAnalyzer } from './base-framework-analyzer.js'

const NEXTJS_CONFIG: FrameworkConfig = {
  name: 'nextjs',
  indicators: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
  entryPatterns: [
    // App Router patterns
    'app/layout',
    'app/page',
    'app/route',
    'src/app/layout',
    'src/app/page',
    'src/app/route',
    // Pages Router patterns
    'pages/_app',
    'pages/_document',
    'pages/api',
    'src/pages/_app',
    'src/pages/_document',
    'src/pages/api',
  ],
  conventionDirs: ['pages', 'app', 'components', 'public', 'styles', 'api'],
  routingSystem: 'file-based',
  buildTool: 'webpack',
}

export class NextJsAnalyzer extends BaseFrameworkAnalyzer {
  constructor() {
    super(NEXTJS_CONFIG)
  }

  detectUsage(fileNodes: TreeNode[], _context: FrameworkUsageContext): Set<string> {
    const usedFiles = new Set<string>()

    for (const file of fileNodes) {
      if (!file.content) continue

      // App Router (Next.js 13+)
      if (this.isAppRouterFile(file.path)) {
        usedFiles.add(file.path)
      }

      // Pages Router (Legacy)
      if (this.isPagesRouterFile(file.path)) {
        usedFiles.add(file.path)
      }

      // API Routes
      if (this.isApiRoute(file.path)) {
        usedFiles.add(file.path)
      }

      // Middleware
      if (this.isMiddleware(file.path)) {
        usedFiles.add(file.path)
      }

      // Dynamic imports and component usage
      this.extractDynamicImports(file.content).forEach((imp) => {
        const resolved = this.resolveImportPath(imp, file.path)
        if (resolved) usedFiles.add(resolved)
      })
    }

    return usedFiles
  }

  /**
   * Detects Next.js specific entry points
   */
  detectEntryPoints(fileNodes: TreeNode[]): Array<{ path: string, type: 'framework_page' | 'framework_api', source: string }> {
    const entryPoints: Array<{ path: string, type: 'framework_page' | 'framework_api', source: string }> = []

    for (const node of fileNodes) {
      // Next.js pages directory
      if (node.path.includes('/pages/') && this.hasValidExtension(node.path)) {
        entryPoints.push({
          path: node.path,
          type: node.path.includes('/api/') ? 'framework_api' : 'framework_page',
          source: 'Next.js file-based routing',
        })
      }

      // Next.js App Router
      if (node.path.includes('/app/') && this.isAppRouterSpecialFile(node.path)) {
        entryPoints.push({
          path: node.path,
          type: 'framework_page',
          source: 'Next.js App Router',
        })
      }
    }

    return entryPoints
  }

  private isAppRouterFile(path: string): boolean {
    return path.includes('/app/') && (
      path.endsWith('/page.tsx')
      || path.endsWith('/page.jsx')
      || path.endsWith('/layout.tsx')
      || path.endsWith('/layout.jsx')
      || path.endsWith('/loading.tsx')
      || path.endsWith('/loading.jsx')
      || path.endsWith('/error.tsx')
      || path.endsWith('/error.jsx')
      || path.endsWith('/not-found.tsx')
      || path.endsWith('/not-found.jsx')
    )
  }

  private isPagesRouterFile(path: string): boolean {
    return path.includes('/pages/')
      && !path.includes('/api/')
      && this.hasValidExtension(path)
  }

  private isApiRoute(path: string): boolean {
    return path.includes('/api/') && this.hasValidExtension(path)
  }

  private isMiddleware(path: string): boolean {
    return path.endsWith('middleware.ts') || path.endsWith('middleware.js')
  }

  private isAppRouterSpecialFile(path: string): boolean {
    return path.endsWith('/page.tsx')
      || path.endsWith('/layout.tsx')
      || path.endsWith('/route.ts')
      || path.endsWith('/page.jsx')
      || path.endsWith('/layout.jsx')
      || path.endsWith('/route.js')
  }

  private hasValidExtension(path: string): boolean {
    return path.endsWith('.js')
      || path.endsWith('.ts')
      || path.endsWith('.jsx')
      || path.endsWith('.tsx')
  }
}