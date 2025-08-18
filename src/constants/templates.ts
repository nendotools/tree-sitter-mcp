/**
 * Output templates for different formats
 */

import type { JsonObject } from '../types/core.js'

export interface AnalysisData {
  totalFindings: number
  critical: number
  warnings: number
  info: number
  qualityScore: number
  avgComplexity: number
  avgMethodLength: number
  totalMethods: number
  analyzedFiles: number
  unusedFiles?: number
  unusedFunctions?: number
  circularDependencies?: number
  criticalIssues?: string
  warningIssues?: string
  statusMessage?: string
}

export interface BuildData {
  lines: number
  files: number
  directories: number
  originalLines?: number
  originalFiles?: number
  originalDirectories?: number
}

export const SETUP_TEMPLATE = `MCP Setup Instructions:

For Claude Code (Recommended):

Run this command to add the MCP server:
  claude mcp add tree-sitter-mcp -s user -- npx -y @nendo/tree-sitter-mcp --mcp

If already installed, check with:
  claude mcp list

For Claude Desktop:

Add to your config (~/.config/claude-desktop/claude_desktop_config.json):
  {
    "mcpServers": {
      "tree-sitter-mcp": {
        "command": "npx",
        "args": ["@nendo/tree-sitter-mcp", "--mcp"],
        "cwd": "/path/to/your/project"
      }
    }
  }

For Other MCP Clients:

The server can be started with:
  npx @nendo/tree-sitter-mcp --mcp

Or globally installed:
  npm install -g @nendo/tree-sitter-mcp
  tree-sitter-mcp --mcp

Server will communicate via stdio using the MCP protocol.`

export const SETUP_AUTO_SUCCESS_TEMPLATE = `✅ Successfully installed tree-sitter-mcp!

The MCP server is now available in Claude Code.
Use /mcp to see available tools or start using the analysis functions.`

export const SETUP_AUTO_EXISTS_TEMPLATE = `✅ tree-sitter-mcp is already installed!

The MCP server is available in Claude Code.
Use /mcp to see available tools or start using the analysis functions.`

export const SETUP_AUTO_FAILED_TEMPLATE = `❌ Automatic setup failed: {error}

Falling back to manual instructions:

{manualInstructions}`

export const SETUP_CLAUDE_NOT_FOUND_TEMPLATE = `❌ Claude Code CLI not found

Please install Claude Code first to use automatic setup.
You can download it from: https://claude.ai/download

Falling back to manual instructions:

{manualInstructions}`

/**
 * Create console output using template literals with conditional sections
 */
export function createConsoleOutput(data: AnalysisData): string {
  const baseTemplate = `Analysis Summary
Total findings: ${data.totalFindings}
Critical: ${data.critical}
Warnings: ${data.warnings}
Info: ${data.info}

Quality Metrics
Code Quality Score: ${data.qualityScore}/10
Average Complexity: ${data.avgComplexity}
Average Method Length: ${data.avgMethodLength} lines
Total Methods: ${data.totalMethods}

Dead Code Metrics
Total Files: ${data.analyzedFiles}
Unused Files: ${data.unusedFiles || 0}
Unused Functions: ${data.unusedFunctions || 0}

Structure Metrics
Files Analyzed: ${data.analyzedFiles}
Circular Dependencies: ${data.circularDependencies || 0}`

  const criticalSection = data.criticalIssues
    ? `

Critical Issues
${data.criticalIssues}`
    : ''

  const warningSection = data.warningIssues
    ? `

Warnings (showing first 3)
${data.warningIssues}`
    : ''

  const statusSection = data.statusMessage
    ? `
${data.statusMessage}`
    : ''

  return baseTemplate + criticalSection + warningSection + statusSection
}

export const BUILD_TEMPLATES = {
  CONSOLE: `New codebase statistics:
   Lines of code: {lines}
   Files: {files}
   Directories: {directories}

Reduction achieved:
   From {originalLines} lines -> {lines} lines
   From {originalFiles} files -> {files} files
   From {originalDirectories} directories -> {directories} directories`,

  JSON: `{
  "statistics": {
    "lines": {lines},
    "files": {files},
    "directories": {directories}
  },
  "reduction": {
    "fromLines": {originalLines},
    "toLines": {lines},
    "fromFiles": {originalFiles},
    "toFiles": {files},
    "fromDirectories": {originalDirectories},
    "toDirectories": {directories}
  }
}`,
} as const

/**
 * Populate template with data
 */
/**
 * Template data for build templates
 */
export type TemplateData = JsonObject

/**
 * Populate template with data using safe typing
 */
export function populateTemplate(template: string, data: TemplateData): string {
  let result = template

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    }
  }

  return result
}

/**
 * Render analysis results
 */
export function renderAnalysis(data: AnalysisData, format: 'console' | 'json' = 'console'): string | object {
  if (format === 'json') {
    return {
      summary: {
        totalFindings: data.totalFindings,
        critical: data.critical,
        warnings: data.warnings,
        info: data.info,
      },
      quality: {
        score: data.qualityScore,
        avgComplexity: data.avgComplexity,
        avgMethodLength: data.avgMethodLength,
        totalMethods: data.totalMethods,
      },
      deadcode: {
        analyzedFiles: data.analyzedFiles,
        unusedFiles: data.unusedFiles,
        unusedFunctions: data.unusedFunctions,
      },
      structure: {
        analyzedFiles: data.analyzedFiles,
        circularDependencies: data.circularDependencies,
      },
    }
  }

  return createConsoleOutput(data)
}

export const ANALYSIS_TEMPLATES = {
  MARKDOWN: `# Analysis Report

## Summary
- Total findings: {totalFindings}
- Critical: {criticalFindings}
- Warnings: {warningFindings}
- Info: {infoFindings}

{qualitySection}{deadcodeSection}{structureSection}{criticalIssuesSection}{warningsSection}`,

  QUALITY_SECTION: `## Quality Metrics
- Code Quality Score: {codeQualityScore}/10
- Average Complexity: {avgComplexity}
- Average Method Length: {avgMethodLength} lines
- Average Parameters: {avgParameters}
- Total Methods: {totalMethods}

`,

  DEADCODE_SECTION: `## Dead Code Metrics
- Total Files: {totalFiles}
- Unused Files: {unusedFiles}
- Unused Functions: {unusedFunctions}
- Unused Variables: {unusedVariables}

`,

  STRUCTURE_SECTION: `## Structure Metrics
- Files Analyzed: {analyzedFiles}
- Circular Dependencies: {circularDependencies}
- High Coupling Files: {highCouplingFiles}
- Max Nesting Depth: {maxNestingDepth}

`,

  CRITICAL_ISSUES_SECTION: `## Critical Issues
{criticalIssuesList}

`,

  WARNINGS_SECTION: `## Warnings
{warningsList}{moreWarningsText}

`,
} as const

/**
 * Enhanced template population with conditional sections
 */
export function populateTemplateWithSections(
  template: string,
  data: TemplateData,
  sections: TemplateData = {},
): string {
  let result = template

  for (const [key, value] of Object.entries(sections)) {
    if (value !== undefined && value !== null) {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    }
  }

  result = result.replace(/\{[^}]+\}/g, '')

  return result
}

/**
 * Build quality section if metrics exist
 */
export function buildQualitySection(metrics?: any): string {
  if (!metrics) return ''
  return populateTemplate(ANALYSIS_TEMPLATES.QUALITY_SECTION, metrics)
}

/**
 * Build deadcode section if metrics exist
 */
export function buildDeadcodeSection(metrics?: any): string {
  if (!metrics) return ''
  return populateTemplate(ANALYSIS_TEMPLATES.DEADCODE_SECTION, metrics)
}

/**
 * Build structure section if metrics exist
 */
export function buildStructureSection(metrics?: any): string {
  if (!metrics) return ''
  return populateTemplate(ANALYSIS_TEMPLATES.STRUCTURE_SECTION, metrics)
}

/**
 * Build critical issues section
 */
export function buildCriticalIssuesSection(findings: any[], count: number): string {
  if (count === 0) return ''

  const criticalIssues = findings
    .filter(f => f.severity === 'critical')
    .map(f => `- **${f.category}**: ${f.description} (${f.location})`)
    .join('\n')

  return populateTemplate(ANALYSIS_TEMPLATES.CRITICAL_ISSUES_SECTION, { criticalIssuesList: criticalIssues })
}

/**
 * Build warnings section
 */
export function buildWarningsSection(findings: any[], count: number): string {
  if (count === 0) return ''

  const warningsList = findings
    .filter(f => f.severity === 'warning')
    .slice(0, 10)
    .map(f => `- **${f.category}**: ${f.description} (${f.location})`)
    .join('\n')

  const moreWarningsText = count > 10 ? `\n- ... and ${count - 10} more warnings` : ''

  return populateTemplate(ANALYSIS_TEMPLATES.WARNINGS_SECTION, { warningsList, moreWarningsText })
}

/**
 * Render build results
 */
export function renderBuild(data: BuildData, format: 'console' | 'json' = 'console'): string {
  const template = format === 'json' ? BUILD_TEMPLATES.JSON : BUILD_TEMPLATES.CONSOLE
  const templateData: TemplateData = { ...data }
  return populateTemplate(template, templateData)
}