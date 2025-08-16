/**
 * Type definitions for enhanced dead code analysis
 */

export interface LanguageEntryPoints {
  patterns: string[]
  contentChecks: string[]
  packageFields?: string[]
  configFiles?: string[]
}

export interface FrameworkConfig {
  name: string
  indicators: string[]
  entryPatterns: string[]
  conventionDirs: string[]
  routingSystem: 'file-based' | 'config-based' | 'hybrid'
  buildTool?: string
}

export interface FrameworkUsageContext {
  framework: string
  buildTool?: string
  routingSystem: 'file-based' | 'config-based' | 'hybrid'
  conventionDirs: string[]
}

export interface DeadCodeFinding {
  file: string
  category: 'orphaned_file' | 'unused_export' | 'unused_dependency'
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
  suggestions: string[]
}

export interface PackageJsonBin {
  [key: string]: string
}

export interface PackageJsonScripts {
  [key: string]: string
}

export interface PackageJsonExports {
  [key: string]: string | { [key: string]: string }
}

export interface PackageJsonDependencies {
  [key: string]: string
}

export interface ImportInfo {
  source: string
  imports: string[]
  type: 'named' | 'default' | 'namespace' | 'dynamic'
  filePath: string
}

export interface UsageAnalysisResult {
  usedFiles: Set<string>
  entryPoints: Set<string>
  importMap: Map<string, string[]>
  exports: Map<string, string[]>
}