/**
 * MCP tool and resource schemas - consistent parameter support across all tools
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
        projectId: {
          type: 'string',
          description: 'Optional: Project ID for targeting specific cached project',
        },
        directory: {
          type: 'string',
          description: 'Optional: Directory to search (default: current working directory)',
        },
        pathPattern: {
          type: 'string',
          description: 'Optional: Filter results to files containing this text in their path (e.g., "server", "client", "components")',
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
        projectId: {
          type: 'string',
          description: 'Optional: Project ID for targeting specific cached project',
        },
        directory: {
          type: 'string',
          description: 'Optional: Directory to search (default: current working directory)',
        },
        pathPattern: {
          type: 'string',
          description: 'Optional: Filter results to files containing this text in their path (e.g., "server", "client", "components")',
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
          description: 'Optional: Project ID for targeting specific cached project (if not provided, directory is required)',
        },
        directory: {
          type: 'string',
          description: 'Optional: Directory to analyze (default: current working directory)',
        },
        pathPattern: {
          type: 'string',
          description: 'Optional: Filter results to files containing this text in their path (e.g., "server", "client", "components")',
        },
        analysisTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['quality', 'structure', 'deadcode'],
          },
          description: 'Analysis types to run: quality, deadcode, structure',
          default: ['quality'],
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of findings to return',
          default: 20,
        },
      },
      required: ['analysisTypes'],
    },
  },
  {
    name: 'check_errors',
    description: 'Find actionable syntax errors with detailed context and fix suggestions',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Optional: Project ID for targeting specific cached project',
        },
        directory: {
          type: 'string',
          description: 'Optional: Directory to check for errors (default: current working directory)',
        },
        pathPattern: {
          type: 'string',
          description: 'Optional: Filter results to files containing this text in their path (e.g., "server", "client", "components")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of errors to return',
          default: 50,
        },
      },
      required: [],
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