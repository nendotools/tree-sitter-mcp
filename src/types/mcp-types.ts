/**
 * MCP (Model Context Protocol) tool types
 */

import type { NodeType } from './tree-types.js';

// MCP tool names
export type MCPTool = 
  | 'initialize_project'
  | 'search_code' 
  | 'update_file'
  | 'project_status'
  | 'destroy_project';

// Initialize Project tool arguments
export interface InitializeProjectArgs {
  projectId: string;
  directory?: string;
  languages?: string[];
  maxDepth?: number;
  ignoreDirs?: string[];
  autoWatch?: boolean;
}

// Search Code tool arguments
export interface SearchCodeArgs {
  projectId: string;
  query: string;
  types?: NodeType[];
  languages?: string[];
  pathPattern?: string;
  maxResults?: number;
  exactMatch?: boolean;
  caseSensitive?: boolean;
}

// Update File tool arguments
export interface UpdateFileArgs {
  projectId: string;
  filePath: string;
  force?: boolean;
}

// Project Status tool arguments
export interface ProjectStatusArgs {
  projectId?: string;
  includeStats?: boolean;
}

// Destroy Project tool arguments
export interface DestroyProjectArgs {
  projectId: string;
  keepCache?: boolean;
}

// Search options configuration
export interface SearchOptions {
  maxResults?: number;
  types?: NodeType[];
  languages?: string[];
  pathPattern?: string;
  exactMatch?: boolean;
  regexMatch?: boolean;
  includeContext?: boolean;
  caseSensitive?: boolean;
}

// Search result
export interface SearchResult {
  node: TreeNode;
  filePath: string;
  score: number;
  context?: SearchContext;
  matches?: MatchDetail[];
}

// Search context information
export interface SearchContext {
  parentName?: string;
  parentType?: NodeType;
  siblings?: Array<{ name: string; type: NodeType }>;
  fileImports?: string[];
  fileExports?: string[];
  codeSnippet?: string;
}

// Match detail in search
export interface MatchDetail {
  line: number;
  column: number;
  length: number;
  text: string;
}