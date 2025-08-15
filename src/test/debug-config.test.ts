/**
 * Debug test for config analyzer specifically
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

describe('Debug Config Analyzer', () => {
  let treeManager: TreeManager
  const projectId = 'debug-config-project'
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

  it('should examine files and look for config files', async () => {
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
        language: fileNode.language,
        hasContent: !!fileNode.content,
        contentLength: fileNode.content?.length || 0,
      })
    }

    // Look for package.json specifically
    const packageJson = fileNodes.find(f => f.path?.includes('package.json'))

    if (packageJson) {
      console.log('Package.json found:', {
        path: packageJson.path,
        hasContent: !!packageJson.content,
        content: packageJson.content?.substring(0, 200) + '...',
      })
    }
    else {
      console.log('Package.json NOT found')
    }

    expect(fileNodes.length).toBeGreaterThan(0)
  })

  it('should run config analysis', async () => {
    const result = await analyzeCode({
      projectId,
      analysisTypes: ['config-validation'],
      scope: 'project',
    }, treeManager)

    console.log('Config analysis result:', result.text)

    expect(result.type).toBe('text')
  })
})