/**
 * Analyze Code tool schema
 */

import { MCP_TOOLS } from '../../../../constants/app-constants.js'
import { createToolDefinition, stringProperty, enumProperty, enumArrayProperty } from '../common/builders.js'
import { directoryAnalysisProperty, includeMetricsProperty } from '../common/properties.js'

/**
 * Create schema for analyze_code tool
 */
export function createAnalyzeCodeSchema() {
  return createToolDefinition(
    MCP_TOOLS.ANALYZE_CODE,
    'Analyze code quality, structure, dead code, and configuration issues.',
    {
      projectId: stringProperty('Project to analyze (must be initialized first)'),
      analysisTypes: enumArrayProperty(
        'Analysis types: quality (complexity/method length), structure (dependencies/coupling), deadcode (unused code), config-validation (JSON/package.json validation)',
        ['quality', 'structure', 'deadcode', 'config-validation'],
      ),
      scope: enumProperty(
        'Analysis scope: project (entire codebase), file (single file), method (specific function/method)',
        ['project', 'file', 'method'],
      ),
      target: stringProperty('Specific file path (e.g., "src/utils/helper.ts") or method name (e.g., "processData") when scope is file/method'),
      directory: directoryAnalysisProperty,
      includeMetrics: includeMetricsProperty,
      severity: enumProperty(
        'Show only issues at or above this severity level (critical=blocking issues, warning=should fix, info=suggestions)',
        ['info', 'warning', 'critical'],
      ),
    },
    ['projectId', 'analysisTypes', 'scope'],
  )
}