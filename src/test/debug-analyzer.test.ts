/**
 * Debug test to understand why analyzers aren't detecting issues
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TreeManager } from '../core/tree-manager.js'
import { analyzeCode } from '../mcp/tools/analyze-code.js'
import { getParserRegistry } from '../parsers/registry.js'
import type { Config } from '../types/index.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Debug Analyzer Tests', () => {
  let treeManager: TreeManager
  const projectId = 'debug-project'
  const fixturesPath = path.join(__dirname, 'fixtures', 'quality-issues')

  beforeAll(async () => {
    treeManager = new TreeManager(getParserRegistry())

    const config: Config = {
      workingDir: fixturesPath,
      languages: ['typescript', 'html', 'json'],
      maxDepth: 5,
      ignoreDirs: ['node_modules', '.git'],
    }

    treeManager.createProject(projectId, config)
    await treeManager.initializeProject(projectId)
  })

  afterAll(async () => {
    try {
      treeManager.destroyProject(projectId)
    }
    catch {
      // Project may already be destroyed
    }
  })

  it('should debug node types and content', async () => {
    const project = treeManager.getProject(projectId)
    expect(project).toBeDefined()

    const allNodes: any[] = []
    // Get all parsed nodes from the node index (same as analyze-code.ts)
    for (const nodes of project!.nodeIndex.values()) {
      allNodes.push(...nodes)
    }
    // Also get all file nodes from the file index
    for (const fileNode of project!.fileIndex.values()) {
      allNodes.push(fileNode)
    }

    // Log node types and counts
    const nodeTypes = new Map<string, number>()
    const functionNodes = []
    const methodNodes = []

    for (const node of allNodes) {
      const count = nodeTypes.get(node.type) || 0
      nodeTypes.set(node.type, count + 1)

      if (node.type === 'function') {
        functionNodes.push(node)
      }
      if (node.type === 'method') {
        methodNodes.push(node)
      }
    }

    console.log('Node types found:', Object.fromEntries(nodeTypes))
    console.log('Function nodes:', functionNodes.length)
    console.log('Method nodes:', methodNodes.length)

    // Look at specific complex function
    const complexFunction = allNodes.find(node =>
      node.name === 'processComplexLogic'
      || node.text?.includes('processComplexLogic'),
    )

    if (complexFunction) {
      console.log('Complex function found:', {
        type: complexFunction.type,
        name: complexFunction.name,
        text: complexFunction.text?.substring(0, 100) + '...',
      })
    }
    else {
      console.log('Complex function NOT found')
      // Log all node names to see what we have
      const nodeNames = allNodes
        .filter(node => node.name)
        .map(node => ({ type: node.type, name: node.name }))
      console.log('All named nodes:', nodeNames)
    }

    expect(allNodes.length).toBeGreaterThan(0)
  })

  it('should run quality analysis and log results', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['quality'],
      scope: 'project',
    }, treeManager)

    console.log('Analysis result:', result.text)

    expect(result.type).toBe('text')
  })
})