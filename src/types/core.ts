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
  rawNode?: any // Raw tree-sitter node for error detection
}

/**
 * Creates a lightweight copy of a TreeNode for use in search results.
 *
 * **Problem Solved:**
 * Original search results stored full TreeNode objects containing `children`, `parent`,
 * `parameters`, and `rawNode` references. These created deep reference chains that prevented
 * garbage collection of entire ASTs, causing severe memory leaks in test environments where
 * many searches were performed across multiple projects.
 *
 * **Solution:**
 * This function extracts only the essential data from a TreeNode (location, type, content)
 * while deliberately omitting reference properties that create memory chains. This allows:
 * - Search results to preserve the same API (still contain `node` property)
 * - ASTs to be properly garbage collected after search operations
 * - Memory usage to remain stable during extensive testing
 *
 * **Reference Properties Excluded:**
 * - `children`: Array of child TreeNodes that reference subtrees
 * - `parent`: Parent TreeNode that creates upward references
 * - `parameters`: Array of parameter TreeNodes
 * - `rawNode`: Raw tree-sitter node that holds native parser memory
 *
 * **Data Properties Preserved:**
 * All scalar values and strings needed for search result display and testing.
 *
 * @param node - The original TreeNode from AST parsing
 * @returns Lightweight TreeNode copy with broken reference chains
 *
 * @example
 * ```typescript
 * // In search functions - prevents memory leaks
 * results.push({
 *   node: createLightweightTreeNode(fullNode), // Safe for GC
 *   score: 95,
 *   matches: ['function', 'name']
 * });
 * ```
 *
 * @since 2.2.2 - Added to resolve CI test memory issues
 */
export function createLightweightTreeNode(node: TreeNode): TreeNode {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    path: node.path,
    startLine: node.startLine,
    endLine: node.endLine,
    startColumn: node.startColumn,
    endColumn: node.endColumn,
    content: node.content,
    skipped: node.skipped,
    skipReason: node.skipReason,
    // Deliberately exclude reference properties to break memory chains
    parameters: undefined,
    children: undefined,
    parent: undefined,
    rawNode: undefined,
  }
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