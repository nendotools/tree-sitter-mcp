/**
 * Search options building functions
 */

import { SEARCH_CONFIG as SEARCH } from '../../../constants/analysis-constants.js'
import type { SearchCodeArgs, SearchOptions, NodeType } from '../../../types/index.js'

export function buildSearchOptions(args: SearchCodeArgs): SearchOptions {
  return {
    maxResults: args.maxResults || SEARCH.DEFAULT_MAX_RESULTS,
    types: args.types as NodeType[],
    languages: args.languages,
    pathPattern: args.pathPattern,
    exactMatch: args.exactMatch,
    caseSensitive: args.caseSensitive,
    priorityType: args.priorityType,
    fuzzyThreshold: args.fuzzyThreshold,
    includeContext: true,
    scope: {
      subProjects: args.subProjects,
      excludeSubProjects: args.excludeSubProjects,
      crossProjectSearch: args.crossProjectSearch,
    },
  }
}