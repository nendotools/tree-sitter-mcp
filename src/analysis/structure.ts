/**
 * Structure analysis - analyzes dependencies, coupling, and HTML nesting
 */

import { extractImports } from '../import/resolver.js'
import { MARKUP_EXTENSIONS, FRAMEWORK_EXTENSIONS, HTML_TAGS, NESTING_THRESHOLD, TEMPLATE_PATTERNS } from '../constants/index.js'
import type { TreeNode } from '../types/core.js'
import type { Finding, StructureMetrics } from '../types/analysis.js'

export interface StructureAnalysisResult {
  metrics: StructureMetrics
  findings: Finding[]
}

export function analyzeStructure(nodes: TreeNode[]): StructureAnalysisResult {
  const fileNodes = nodes.filter(node => node.type === 'file')

  if (fileNodes.length === 0) {
    return {
      metrics: {
        analyzedFiles: 0,
        circularDependencies: 0,
        highCouplingFiles: 0,
        htmlFiles: 0,
        deeplyNestedElements: 0,
        maxNestingDepth: 0,
      },
      findings: [],
    }
  }

  const dependencyGraph = buildDependencyGraph(fileNodes)
  const circularDeps = findCircularDependencies(dependencyGraph)
  const highCouplingFiles = findHighCouplingFiles(dependencyGraph)
  const htmlAnalysis = analyzeHtmlStructure(fileNodes)

  const metrics: StructureMetrics = {
    analyzedFiles: fileNodes.length,
    circularDependencies: circularDeps.length,
    highCouplingFiles: highCouplingFiles.length,
    htmlFiles: htmlAnalysis.htmlFiles,
    deeplyNestedElements: htmlAnalysis.deeplyNestedElements,
    maxNestingDepth: htmlAnalysis.maxNestingDepth,
  }

  const findings = generateStructureFindings(circularDeps, highCouplingFiles, htmlAnalysis)

  return { metrics, findings }
}

function buildDependencyGraph(fileNodes: TreeNode[]): Map<string, string[]> {
  const dependencies = new Map<string, string[]>()

  for (const fileNode of fileNodes) {
    const filePath = fileNode.path
    const deps: string[] = []

    if (fileNode.content) {
      const imports = extractImports(fileNode.content)

      for (const importPath of imports) {
        const resolved = resolveImportPath(importPath, filePath, fileNodes)
        if (resolved) {
          deps.push(resolved)
        }
      }
    }

    dependencies.set(filePath, deps)
  }

  return dependencies
}

function resolveImportPath(importPath: string, currentFile: string, fileNodes: TreeNode[]): string | null {
  // Only resolve relative imports for circular dependency detection
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

function findCircularDependencies(dependencies: Map<string, string[]>): string[][] {
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

function findHighCouplingFiles(dependencies: Map<string, string[]>): string[] {
  const COUPLING_THRESHOLD = 10
  const highCouplingFiles: string[] = []

  for (const [file, deps] of dependencies) {
    if (deps.length > COUPLING_THRESHOLD) {
      highCouplingFiles.push(file)
    }
  }

  return highCouplingFiles
}

function analyzeHtmlStructure(fileNodes: TreeNode[]): {
  htmlFiles: number
  deeplyNestedElements: number
  maxNestingDepth: number
} {
  const HTML_EXTENSIONS = [...MARKUP_EXTENSIONS.HTML, ...FRAMEWORK_EXTENSIONS.VUE, ...FRAMEWORK_EXTENSIONS.SVELTE, ...FRAMEWORK_EXTENSIONS.REACT_JSX, ...FRAMEWORK_EXTENSIONS.REACT_TSX]
  const DEEP_NESTING_THRESHOLD = NESTING_THRESHOLD.VERY_DEEP

  let htmlFiles = 0
  let deeplyNestedElements = 0
  let maxNestingDepth = 0

  for (const fileNode of fileNodes) {
    const isHtmlFile = HTML_EXTENSIONS.some(ext => fileNode.path.endsWith(ext))
    if (!isHtmlFile || !fileNode.content) continue

    htmlFiles++

    const depth = calculateMaxNestingDepth(fileNode.content)
    maxNestingDepth = Math.max(maxNestingDepth, depth)

    if (depth > DEEP_NESTING_THRESHOLD) {
      deeplyNestedElements++
    }
  }

  return { htmlFiles, deeplyNestedElements, maxNestingDepth }
}

function calculateMaxNestingDepth(content: string): number {
  let maxDepth = 0
  let currentDepth = 0
  let inTemplate = false

  const lines = content.split('\n')
  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.includes(HTML_TAGS.TEMPLATE)) {
      inTemplate = true
      continue
    }
    if (trimmedLine.includes(HTML_TAGS.TEMPLATE_CLOSE)) {
      inTemplate = false
      continue
    }

    if (!inTemplate && (content.includes(HTML_TAGS.TEMPLATE) || content.includes(HTML_TAGS.SCRIPT))) {
      continue
    }

    if (trimmedLine.startsWith(HTML_TAGS.COMMENT_START)
      || trimmedLine.startsWith(HTML_TAGS.COMMENT_SINGLE)
      || trimmedLine.startsWith(HTML_TAGS.COMMENT_MULTI_START)
      || trimmedLine.includes(HTML_TAGS.SCRIPT)
      || trimmedLine.includes(HTML_TAGS.STYLE)) {
      continue
    }

    const openTags = (trimmedLine.match(TEMPLATE_PATTERNS.OPEN_TAG) || []).length
    const closeTags = (trimmedLine.match(TEMPLATE_PATTERNS.CLOSE_TAG) || []).length
    const selfClosingTags = (trimmedLine.match(TEMPLATE_PATTERNS.SELF_CLOSING) || []).length

    currentDepth += (openTags - selfClosingTags) - closeTags
    maxDepth = Math.max(maxDepth, currentDepth)

    currentDepth = Math.max(0, currentDepth)
  }

  return maxDepth
}

function generateStructureFindings(
  circularDeps: string[][],
  highCouplingFiles: string[],
  htmlAnalysis: { htmlFiles: number, deeplyNestedElements: number, maxNestingDepth: number },
): Finding[] {
  const findings: Finding[] = []

  for (const cycle of circularDeps) {
    findings.push({
      type: 'structure',
      category: 'circular_dependency',
      severity: 'critical',
      location: cycle[0] || 'unknown',
      description: `Circular dependency detected: ${cycle.join(' → ')}`,
      context: 'Circular dependencies can cause runtime errors and make code difficult to maintain',
    })
  }

  for (const file of highCouplingFiles) {
    findings.push({
      type: 'structure',
      category: 'high_coupling',
      severity: 'warning',
      location: file,
      description: 'High coupling detected: file has many dependencies',
      context: 'Consider breaking down large files or reducing coupling',
    })
  }

  if (htmlAnalysis.deeplyNestedElements > 0) {
    findings.push({
      type: 'structure',
      category: 'deep_nesting',
      severity: 'warning',
      location: 'HTML/Template files',
      description: `Deep nesting detected (max depth: ${htmlAnalysis.maxNestingDepth})`,
      context: 'Deep nesting can impact performance and maintainability. Consider flattening DOM structure.',
      metrics: { maxDepth: htmlAnalysis.maxNestingDepth },
    })
  }

  return findings
}