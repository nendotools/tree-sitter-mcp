/**
 * Search Code tool schema
 */

import { MCP_TOOLS } from '../../../../constants/app-constants.js'
import { createToolDefinition, stringProperty, stringArrayProperty, numberProperty, booleanProperty } from '../common/builders.js'
import {
  projectIdProperty,
  languagesProperty,
  pathPatternProperty,
  maxResultsProperty,
  exactMatchProperty,
} from '../common/properties.js'

/**
 * Create schema for search_code tool
 */
export function createSearchCodeSchema() {
  return createToolDefinition(
    MCP_TOOLS.SEARCH_CODE,
    'Search for functions, classes, variables, and config keys with fuzzy matching.',
    {
      projectId: projectIdProperty,
      query: stringProperty('Search query (name of element)'),
      types: stringArrayProperty('Filter by element types'),
      languages: languagesProperty,
      pathPattern: pathPatternProperty,
      maxResults: maxResultsProperty,
      exactMatch: exactMatchProperty,
      subProjects: stringArrayProperty('Specific sub-projects to search within (mono-repo)'),
      excludeSubProjects: stringArrayProperty('Sub-projects to exclude from search (mono-repo)'),
      crossProjectSearch: booleanProperty('Search across multiple sub-projects (mono-repo)'),
      priorityType: stringProperty('Boost specific element types in search ranking (function, method, class, interface, variable)'),
      fuzzyThreshold: numberProperty('Minimum fuzzy match score to include results (default: 30)'),
    },
    ['projectId', 'query'],
  )
}