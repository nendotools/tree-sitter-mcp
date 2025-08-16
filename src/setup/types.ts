/**
 * Setup types and constants
 */

export interface MCPConfig {
  mcpServers?: {
    [key: string]: {
      command: string
      args?: string[]
      env?: Record<string, string>
    }
  }
}

export interface MCPClient {
  name: string
  configPath: string
  type:
    | 'claude-desktop'
    | 'vscode'
    | 'cursor'
    | 'windsurf'
    | 'claude-code'
    | 'gemini-cli'
    | 'qwen-cli'
    | 'other'
}

export type SetupMode = 'quick' | 'manual' | 'npm' | 'global' | 'config-only'

/**
 * Standard MCP server configurations
 */
export const MCP_CONFIGS = {
  npx: {
    command: 'npx' as const,
    args: ['@nendo/tree-sitter-mcp@latest', '--mcp'],
  },
  global: {
    command: 'tree-sitter-mcp' as const,
    args: ['--mcp'],
  },
  local: (cliPath: string) => ({
    command: 'node' as const,
    args: [cliPath, '--mcp'],
  }),
}

/**
 * Generate complete MCP server configuration with tree-sitter entry
 */
export function createMCPServerConfig(
  config: typeof MCP_CONFIGS.npx | typeof MCP_CONFIGS.global | ReturnType<typeof MCP_CONFIGS.local>,
) {
  return {
    mcpServers: {
      'tree-sitter': config,
    },
  }
}