/**
 * MCP tool schema factory - orchestrates all tool schemas
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'

// Project management schemas
import { createInitializeProjectSchema } from './project/initialize-project.js'
import { createProjectStatusSchema } from './project/project-status.js'
import { createDestroyProjectSchema } from './project/destroy-project.js'

// Search operation schemas
import { createSearchCodeSchema } from './search/search-code.js'
import { createFindUsageSchema } from './search/find-usage.js'

// File operation schemas
import { createUpdateFileSchema } from './file/update-file.js'

// Analysis operation schemas
import { createAnalyzeCodeSchema } from './analysis/analyze-code.js'

/**
 * Create all MCP tool schemas using modular schema factories
 */
export function createToolSchemas(): Tool[] {
  return [
    // Project management tools
    createInitializeProjectSchema(),
    createProjectStatusSchema(),
    createDestroyProjectSchema(),

    // Search operation tools
    createSearchCodeSchema(),
    createFindUsageSchema(),

    // File operation tools
    createUpdateFileSchema(),

    // Analysis operation tools
    createAnalyzeCodeSchema(),
  ] as Tool[]
}

// Export common utilities for external use
export * from './common/types.js'
export * from './common/builders.js'
export * from './common/properties.js'