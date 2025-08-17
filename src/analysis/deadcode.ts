/**
 * Dead code analysis - preserves sophisticated traversal algorithm
 */

import { extractImports } from '../import/resolver.js'
import { TEST_PATTERNS, isTestFile } from '../constants/index.js'
import { escapeRegExp } from '../utils/string-analysis.js'
import type { Project, TreeNode } from '../types/core.js'
import type { DeadcodeResult, DeadcodeMetrics, Finding } from '../types/analysis.js'

export interface DeadcodeAnalysisResult {
  metrics: DeadcodeMetrics
  findings: Finding[]
}

export function analyzeDeadcode(project: Project): DeadcodeAnalysisResult {
  // Detect entry points
  const entryPoints = detectEntryPoints(project)

  // Build dependency graph
  const dependencyGraph = buildDependencyGraph(project)

  // Traverse from entry points
  const reachable = traverseDependencies(entryPoints, dependencyGraph)

  // Detect framework conventions
  const frameworkFiles = detectFrameworkConventions(project)

  // Find unreachable files and nodes
  const deadcodeResult = findUnreachableCode(project, reachable, frameworkFiles)

  const metrics: DeadcodeMetrics = {
    totalFiles: project.files.size,
    unusedFiles: deadcodeResult.unusedFiles.length,
    unusedFunctions: deadcodeResult.unusedNodes.filter(n => n.type === 'function').length,
    unusedVariables: deadcodeResult.unusedNodes.filter(n => n.type === 'variable').length,
    unusedImports: countUnusedImports(project, deadcodeResult.unusedFiles),
  }

  const findings = generateDeadcodeFindings(deadcodeResult)

  return { metrics, findings }
}

function detectEntryPoints(project: Project): string[] {
  const entryPoints: string[] = []

  // Common entry point patterns
  const entryPatterns = [
    'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts',
    'server.js', 'server.ts', 'cli.js', 'cli.ts',
  ]

  for (const [filePath] of project.files) {
    const fileName = filePath.split('/').pop()?.toLowerCase() || ''

    if (entryPatterns.some(pattern => fileName === pattern || fileName.endsWith(pattern))) {
      entryPoints.push(filePath)
    }

    // Package.json main field
    if (fileName === 'package.json') {
      try {
        const content = project.files.get(filePath)?.content
        if (!content) continue

        const packageJson = JSON.parse(content)
        if (packageJson.main) {
          entryPoints.push(resolveRelativePath(filePath, packageJson.main))
        }
        if (packageJson.bin) {
          if (typeof packageJson.bin === 'string') {
            entryPoints.push(resolveRelativePath(filePath, packageJson.bin))
          }
          else {
            Object.values(packageJson.bin).forEach((binPath) => {
              entryPoints.push(resolveRelativePath(filePath, binPath as string))
            })
          }
        }
      }
      catch {
        // Ignore JSON parse errors
      }
    }

    // Files with process.argv or command line handling
    const fileNode = project.files.get(filePath)
    if (fileNode?.content) {
      if (fileNode.content.includes('process.argv')
        || fileNode.content.includes('commander')
        || fileNode.content.includes('yargs')) {
        entryPoints.push(filePath)
      }
    }
  }

  // If no entry points found, consider all top-level files
  if (entryPoints.length === 0) {
    for (const [filePath] of project.files) {
      const depth = filePath.split('/').length
      if (depth <= 2) { // Root or one level deep
        entryPoints.push(filePath)
      }
    }
  }

  return [...new Set(entryPoints)] // Remove duplicates
}

function buildDependencyGraph(project: Project): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  for (const [filePath, fileNode] of project.files) {
    const dependencies = new Set<string>()

    if (fileNode.content) {
      const imports = extractImports(fileNode.content)

      for (const importPath of imports) {
        // Try to resolve the import to an actual file
        const resolved = resolveImportToFile(importPath, filePath, project)
        if (resolved) {
          dependencies.add(resolved)
        }
      }
    }

    graph.set(filePath, dependencies)
  }

  return graph
}

function traverseDependencies(entryPoints: string[], dependencyGraph: Map<string, Set<string>>): Set<string> {
  const reachable = new Set<string>()
  const visited = new Set<string>()

  function dfs(filePath: string) {
    if (visited.has(filePath)) return
    visited.add(filePath)
    reachable.add(filePath)

    const dependencies = dependencyGraph.get(filePath)
    if (dependencies) {
      for (const dep of dependencies) {
        dfs(dep)
      }
    }
  }

  for (const entryPoint of entryPoints) {
    dfs(entryPoint)
  }

  return reachable
}

function detectFrameworkConventions(project: Project): Set<string> {
  const frameworkFiles = new Set<string>()

  // Next.js conventions
  for (const [filePath] of project.files) {
    if (filePath.includes('/pages/')
      || filePath.includes('/app/')
      || TEST_PATTERNS.NEXT_JS_SPECIAL.some(pattern => filePath.includes(pattern))
      || filePath.includes('/api/')) {
      frameworkFiles.add(filePath)
    }
  }

  // Nuxt conventions
  for (const [filePath] of project.files) {
    if (filePath.includes('/pages/')
      || filePath.includes('/layouts/')
      || filePath.includes('/middleware/')
      || filePath.includes('/plugins/')) {
      frameworkFiles.add(filePath)
    }
  }

  // Vue CLI conventions
  for (const [filePath] of project.files) {
    if (filePath.includes('/src/views/')
      || filePath.includes('/src/components/')
      || filePath.includes('/src/router/')) {
      frameworkFiles.add(filePath)
    }
  }

  // Test files are also framework conventions
  for (const [filePath] of project.files) {
    if (isTestFile(filePath)) {
      frameworkFiles.add(filePath)
    }
  }

  return frameworkFiles
}

function findUnreachableCode(
  project: Project,
  reachable: Set<string>,
  frameworkFiles: Set<string>,
): DeadcodeResult {
  const unusedFiles: string[] = []
  const unusedNodes: TreeNode[] = []

  // Find unused files
  for (const [filePath] of project.files) {
    if (!reachable.has(filePath) && !frameworkFiles.has(filePath)) {
      unusedFiles.push(filePath)
    }
  }

  // Find unused nodes within used files
  for (const [filePath, nodes] of project.nodes) {
    if (reachable.has(filePath)) {
      // File is used, but some functions/variables might not be
      const fileContent = project.files.get(filePath)?.content || ''

      for (const node of nodes) {
        if (node.type === 'function' && node.name) {
          if (!isNodeUsed(node.name, fileContent, project)) {
            unusedNodes.push(node)
          }
        }
      }
    }
  }

  return {
    unusedFiles,
    unusedNodes,
    entryPoints: Array.from(reachable),
    reachableFiles: reachable,
  }
}

function resolveImportToFile(importPath: string, currentFile: string, project: Project): string | null {
  // Simple resolution - in practice, this would use the import resolver
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const dir = currentFile.split('/').slice(0, -1).join('/')
    const resolved = `${dir}/${importPath}`

    // Try different extensions
    const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts']
    for (const ext of extensions) {
      const candidate = resolved + ext
      if (project.files.has(candidate)) {
        return candidate
      }
    }
  }

  return null
}

function resolveRelativePath(basePath: string, relativePath: string): string {
  const baseDir = basePath.split('/').slice(0, -1).join('/')
  return `${baseDir}/${relativePath}`
}

function isNodeUsed(nodeName: string, fileContent: string, _project: Project): boolean {
  // Simple usage detection - check if the name appears elsewhere in the file
  const regex = new RegExp(`\\b${escapeRegExp(nodeName)}\\b`, 'g')
  const matches = fileContent.match(regex)

  // If it appears more than once, it's likely used (definition + usage)
  return (matches?.length || 0) > 1
}

function countUnusedImports(project: Project, unusedFiles: string[]): number {
  let count = 0

  for (const [filePath, fileNode] of project.files) {
    if (!unusedFiles.includes(filePath) && fileNode.content) {
      const imports = extractImports(fileNode.content)
      for (const importPath of imports) {
        const resolved = resolveImportToFile(importPath, filePath, project)
        if (resolved && unusedFiles.includes(resolved)) {
          count++
        }
      }
    }
  }

  return count
}

function generateDeadcodeFindings(result: DeadcodeResult): Finding[] {
  const findings: Finding[] = []

  // Unused files
  for (const filePath of result.unusedFiles) {
    findings.push({
      type: 'deadcode',
      category: 'unused_file',
      severity: 'warning',
      location: filePath,
      description: `File appears to be unused and can potentially be removed`,
      context: 'Verify this file is not referenced by framework conventions or external tools',
    })
  }

  // Unused functions
  for (const node of result.unusedNodes.filter(n => n.type === 'function')) {
    findings.push({
      type: 'deadcode',
      category: 'unused_function',
      severity: 'info',
      location: `${node.path}:${node.startLine || 0}`,
      description: `Function '${node.name}' appears to be unused`,
      context: 'Consider removing if no longer needed',
    })
  }

  return findings
}