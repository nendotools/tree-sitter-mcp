/**
 * React and Next.js framework analyzer
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { FrameworkConfig, FrameworkUsageContext } from '../types.js'
import { BaseFrameworkAnalyzer } from './base-framework-analyzer.js'

const NEXTJS_CONFIG: FrameworkConfig = {
  name: 'nextjs',
  indicators: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
  entryPatterns: ['pages/_app', 'app/layout', 'app/page', 'src/pages/_app', 'src/app/layout'],
  conventionDirs: ['pages', 'app', 'components', 'public', 'styles'],
  routingSystem: 'file-based',
  buildTool: 'webpack',
}

const REACT_CONFIG: FrameworkConfig = {
  name: 'react',
  indicators: ['src/App.tsx', 'src/App.jsx', 'public/index.html'],
  entryPatterns: ['src/App', 'src/index', 'src/main'],
  conventionDirs: ['src', 'components', 'hooks', 'context', 'utils', 'services'],
  routingSystem: 'config-based',
  buildTool: 'vite',
}

export class ReactAnalyzer extends BaseFrameworkAnalyzer {
  private isNextJs: boolean

  constructor(fileNodes: TreeNode[]) {
    // Detect if this is Next.js or regular React
    const isNext = NEXTJS_CONFIG.indicators.some(indicator =>
      fileNodes.some(node => node.path.endsWith(indicator)),
    )

    super(isNext ? NEXTJS_CONFIG : REACT_CONFIG)
    this.isNextJs = isNext
  }

  detectUsage(fileNodes: TreeNode[], _context: FrameworkUsageContext): Set<string> {
    const usedFiles = new Set<string>()

    if (this.isNextJs) {
      this.analyzeNextJs(fileNodes, usedFiles)
    }
    else {
      this.analyzeReact(fileNodes, usedFiles)
    }

    return usedFiles
  }

  /**
   * Detects React/Next.js specific entry points
   */
  detectEntryPoints(fileNodes: TreeNode[]): Array<{ path: string, type: 'framework_page' | 'framework_api', source: string }> {
    const entryPoints: Array<{ path: string, type: 'framework_page' | 'framework_api', source: string }> = []

    if (this.isNextJs) {
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
    }
    else {
      for (const node of fileNodes) {
        // Common React entry points
        if (node.path === 'src/main.tsx' || node.path === 'src/main.ts'
          || node.path === 'src/index.tsx' || node.path === 'src/index.ts'
          || node.path === 'src/App.tsx' || node.path === 'src/App.ts') {
          entryPoints.push({
            path: node.path,
            type: 'framework_page',
            source: 'React application entry point',
          })
        }
      }
    }

    return entryPoints
  }

  private analyzeNextJs(fileNodes: TreeNode[], usedFiles: Set<string>): void {
    for (const file of fileNodes) {
      if (!file.content) continue

      // App Router (Next.js 13+)
      if (file.path.includes('/app/') && (
        file.path.endsWith('/page.tsx')
        || file.path.endsWith('/page.jsx')
        || file.path.endsWith('/layout.tsx')
        || file.path.endsWith('/layout.jsx')
        || file.path.endsWith('/loading.tsx')
        || file.path.endsWith('/loading.jsx')
        || file.path.endsWith('/error.tsx')
        || file.path.endsWith('/error.jsx')
        || file.path.endsWith('/not-found.tsx')
        || file.path.endsWith('/not-found.jsx')
      )) {
        usedFiles.add(file.path)
      }

      // Pages Router (Legacy)
      if (file.path.includes('/pages/') && !file.path.includes('/api/')) {
        usedFiles.add(file.path)
      }

      // API Routes
      if (file.path.includes('/api/')) {
        usedFiles.add(file.path)
      }

      // Middleware
      if (file.path.endsWith('middleware.ts') || file.path.endsWith('middleware.js')) {
        usedFiles.add(file.path)
      }

      // Check for JSX/TSX component usage
      this.extractJSXComponents(file.content, file.path, usedFiles)

      // Check for dynamic imports
      this.extractDynamicImports(file.content).forEach((imp) => {
        const resolved = this.resolveImportPath(imp, file.path)
        if (resolved) usedFiles.add(resolved)
      })
    }
  }

  private analyzeReact(fileNodes: TreeNode[], usedFiles: Set<string>): void {
    for (const file of fileNodes) {
      if (!file.content) continue

      // Check for JSX/TSX component usage
      this.extractJSXComponents(file.content, file.path, usedFiles)

      // Check for React Router usage
      this.extractReactRouterComponents(file.content, file.path, usedFiles)

      // Check for dynamic imports
      this.extractDynamicImports(file.content).forEach((imp) => {
        const resolved = this.resolveImportPath(imp, file.path)
        if (resolved) usedFiles.add(resolved)
      })
    }
  }

  private extractJSXComponents(content: string, filePath: string, usedFiles: Set<string>): void {
    // JSX component usage: <ComponentName />
    const jsxComponentRegex = /<([A-Z][a-zA-Z0-9]*)/g
    let match = jsxComponentRegex.exec(content)
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
      match = jsxComponentRegex.exec(content)
    }

    // React.createElement usage
    const createElementRegex = /React\.createElement\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    match = createElementRegex.exec(content)
    while (match) {
      const componentName = match[1]
      if (componentName) {
        const importMatch = content.match(new RegExp(`import\\s+(?:{[^}]*${componentName}[^}]*}|${componentName})\\s+from\\s*['"\`]([^'"\`]+)['"\`]`))
        if (importMatch?.[1]) {
          const resolved = this.resolveImportPath(importMatch[1], filePath)
          if (resolved) usedFiles.add(resolved)
        }
      }
      match = createElementRegex.exec(content)
    }
  }

  private extractReactRouterComponents(content: string, filePath: string, usedFiles: Set<string>): void {
    // React Router component prop: <Route component={ComponentName} />
    const routeComponentRegex = /<Route[^>]+component=\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g
    let match = routeComponentRegex.exec(content)
    while (match) {
      const componentName = match[1]
      if (componentName) {
        const importMatch = content.match(new RegExp(`import\\s+(?:{[^}]*${componentName}[^}]*}|${componentName})\\s+from\\s*['"\`]([^'"\`]+)['"\`]`))
        if (importMatch?.[1]) {
          const resolved = this.resolveImportPath(importMatch[1], filePath)
          if (resolved) usedFiles.add(resolved)
        }
      }
      match = routeComponentRegex.exec(content)
    }
  }

  private hasValidExtension(path: string): boolean {
    return path.endsWith('.js')
      || path.endsWith('.ts')
      || path.endsWith('.jsx')
      || path.endsWith('.tsx')
  }

  private isAppRouterSpecialFile(path: string): boolean {
    return path.endsWith('/page.tsx')
      || path.endsWith('/layout.tsx')
      || path.endsWith('/route.ts')
      || path.endsWith('/page.jsx')
      || path.endsWith('/layout.jsx')
      || path.endsWith('/route.js')
  }
}