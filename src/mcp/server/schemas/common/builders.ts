/**
 * Schema building utilities
 */

import type { ToolDefinition, ToolSchema, SchemaProperty } from './types.js'

/**
 * Create a tool schema with properties and required fields
 */
export function createToolSchema(
  properties: Record<string, SchemaProperty>,
  required?: string[],
): ToolSchema {
  return {
    type: 'object',
    properties,
    ...(required && required.length > 0 && { required }),
  }
}

/**
 * Create a complete tool definition
 */
export function createToolDefinition(
  name: string,
  description: string,
  properties: Record<string, SchemaProperty>,
  required?: string[],
): ToolDefinition {
  return {
    name,
    description,
    inputSchema: createToolSchema(properties, required),
  }
}

/**
 * Create a string property with description
 */
export function stringProperty(description: string): SchemaProperty {
  return {
    type: 'string',
    description,
  }
}

/**
 * Create a number property with description
 */
export function numberProperty(description: string): SchemaProperty {
  return {
    type: 'number',
    description,
  }
}

/**
 * Create a boolean property with description
 */
export function booleanProperty(description: string): SchemaProperty {
  return {
    type: 'boolean',
    description,
  }
}

/**
 * Create an array property with string items
 */
export function stringArrayProperty(description: string): SchemaProperty {
  return {
    type: 'array',
    items: { type: 'string' },
    description,
  }
}

/**
 * Create an enum property with allowed values
 */
export function enumProperty(description: string, values: string[]): SchemaProperty {
  return {
    type: 'string',
    enum: values,
    description,
  }
}

/**
 * Create an array enum property with allowed values
 */
export function enumArrayProperty(description: string, values: string[]): SchemaProperty {
  return {
    type: 'array',
    items: {
      type: 'string',
      enum: values,
    },
    description,
  }
}