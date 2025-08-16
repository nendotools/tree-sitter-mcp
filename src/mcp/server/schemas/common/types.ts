/**
 * Common schema types and interfaces
 */

export interface SchemaProperty {
  type: string
  description: string
  items?: { type: string, enum?: string[] }
  enum?: string[]
}

export interface ToolSchema {
  type: 'object'
  properties: Record<string, SchemaProperty>
  required?: string[]
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: ToolSchema
}