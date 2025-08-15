/**
 * MCP (Model Context Protocol) tool types
 */

import type { NodeType, TreeNode } from './tree-types.js'

// MCP tool names
export type MCPTool
  = | 'initialize_project'
    | 'search_code'
    | 'find_usage'
    | 'update_file'
    | 'project_status'
    | 'destroy_project'
    | 'analyze_code'

// Initialize Project tool arguments
export interface InitializeProjectArgs {
  projectId: string
  directory?: string
  languages?: string[]
  maxDepth?: number
  ignoreDirs?: string[]
  autoWatch?: boolean
}

// Search Code tool arguments
export interface SearchCodeArgs {
  projectId: string
  query: string
  types?: NodeType[]
  languages?: string[]
  pathPattern?: string
  maxResults?: number
  exactMatch?: boolean
  caseSensitive?: boolean
  // Fuzzy matching parameters
  priorityType?: NodeType
  fuzzyThreshold?: number
  // Mono-repo support
  subProjects?: string[]
  excludeSubProjects?: string[]
  crossProjectSearch?: boolean
}

// Update File tool arguments
export interface UpdateFileArgs {
  projectId: string
  filePath: string
  force?: boolean
}

// Project Status tool arguments
export interface ProjectStatusArgs {
  projectId?: string
  includeStats?: boolean
}

// Find Usage tool arguments
export interface FindUsageArgs {
  projectId: string
  identifier: string
  languages?: string[]
  pathPattern?: string
  maxResults?: number
  exactMatch?: boolean
  caseSensitive?: boolean
}

// Destroy Project tool arguments
export interface DestroyProjectArgs {
  projectId: string
  keepCache?: boolean
}

// Search scope configuration for mono-repos
export interface SearchScope {
  subProjects?: string[] // Specific sub-projects to search within
  excludeSubProjects?: string[] // Sub-projects to exclude from search
  crossProjectSearch?: boolean // Allow searching across multiple sub-projects
}

// Search options configuration
export interface SearchOptions {
  maxResults?: number
  types?: NodeType[]
  languages?: string[]
  pathPattern?: string
  exactMatch?: boolean
  regexMatch?: boolean
  includeContext?: boolean
  caseSensitive?: boolean
  // Fuzzy matching parameters
  priorityType?: NodeType
  fuzzyThreshold?: number
  // Mono-repo support
  scope?: SearchScope
}

// Search result
export interface SearchResult {
  node: TreeNode
  filePath: string
  score: number
  context?: SearchContext
  matches?: MatchDetail[]
  // Mono-repo support
  subProject?: string // Which sub-project this result belongs to
}

// Search context information
export interface SearchContext {
  parentName?: string
  parentType?: NodeType
  siblings?: Array<{ name: string, type: NodeType }>
  fileImports?: string[]
  fileExports?: string[]
  codeSnippet?: string
}

// Match detail in search
export interface MatchDetail {
  line: number
  column: number
  length: number
  text: string
}

// Analysis types
export type AnalysisType = 'quality' | 'structure' | 'deadcode' | 'config-validation'

export type AnalysisScope = 'project' | 'file' | 'method'

export type IssueSeverity = 'info' | 'warning' | 'critical'

// Analyze Code tool arguments
export interface AnalyzeCodeArgs {
  projectId: string
  analysisTypes: AnalysisType[]
  scope: AnalysisScope
  target?: string // File path or method identifier
  directory?: string // Directory to analyze (for auto-initialization)
  includeMetrics?: boolean
  severity?: IssueSeverity // Filter by minimum severity
}

// Quality issue finding
export interface QualityIssue {
  type: AnalysisType
  category: string
  severity: IssueSeverity
  location: string
  description: string
  context: string
  metrics?: Record<string, number>
}

// Analysis result
export interface AnalysisResult {
  projectId: string
  analysisTypes: AnalysisType[]
  scope: AnalysisScope
  target?: string
  summary: {
    totalIssues: number
    severityBreakdown: Record<IssueSeverity, number>
  }
  findings: QualityIssue[]
  metrics: {
    quality?: {
      avgComplexity: number
      avgMethodLength: number
      avgParameters: number
      totalMethods: number
      codeQualityScore: number
    }
    structure?: {
      analyzedFiles: number
      circularDependencies: number
      highCouplingFiles: number
      htmlFiles: number
      deeplyNestedElements: number
      maxNestingDepth: number
    }
    deadCode?: {
      orphanedFiles: number
      unusedExports: number
      unusedDependencies: number
    }
    configValidation?: {
      validatedFiles: number
      schemaMatches: number
      validationErrors: number
      criticalErrors: number
    }
  }
}
