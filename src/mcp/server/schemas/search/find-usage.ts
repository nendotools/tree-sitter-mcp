/**
 * Find Usage tool schema
 */

import { MCP_TOOLS } from '../../../../constants/app-constants.js'
import { createToolDefinition, stringProperty } from '../common/builders.js'
import {
  projectIdProperty,
  languagesProperty,
  pathPatternProperty,
  maxResultsProperty,
  exactMatchIdentifierProperty,
  caseSensitiveProperty,
} from '../common/properties.js'

/**
 * Create schema for find_usage tool
 */
export function createFindUsageSchema() {
  return createToolDefinition(
    MCP_TOOLS.FIND_USAGE,
    'Find all usages of a function, variable, class, or identifier.',
    {
      projectId: projectIdProperty,
      identifier: stringProperty('Function, variable, class, config key, or identifier name to find usage of'),
      languages: languagesProperty,
      pathPattern: pathPatternProperty,
      maxResults: maxResultsProperty,
      exactMatch: exactMatchIdentifierProperty,
      caseSensitive: caseSensitiveProperty,
    },
    ['projectId', 'identifier'],
  )
}