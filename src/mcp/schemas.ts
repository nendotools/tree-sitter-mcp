/**
 * MCP tool and resource schemas - simplified from complex schema system
 */

export const MCP_TOOLS = [
  {
    name: 'search_code',
    description: 'Search for functions, classes, variables, and other code elements with fuzzy matching',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (name of element)',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results',
          default: 20,
        },
        fuzzyThreshold: {
          type: 'number',
          description: 'Minimum fuzzy match score to include results',
          default: 30,
        },
        exactMatch: {
          type: 'boolean',
          description: 'Require exact name match',
          default: false,
        },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by element types (function, class, variable, etc.)',
        },
        pathPattern: {
          type: 'string',
          description: 'Filter by file path pattern',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_usage',
    description: 'Find all usages of a function, variable, class, or identifier',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'Function, variable, class, or identifier name to find usage of',
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Case sensitive search',
          default: false,
        },
        exactMatch: {
          type: 'boolean',
          description: 'Require exact identifier match (word boundaries)',
          default: true,
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results',
          default: 50,
        },
      },
      required: ['identifier'],
    },
  },
  {
    name: 'analyze_code',
    description: 'Analyze code quality, structure, dead code, and configuration issues',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project to analyze',
        },
        analysisTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['quality', 'structure', 'deadcode', 'config-validation'],
          },
          description: 'Analysis types to run',
          default: ['quality'],
        },
        scope: {
          type: 'string',
          enum: ['project', 'file', 'method'],
          description: 'Analysis scope',
          default: 'project',
        },
        includeMetrics: {
          type: 'boolean',
          description: 'Include quantitative metrics in addition to findings',
          default: false,
        },
        severity: {
          type: 'string',
          enum: ['info', 'warning', 'critical'],
          description: 'Show only issues at or above this severity level',
          default: 'info',
        },
        target: {
          type: 'string',
          description: 'Specific file path or method name when scope is file/method',
        },
      },
      required: ['projectId', 'analysisTypes', 'scope'],
    },
  },
]

export const MCP_RESOURCES = [
  {
    uri: 'analysis://{projectPath}',
    name: 'Code Analysis Results',
    description: 'Get comprehensive code analysis results for a project',
    mimeType: 'application/json',
  },
]