/**
 * MCP tool request handlers - simplified from complex handler system
 */

import { analyzeProject } from '../analysis/index.js'
import { createProject, parseProject } from '../project/manager.js'
import { searchCode, findUsage } from '../core/search.js'
import { getLogger } from '../utils/logger.js'
import { handleError } from '../utils/errors.js'
import type { AnalysisOptions } from '../types/analysis.js'
import type { JsonObject } from '../types/core.js'

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

async function createTempProject(directory = process.cwd()) {
  const project = createProject({
    directory,
    languages: [],
  })
  await parseProject(project)
  return project
}

function getSearchNodes(project: ReturnType<typeof createProject>) {
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
    const project = await createTempProject()
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
    identifier,
    caseSensitive = false,
    exactMatch = true,
    maxResults = 50,
  } = args

  if (typeof identifier !== 'string') {
    throw new Error('Identifier must be a string')
  }

  try {
    const project = await createTempProject()
    const searchNodes = getSearchNodes(project)

    const results = findUsage(identifier, searchNodes, {
      caseSensitive: Boolean(caseSensitive),
      exactMatch: Boolean(exactMatch),
    })

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
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
  } = args

  const validScopes = ['project', 'file', 'method'] as const

  const analysisTypesArray = Array.isArray(analysisTypes) ? analysisTypes as string[] : ['quality']
  const scopeValue = validScopes.includes(scope as typeof validScopes[number]) ? scope as typeof validScopes[number] : 'project'

  try {
    const options: AnalysisOptions = {
      includeQuality: analysisTypesArray.includes('quality'),
      includeDeadcode: analysisTypesArray.includes('deadcode'),
      includeStructure: analysisTypesArray.includes('structure'),
      includeConfigValidation: analysisTypesArray.includes('config-validation'),
      scope: scopeValue,
    }

    const result = await analyzeProject(process.cwd(), options)

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          analysis: {
            ...result,
            timestamp: new Date().toISOString(),
            projectId,
            scope,
            analysisTypes,
          },
        }, null, 2),
      }],
    }
  }
  catch (error) {
    throw handleError(error, 'Code analysis failed')
  }
}