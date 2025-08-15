/**
 * Structure Analyzer - Analyzes code structure including dependencies and coupling
 */

import { BaseAnalyzer } from './base-analyzer.js'
import type { TreeNode, AnalysisResult } from '../../../types/index.js'

/**
 * Analyzes code structure including circular dependencies, coupling, and HTML nesting
 */
export class StructureAnalyzer extends BaseAnalyzer {
  async analyze(nodes: TreeNode[], result: AnalysisResult): Promise<void> {
    const fileNodes = this.getFileNodes(nodes)

    if (fileNodes.length === 0) {
      result.metrics.structure = {
        analyzedFiles: 0,
        circularDependencies: 0,
        highCouplingFiles: 0,
        htmlFiles: 0,
        deeplyNestedElements: 0,
        maxNestingDepth: 0,
      }
      return
    }

    const dependencyGraph = this.buildDependencyGraph(fileNodes)
    const circularDeps = this.findCircularDependencies(dependencyGraph)
    const highCouplingFiles = this.findHighCouplingFiles(dependencyGraph)

    const htmlAnalysis = this.analyzeHtmlStructure(fileNodes)

    result.metrics.structure = {
      analyzedFiles: fileNodes.length,
      circularDependencies: circularDeps.length,
      highCouplingFiles: highCouplingFiles.length,
      htmlFiles: htmlAnalysis.htmlFiles,
      deeplyNestedElements: htmlAnalysis.deeplyNestedElements,
      maxNestingDepth: htmlAnalysis.maxNestingDepth,
    }

    this.addStructureFindings(circularDeps, highCouplingFiles, htmlAnalysis, result)
  }

  /**
   * Builds a dependency graph from file nodes
   */
  private buildDependencyGraph(fileNodes: TreeNode[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>()

    for (const fileNode of fileNodes) {
      const filePath = fileNode.path
      const deps: string[] = []

      if (fileNode.content) {
        const importMatches = fileNode.content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g)
        if (importMatches) {
          for (const importMatch of importMatches) {
            const match = importMatch.match(/from\s+['"`]([^'"`]+)['"`]/)
            if (match?.[1]) {
              const importPath = this.resolveImportPath(match[1], filePath, fileNodes)
              if (importPath) {
                deps.push(importPath)
              }
            }
          }
        }

        const requireMatches = fileNode.content.match(/require\(['"`]([^'"`]+)['"`]\)/g)
        if (requireMatches) {
          for (const requireMatch of requireMatches) {
            const match = requireMatch.match(/require\(['"`]([^'"`]+)['"`]\)/)
            if (match?.[1]) {
              const importPath = this.resolveImportPath(match[1], filePath, fileNodes)
              if (importPath) {
                deps.push(importPath)
              }
            }
          }
        }
      }

      dependencies.set(filePath, deps)
    }

    return dependencies
  }

  /**
   * Resolves import path to actual file path
   */
  private resolveImportPath(
    importPath: string,
    currentFile: string,
    fileNodes: TreeNode[],
  ): string | null {
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null
    }

    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'))
    let resolved: string

    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const parts = currentDir.split('/')
      const importParts = importPath.split('/')

      for (const part of importParts) {
        if (part === '..') {
          parts.pop()
        }
        else if (part !== '.') {
          parts.push(part)
        }
      }

      resolved = parts.join('/')
    }
    else {
      resolved = importPath
    }

    const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '/index.js', '/index.ts']

    for (const ext of extensions) {
      const candidate = resolved + ext
      if (fileNodes.some(node => node.path === candidate)) {
        return candidate
      }
    }

    return null
  }

  /**
   * Finds circular dependencies in the dependency graph
   */
  private findCircularDependencies(dependencies: Map<string, string[]>): string[][] {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycles: string[][] = []

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node)
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), node])
        }
        return
      }

      if (visited.has(node)) {
        return
      }

      visited.add(node)
      recursionStack.add(node)

      const deps = dependencies.get(node) || []
      for (const dep of deps) {
        dfs(dep, [...path, node])
      }

      recursionStack.delete(node)
    }

    for (const node of dependencies.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }

    return cycles
  }

  /**
   * Finds files with high coupling (many dependencies)
   */
  private findHighCouplingFiles(dependencies: Map<string, string[]>): string[] {
    const COUPLING_THRESHOLD = 10
    const highCouplingFiles: string[] = []

    for (const [file, deps] of dependencies) {
      if (deps.length > COUPLING_THRESHOLD) {
        highCouplingFiles.push(file)
      }
    }

    return highCouplingFiles
  }

  /**
   * Analyzes HTML structure and nesting depth
   */
  private analyzeHtmlStructure(fileNodes: TreeNode[]): {
    htmlFiles: number
    deeplyNestedElements: number
    maxNestingDepth: number
  } {
    const HTML_EXTENSIONS = ['.html', '.htm', '.vue', '.svelte', '.jsx', '.tsx']
    const DEEP_NESTING_THRESHOLD = 10

    let htmlFiles = 0
    let deeplyNestedElements = 0
    let maxNestingDepth = 0

    for (const fileNode of fileNodes) {
      const isHtmlFile = HTML_EXTENSIONS.some(ext => fileNode.path.endsWith(ext))
      if (!isHtmlFile || !fileNode.content) continue

      htmlFiles++

      const depth = this.calculateMaxNestingDepth(fileNode.content)
      maxNestingDepth = Math.max(maxNestingDepth, depth)

      if (depth > DEEP_NESTING_THRESHOLD) {
        deeplyNestedElements++
      }
    }

    return { htmlFiles, deeplyNestedElements, maxNestingDepth }
  }

  /**
   * Calculates maximum nesting depth in HTML/template content
   */
  private calculateMaxNestingDepth(content: string): number {
    let maxDepth = 0
    let currentDepth = 0
    let inTemplate = false

    const lines = content.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()

      if (trimmedLine.includes('<template')) {
        inTemplate = true
        continue
      }
      if (trimmedLine.includes('</template>')) {
        inTemplate = false
        continue
      }

      if (!inTemplate && (content.includes('<template') || content.includes('<script'))) {
        continue
      }

      if (trimmedLine.startsWith('<!--')
        || trimmedLine.startsWith('//')
        || trimmedLine.startsWith('/*')
        || trimmedLine.includes('<script')
        || trimmedLine.includes('<style')) {
        continue
      }

      const openTags = (trimmedLine.match(/<[^/!][^>]*>/g) || []).length
      const closeTags = (trimmedLine.match(/<\/[^>]+>/g) || []).length
      const selfClosingTags = (trimmedLine.match(/<[^>]*\/>/g) || []).length

      currentDepth += (openTags - selfClosingTags) - closeTags
      maxDepth = Math.max(maxDepth, currentDepth)

      currentDepth = Math.max(0, currentDepth)
    }

    return maxDepth
  }

  /**
   * Adds structure-related findings to the result
   */
  private addStructureFindings(
    circularDeps: string[][],
    highCouplingFiles: string[],
    htmlAnalysis: { htmlFiles: number, deeplyNestedElements: number, maxNestingDepth: number },
    result: AnalysisResult,
  ): void {
    for (const cycle of circularDeps) {
      this.addFinding(result, {
        type: 'structure',
        category: 'circular_dependency',
        severity: 'critical',
        location: cycle[0] || 'unknown',
        description: `Circular dependency detected: ${cycle.join(' → ')}`,
        context: 'Circular dependencies can cause runtime errors and make code difficult to maintain',
      })
    }

    for (const file of highCouplingFiles) {
      this.addFinding(result, {
        type: 'structure',
        category: 'high_coupling',
        severity: 'warning',
        location: file,
        description: `High coupling detected: file has many dependencies`,
        context: 'Consider breaking down large files or reducing coupling',
      })
    }

    if (htmlAnalysis.deeplyNestedElements > 0) {
      this.addFinding(result, {
        type: 'structure',
        category: 'deep_nesting',
        severity: 'warning',
        location: 'HTML/Template files',
        description: `Deep nesting detected (max depth: ${htmlAnalysis.maxNestingDepth})`,
        context: 'Deep nesting can impact performance and maintainability. Consider flattening DOM structure.',
        metrics: { maxDepth: htmlAnalysis.maxNestingDepth },
      })
    }
  }
}