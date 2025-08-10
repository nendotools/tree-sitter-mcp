/**
 * Tree-Sitter AST and parsing related types
 */

// Node type union for AST nodes
export type NodeType =
  | 'file'
  | 'directory'
  | 'class'
  | 'interface'
  | 'struct'
  | 'function'
  | 'method'
  | 'variable'
  | 'constant'
  | 'enum'
  | 'type'
  | 'import'
  | 'export';

// Tree node representation
export interface TreeNode {
  id: string;
  path: string;
  name: string;
  type: NodeType;
  language?: string;
  startLine?: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
  content?: string;
  parameters?: string[];
  returnType?: string;
  imports?: string[];
  exports?: string[];
  children: TreeNode[];
  parent?: TreeNode;
  metadata?: Record<string, unknown>;
  lastModified: Date;
}

// Parser result from tree-sitter
export interface ParseResult {
  file: FileInfo;
  elements: ParsedElement[];
  imports: string[];
  exports: string[];
  errors: string[];
}

// File information
export interface FileInfo {
  path: string;
  language: string;
  size: number;
  encoding?: string;
  metadata?: Record<string, unknown>;
}

// Parsed element from AST
export interface ParsedElement {
  name: string;
  type: NodeType;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  parameters?: string[];
  returnType?: string;
  modifiers?: string[];
  metadata?: Record<string, unknown>;
}

// Language parser interface
export interface LanguageParser {
  name: string;
  extensions: string[];
  parse(content: string, filePath: string): ParseResult;
  canParse(filePath: string): boolean;
}
