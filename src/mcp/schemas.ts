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
        projectId: {
          type: 'string',
          description: 'Project to search in',
        },
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
      required: ['projectId', 'query'],
    },
  },
  {
    name: 'find_usage',
    description: 'Find all usages of a function, variable, class, or identifier',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project to search in',
        },
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
      required: ['projectId', 'identifier'],
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
            enum: ['quality', 'structure', 'deadcode'],
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
      },
      required: ['projectId', 'analysisTypes', 'scope'],
    },
  },
  {
    name: 'initialize_project',
    description: 'Initialize and index a project for code search and analysis',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Unique identifier for the project',
        },
        directory: {
          type: 'string',
          description: 'Directory to analyze (default: current directory)',
        },
        languages: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of languages to parse (empty = all)',
        },
        ignoreDirs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Directories to ignore during analysis',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum directory depth to traverse',
          default: 10,
        },
        autoWatch: {
          type: 'boolean',
          description: 'Automatically watch for file changes',
          default: false,
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'project_status',
    description: 'Get project status, memory usage, and indexing statistics',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Specific project ID (empty for all projects)',
        },
        includeStats: {
          type: 'boolean',
          description: 'Include detailed statistics',
          default: false,
        },
      },
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