/**
 * Destroy Project tool schema
 */

import { MCP_TOOLS } from '../../../../constants/app-constants.js'
import { createToolDefinition, stringProperty } from '../common/builders.js'

/**
 * Create schema for destroy_project tool
 */
export function createDestroyProjectSchema() {
  return createToolDefinition(
    MCP_TOOLS.DESTROY_PROJECT,
    'Remove project from memory to free resources.',
    {
      projectId: stringProperty('Project to destroy'),
    },
    ['projectId'],
  )
}