/**
 * Analysis-specific type definitions
 */

import type { TreeNode, JsonObject } from './core.js'

export interface AnalysisResult {
  findings: Finding[]
  metrics: AnalysisMetrics
  summary: AnalysisSummary
}

export interface Finding {
  type: 'quality' | 'deadcode' | 'structure' | 'syntax'
  category: string
  severity: 'critical' | 'warning' | 'info'
  location: string
  description: string
  metrics?: JsonObject
}

export interface AnalysisMetrics {
  quality?: QualityMetrics
  deadcode?: DeadcodeMetrics
  structure?: StructureMetrics
  syntax?: SyntaxMetrics
}

export interface AnalysisSummary {
  totalFindings: number
  criticalFindings: number
  warningFindings: number
  infoFindings: number
}

export interface QualityMetrics {
  avgComplexity: number
  avgMethodLength: number
  avgParameters: number
  totalMethods: number
  codeQualityScore: number
}

export interface DeadcodeMetrics {
  totalFiles: number
  unusedFiles: number
  unusedFunctions: number
  unusedVariables: number
  unusedImports: number
}

export interface DeadcodeResult {
  unusedFiles: string[]
  unusedNodes: TreeNode[]
  entryPoints: string[]
  reachableFiles: Set<string>
}

export interface StructureMetrics {
  analyzedFiles: number
  circularDependencies: number
  highCouplingFiles: number
  htmlFiles: number
  deeplyNestedElements: number
  maxNestingDepth: number
}

export interface AnalysisOptions {
  includeQuality?: boolean
  includeDeadcode?: boolean
  includeStructure?: boolean
  includeSyntax?: boolean
  target?: string
  scope?: 'project' | 'file' | 'method'
}

export interface SyntaxMetrics {
  totalFiles: number
  filesWithErrors: number
  totalSyntaxErrors: number
  totalErrorNodes: number // Count of nodes with hasError: true
  errorsByType: Record<string, number>
}

export interface MonorepoInfo {
  isMonorepo: boolean
  subProjects: string[]
  workspaces: string[]
  rootProject: string
}