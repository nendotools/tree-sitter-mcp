/**
 * Type-safe tool registry for MCP handlers
 */

import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { TreeManager } from '../../core/tree-manager.js'
import type { BatchFileWatcher } from '../../core/file-watcher.js'
import type { Logger } from '../../types/cli-types.js'

// Tool dependencies interface
export interface ToolDependencies {
  treeManager: TreeManager
  fileWatcher: BatchFileWatcher
  logger: Logger
}

// Tool handler interface - use object type instead of Record constraint
export interface ToolHandler<T extends object> {
  validate: (args: unknown) => args is T
  execute: (args: T, deps: ToolDependencies) => Promise<TextContent>
}

// Type-safe tool registry
export class ToolRegistry {
  private tools = new Map<string, ToolHandler<object>>()

  register<T extends object>(name: string, handler: ToolHandler<T>): void {
    // Store with type erasure to object
    this.tools.set(name, handler as unknown as ToolHandler<object>)
  }

  async execute(name: string, args: unknown, deps: ToolDependencies): Promise<TextContent> {
    const handler = this.tools.get(name)
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`)
    }

    // First validate it's an object
    if (typeof args !== 'object' || args === null) {
      throw new Error(`Invalid arguments for tool: ${name} - expected object, got ${typeof args}`)
    }

    // Then use specific tool validation
    if (!handler.validate(args)) {
      throw new Error(`Invalid arguments for tool: ${name}`)
    }

    return handler.execute(args as object, deps)
  }

  hasHandler(name: string): boolean {
    return this.tools.has(name)
  }

  getRegisteredTools(): string[] {
    return Array.from(this.tools.keys())
  }
}