/**
 * Common schema property definitions
 */

import type { SchemaProperty } from './types.js'

/**
 * Standard projectId property used across most tools
 */
export const projectIdProperty: SchemaProperty = {
  type: 'string',
  description: 'Project to search in',
}

/**
 * Standard projectId property for project management tools
 */
export const projectIdRequiredProperty: SchemaProperty = {
  type: 'string',
  description: 'Unique identifier for the project',
}

/**
 * Standard languages filter property
 */
export const languagesProperty: SchemaProperty = {
  type: 'array',
  items: { type: 'string' },
  description: 'Filter by programming languages and config formats (e.g., ["typescript", "env", "json", "yaml"])',
}

/**
 * Languages property for initialization
 */
export const languagesInitProperty: SchemaProperty = {
  type: 'array',
  items: { type: 'string' },
  description: 'List of languages to parse (empty = all)',
}

/**
 * Standard path pattern filter property
 */
export const pathPatternProperty: SchemaProperty = {
  type: 'string',
  description: 'Filter by file path pattern',
}

/**
 * Standard max results limit property
 */
export const maxResultsProperty: SchemaProperty = {
  type: 'number',
  description: 'Maximum number of results',
}

/**
 * Standard directory property
 */
export const directoryProperty: SchemaProperty = {
  type: 'string',
  description: 'Directory to analyze (default: current directory)',
}

/**
 * Directory property for analysis tools
 */
export const directoryAnalysisProperty: SchemaProperty = {
  type: 'string',
  description: 'Directory to analyze (for auto-initialization, default: current directory)',
}

/**
 * Standard file path property
 */
export const filePathProperty: SchemaProperty = {
  type: 'string',
  description: 'Path to the file to update',
}

/**
 * Standard exact match property
 */
export const exactMatchProperty: SchemaProperty = {
  type: 'boolean',
  description: 'Require exact name match',
}

/**
 * Exact match property for identifiers
 */
export const exactMatchIdentifierProperty: SchemaProperty = {
  type: 'boolean',
  description: 'Require exact identifier match (word boundaries)',
}

/**
 * Standard case sensitive property
 */
export const caseSensitiveProperty: SchemaProperty = {
  type: 'boolean',
  description: 'Case sensitive search',
}

/**
 * Standard max depth property
 */
export const maxDepthProperty: SchemaProperty = {
  type: 'number',
  description: 'Maximum directory depth to traverse',
}

/**
 * Standard ignore directories property
 */
export const ignoreDirsProperty: SchemaProperty = {
  type: 'array',
  items: { type: 'string' },
  description: 'Directories to ignore during analysis',
}

/**
 * Standard auto watch property
 */
export const autoWatchProperty: SchemaProperty = {
  type: 'boolean',
  description: 'Automatically watch for file changes',
}

/**
 * Standard include stats property
 */
export const includeStatsProperty: SchemaProperty = {
  type: 'boolean',
  description: 'Include detailed statistics',
}

/**
 * Include metrics property for analysis
 */
export const includeMetricsProperty: SchemaProperty = {
  type: 'boolean',
  description: 'Include quantitative metrics (complexity averages, file counts, quality scores) in addition to specific findings',
}