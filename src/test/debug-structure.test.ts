/**
 * Debug test for structure analyzer specifically
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

describe('Debug Structure Analyzer', () => {
  let treeManager: TreeManager
  const projectId = 'debug-structure-project'
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

  it('should examine file node structure', async () => {
    const project = treeManager.getProject(projectId)
    expect(project).toBeDefined()

    // Look at file nodes specifically
    const fileNodes = []
    for (const fileNode of project!.fileIndex.values()) {
      fileNodes.push(fileNode)
    }

    console.log('File nodes found:', fileNodes.length)

    for (const fileNode of fileNodes) {
      console.log('File node:', {
        type: fileNode.type,
        name: fileNode.name,
        path: fileNode.path,
        hasContent: !!fileNode.content,
        contentLength: fileNode.content?.length || 0,
        firstLineOfContent: fileNode.content?.split('\n')[0],
      })
    }

    // Look for circular dependencies specifically
    const circularA = fileNodes.find(f => f.path?.includes('circular-deps.ts'))
    const circularB = fileNodes.find(f => f.path?.includes('circular-b.ts'))

    if (circularA) {
      console.log('CircularA file content snippet:', circularA.content?.substring(0, 200))
    }
    if (circularB) {
      console.log('CircularB file content snippet:', circularB.content?.substring(0, 200))
    }

    expect(fileNodes.length).toBeGreaterThan(0)
  })

  it('should run structure analysis', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['structure'],
      scope: 'project',
    }, treeManager)

    console.log('Structure analysis result:', result.text)

    expect(result.type).toBe('text')
  })
})