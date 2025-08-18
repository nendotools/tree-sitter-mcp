/**
 * Core type definitions for the tree-sitter MCP system
 */

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]

export type TreeSitterLanguage = unknown

export interface TreeNode {
  id: string
  type: string
  name?: string
  path: string
  startLine?: number
  endLine?: number
  startColumn?: number
  endColumn?: number
  content?: string
  parameters?: TreeNode[]
  children?: TreeNode[]
  parent?: TreeNode
  skipped?: boolean
  skipReason?: string
}

export interface ProjectConfig {
  directory: string
  languages?: string[]
  ignoreDirs?: string[]
  maxDepth?: number
  autoWatch?: boolean
}

export interface Project {
  id: string
  config: ProjectConfig
  files: Map<string, TreeNode>
  nodes: Map<string, TreeNode[]>
  isMonorepo?: boolean
  subProjects?: Project[]
}

export interface SearchOptions {
  maxResults?: number
  fuzzyThreshold?: number
  exactMatch?: boolean
  types?: string[]
  pathPattern?: string
}

export interface SearchResult {
  node: TreeNode
  score: number
  matches: string[]
  context?: string
}

export interface FindUsageResult {
  node: TreeNode
  context: string
  startLine: number
  endLine: number
  startColumn: number
  endColumn: number
}

export interface FileChange {
  type: 'created' | 'modified' | 'deleted'
  path: string
  timestamp: number
}

export interface LanguageConfig {
  name: string
  extensions: string[]
  parserName: string
  functionTypes: string[]
  classTypes: string[]
}

export interface ImportContext {
  aliases?: Record<string, string>
  framework?: string
  basePath?: string
}

export interface ResolutionResult {
  resolved: string | null
  isExternal: boolean
  framework?: string
}

export interface SearchCodeArgs {
  projectId: string
  query: string
  maxResults?: number
  fuzzyThreshold?: number
  exactMatch?: boolean
  types?: string[]
  pathPattern?: string
}

export interface FindUsageArgs {
  projectId: string
  identifier: string
  caseSensitive?: boolean
  exactMatch?: boolean
  maxResults?: number
  pathPattern?: string
}

export interface AnalyzeCodeArgs {
  projectId: string
  analysisTypes?: string[]
  scope?: 'project' | 'file' | 'method'
  includeMetrics?: boolean
  severity?: 'critical' | 'warning' | 'info'
  pathPattern?: string
  maxResults?: number
}

export interface InitializeProjectArgs {
  projectId: string
  directory?: string
  languages?: string[]
  ignoreDirs?: string[]
  maxDepth?: number
  autoWatch?: boolean
}

export interface ProjectStatusArgs {
  projectId?: string
  includeStats?: boolean
}

export interface MCPToolRequest {
  params: {
    name: string
    arguments: SearchCodeArgs | FindUsageArgs | AnalyzeCodeArgs | InitializeProjectArgs | ProjectStatusArgs
  }
}