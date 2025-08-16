/**
 * Initialize Project tool schema
 */

import { MCP_TOOLS } from '../../../../constants/app-constants.js'
import { createToolDefinition } from '../common/builders.js'
import {
  projectIdRequiredProperty,
  directoryProperty,
  languagesInitProperty,
  maxDepthProperty,
  ignoreDirsProperty,
  autoWatchProperty,
} from '../common/properties.js'

/**
 * Create schema for initialize_project tool
 */
export function createInitializeProjectSchema() {
  return createToolDefinition(
    MCP_TOOLS.INITIALIZE_PROJECT,
    'Initialize and index a project for code search and analysis. Required before using other tools.',
    {
      projectId: projectIdRequiredProperty,
      directory: directoryProperty,
      languages: languagesInitProperty,
      maxDepth: maxDepthProperty,
      ignoreDirs: ignoreDirsProperty,
      autoWatch: autoWatchProperty,
    },
    ['projectId'],
  )
}