/**
 * Update File tool schema
 */

import { MCP_TOOLS } from '../../../../constants/app-constants.js'
import { createToolDefinition, stringProperty } from '../common/builders.js'

/**
 * Create schema for update_file tool
 */
export function createUpdateFileSchema() {
  return createToolDefinition(
    MCP_TOOLS.UPDATE_FILE,
    'Re-parse a file to update search results after modifications.',
    {
      projectId: stringProperty('Project containing the file'),
      filePath: stringProperty('Path to the file to update'),
    },
    ['projectId', 'filePath'],
  )
}