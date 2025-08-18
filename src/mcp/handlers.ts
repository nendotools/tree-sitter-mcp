/**
 * MCP tool request handlers - simplified from complex handler system
 */

import { analyzeProject } from '../analysis/index.js'
import { searchCode, findUsage } from '../core/search.js'
import { createPersistentManager, getOrCreateProject } from '../project/persistent-manager.js'
import { getLogger } from '../utils/logger.js'
import { handleError } from '../utils/errors.js'
import type { AnalysisOptions } from '../types/analysis.js'
import type { JsonObject, Project } from '../types/core.js'

const mcpPersistentManager = createPersistentManager(10)

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

async function getOrCreateMCPProject(projectId?: string, directory = process.cwd()): Promise<Project> {
  const actualDirectory = projectId && projectId.startsWith('/') ? projectId : directory
  const actualProjectId = projectId && !projectId.startsWith('/') ? projectId : undefined

  return getOrCreateProject(mcpPersistentManager, {
    directory: actualDirectory,
    languages: [],
    autoWatch: true,
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

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

async function handleSearchCode(args: JsonObject): Promise<MCPToolResult> {
  const {
    projectId,
    query,
    maxResults = 20,
    fuzzyThreshold = 30,
    exactMatch = false,
    types = [],
    pathPattern,
  } = args

  if (typeof query !== 'string') {
    throw new Error('Query must be a string')
  }

  try {
    const project = await getOrCreateMCPProject(
      typeof projectId === 'string' ? projectId : undefined,
    )
    const searchNodes = getSearchNodes(project)

    const results = searchCode(query as string, searchNodes, {
      maxResults: Number(maxResults),
      fuzzyThreshold: Number(fuzzyThreshold),
      exactMatch: Boolean(exactMatch),
      types: Array.isArray(types) ? types as string[] : [],
      pathPattern: typeof pathPattern === 'string' ? pathPattern : undefined,
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
    analysisTypes = ['quality'],
    scope = 'project',
    pathPattern,
    maxResults = 20,
  } = args

  const validScopes = ['project', 'file', 'method'] as const

  const analysisTypesArray = Array.isArray(analysisTypes) ? analysisTypes as string[] : ['quality']
  const scopeValue = validScopes.includes(scope as typeof validScopes[number]) ? scope as typeof validScopes[number] : 'project'

  try {
    const project = await getOrCreateMCPProject(
      typeof projectId === 'string' ? projectId : undefined,
    )

    const options: AnalysisOptions = {
      includeQuality: analysisTypesArray.includes('quality'),
      includeDeadcode: analysisTypesArray.includes('deadcode'),
      includeStructure: analysisTypesArray.includes('structure'),
      includeConfigValidation: analysisTypesArray.includes('config-validation'),
      scope: scopeValue,
    }

    const result = await analyzeProject(project.config.directory, options)

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
            scope,
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