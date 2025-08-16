/**
 * Project Status tool schema
 */

import { MCP_TOOLS } from '../../../../constants/app-constants.js'
import { createToolDefinition, stringProperty } from '../common/builders.js'
import { includeStatsProperty } from '../common/properties.js'

/**
 * Create schema for project_status tool
 */
export function createProjectStatusSchema() {
  return createToolDefinition(
    MCP_TOOLS.PROJECT_STATUS,
    'Get project status, memory usage, and indexing statistics.',
    {
      projectId: stringProperty('Specific project ID (empty for all projects)'),
      includeStats: includeStatsProperty,
    },
  )
}