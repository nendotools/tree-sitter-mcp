/**
 * MCP tool request handlers - simplified from complex handler system
 */

import { analyzeProject } from '../analysis/index.js'
import { analyzeErrors } from '../analysis/errors.js'
import { searchCode, findUsage } from '../core/search.js'
import { createPersistentManager, getOrCreateProject } from '../project/persistent-manager.js'
import { getLogger } from '../utils/logger.js'
import { handleError } from '../utils/errors.js'
import type { AnalysisOptions } from '../types/analysis.js'
import type { JsonObject, Project } from '../types/core.js'

const mcpPersistentManager = createPersistentManager(10)

// Export function for test cleanup
export function clearMCPMemory(): void {
  // Stop all watchers first
  for (const stopWatcher of mcpPersistentManager.watchers.values()) {
    stopWatcher()
  }
  mcpPersistentManager.watchers.clear()

  // Clear all projects from memory
  mcpPersistentManager.memory.projects.clear()
  mcpPersistentManager.directoryToProject.clear()
  mcpPersistentManager.projectToDirectory.clear()

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
}

interface MCPToolParams {
  name: string
  arguments?: JsonObject
}

interface MCPToolRequest {
  params: MCPToolParams
}

interface MCPToolResult {
  content: Array<{
    type: 'text'
    text: string
  }>
  [key: string]: unknown
}

async function getOrCreateMCPProject(projectId?: string, directory?: string): Promise<Project> {
  const actualDirectory = directory || (projectId && projectId.startsWith('/') ? projectId : process.cwd())
  const actualProjectId = projectId && !projectId.startsWith('/') ? projectId : undefined

  return getOrCreateProject(mcpPersistentManager, {
    directory: actualDirectory,
    languages: [],
    autoWatch: process.env.NODE_ENV !== 'test',
  }, actualProjectId)
}

function getSearchNodes(project: Project) {
  const allNodes = Array.from(project.files.values())
  const elementNodes = Array.from(project.nodes.values()).flat()
  return [...allNodes, ...elementNodes]
}

export async function handleToolRequest(request: MCPToolRequest): Promise<MCPToolResult> {
  const { name, arguments: args = {} } = request.params
  const logger = getLogger()

  logger.debug(`Handling tool request: ${name}`)

  switch (name) {
    case 'search_code':
      return handleSearchCode(args)

    case 'find_usage':
      return handleFindUsage(args)

    case 'analyze_code':
      return handleAnalyzeCode(args)

    case 'check_errors':
      return handleCheckErrors(args)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

async function handleSearchCode(args: JsonObject): Promise<MCPToolResult> {
  const {
    projectId,
    directory,
    query,
    maxResults = 20,
    fuzzyThreshold = 30,
    exactMatch = false,
    types = [],
    pathPattern,
    // New content inclusion options
    forceContentInclusion = false,
    maxContentLines = 150,
    disableContentInclusion = false,
  } = args

  if (typeof query !== 'string') {
    throw new Error('Query must be a string')
  }

  try {
    const project = await getOrCreateMCPProject(
      typeof projectId === 'string' ? projectId : undefined,
      typeof directory === 'string' ? directory : undefined,
    )
    const searchNodes = getSearchNodes(project)

    const results = searchCode(query as string, searchNodes, {
      maxResults: Number(maxResults),
      fuzzyThreshold: Number(fuzzyThreshold),
      exactMatch: Boolean(exactMatch),
      types: Array.isArray(types) ? types as string[] : [],
      pathPattern: typeof pathPattern === 'string' ? pathPattern : undefined,
      // New content inclusion options
      forceContentInclusion: Boolean(forceContentInclusion),
      maxContentLines: Number(maxContentLines),
      disableContentInclusion: Boolean(disableContentInclusion),
    })

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          projectId: project.id,
          query,
          results: results.map(r => ({
            name: r.node.name,
            type: r.node.type,
            path: r.node.path,
            startLine: r.node.startLine,
            endLine: r.node.endLine,
            startColumn: r.node.startColumn,
            endColumn: r.node.endColumn,
            score: r.score,
            matches: r.matches,
            // New content inclusion fields
            contentIncluded: r.contentIncluded,
            content: r.content,
            contentTruncated: r.contentTruncated,
            contentLines: r.contentLines,
          })),
          totalResults: results.length,
        }, null, 2),
      }],
    }
  }
  catch (error) {
    throw handleError(error, 'Search code failed')
  }
}

async function handleFindUsage(args: JsonObject): Promise<MCPToolResult> {
  const {
    projectId,
    directory,
    identifier,
    caseSensitive = false,
    exactMatch = true,
    maxResults = 50,
    pathPattern,
  } = args

  if (typeof identifier !== 'string') {
    throw new Error('Identifier must be a string')
  }

  try {
    const project = await getOrCreateMCPProject(
      typeof projectId === 'string' ? projectId : undefined,
      typeof directory === 'string' ? directory : undefined,
    )
    const searchNodes = getSearchNodes(project)

    const results = findUsage(identifier, searchNodes, {
      caseSensitive: Boolean(caseSensitive),
      exactMatch: Boolean(exactMatch),
      pathPattern: typeof pathPattern === 'string' ? pathPattern : undefined,
    })

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          projectId: project.id,
          identifier,
          usages: results.slice(0, Number(maxResults)).map(result => ({
            path: result.node.path,
            startLine: result.startLine,
            endLine: result.endLine,
            startColumn: result.startColumn,
            endColumn: result.endColumn,
            type: result.node.type,
            name: result.node.name,
            context: result.context,
          })),
          totalUsages: results.length,
        }, null, 2),
      }],
    }
  }
  catch (error) {
    throw handleError(error, 'Find usage failed')
  }
}

async function handleAnalyzeCode(args: JsonObject): Promise<MCPToolResult> {
  const {
    projectId,
    directory,
    analysisTypes = ['quality'],
    pathPattern,
    maxResults = 20,
  } = args

  const analysisTypesArray = Array.isArray(analysisTypes) ? analysisTypes as string[] : ['quality']

  try {
    const project = await getOrCreateMCPProject(
      typeof projectId === 'string' ? projectId : undefined,
      typeof directory === 'string' ? directory : undefined,
    )

    const options: AnalysisOptions = {
      includeQuality: analysisTypesArray.includes('quality'),
      includeDeadcode: analysisTypesArray.includes('deadcode'),
      includeStructure: analysisTypesArray.includes('structure'),
      includeSyntax: analysisTypesArray.includes('syntax'),
    }

    const result = await analyzeProject(project, options)

    let filteredFindings = result.findings
    if (typeof pathPattern === 'string') {
      filteredFindings = result.findings.filter(finding =>
        finding.location.includes(pathPattern),
      )
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 }
    filteredFindings.sort((a, b) => {
      const aOrder = severityOrder[a.severity] ?? 3
      const bOrder = severityOrder[b.severity] ?? 3
      return aOrder - bOrder
    })

    const limitedFindings = filteredFindings.slice(0, Number(maxResults))

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          analysis: {
            ...result,
            findings: limitedFindings,
            timestamp: new Date().toISOString(),
            projectId: project.id,
            directory: project.config.directory,
            analysisTypes,
            pathPattern: typeof pathPattern === 'string' ? pathPattern : undefined,
            maxResults: Number(maxResults),
            totalFindings: result.findings.length,
            filteredFindings: limitedFindings.length,
          },
        }, null, 2),
      }],
    }
  }
  catch (error) {
    throw handleError(error, 'Code analysis failed')
  }
}

async function handleCheckErrors(args: JsonObject): Promise<MCPToolResult> {
  const {
    projectId,
    directory,
    pathPattern,
    maxResults = 50,
  } = args

  try {
    const project = await getOrCreateMCPProject(
      typeof projectId === 'string' ? projectId : undefined,
      typeof directory === 'string' ? directory : undefined,
    )

    const result = analyzeErrors(project)

    let filteredErrors = result.errors
    if (typeof pathPattern === 'string') {
      filteredErrors = result.errors.filter(error =>
        error.file.includes(pathPattern),
      )
    }

    const limitedErrors = filteredErrors.slice(0, Number(maxResults))

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          errors: {
            errors: limitedErrors,
            summary: result.summary,
            metrics: result.metrics,
            timestamp: new Date().toISOString(),
            projectId: project.id,
            directory: project.config.directory,
            pathPattern: typeof pathPattern === 'string' ? pathPattern : undefined,
            maxResults: Number(maxResults),
            totalErrors: result.errors.length,
            filteredErrors: limitedErrors.length,
          },
        }, null, 2),
      }],
    }
  }
  catch (error) {
    throw handleError(error, 'Error analysis failed')
  }
}