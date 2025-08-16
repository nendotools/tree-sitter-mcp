/**
 * MCP client detection functionality
 */

import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import type { MCPClient } from './types.js'

/**
 * Platform-specific configuration paths for different MCP clients
 */
const CLIENT_PATHS = {
  'claude-desktop': [
    join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), // macOS
    join(homedir(), '.config', 'Claude', 'claude_desktop_config.json'), // Linux
    join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'), // Windows
  ],
  'vscode': [
    join(homedir(), '.vscode', 'mcp', 'settings.json'),
    join(homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json'), // macOS
    join(homedir(), '.config', 'Code', 'User', 'settings.json'), // Linux
  ],
  'cursor': [
    join(homedir(), '.cursor', 'mcp', 'settings.json'),
    join(homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'), // macOS
  ],
  'windsurf': [
    join(homedir(), '.windsurf', 'mcp-config.json'),
  ],
  'claude-code': [
    join(homedir(), '.claude', 'settings.json'), // User-scoped settings (preferred)
    join(homedir(), '.claude.json'),
    join(homedir(), '.claude', 'settings.local.json'),
  ],
  'gemini-cli': [
    join(homedir(), '.gemini', 'settings.json'),
  ],
  'qwen-cli': [
    join(homedir(), '.cursor', 'mcp.json'),
  ],
} as const

/**
 * Human-readable names for MCP clients
 */
const CLIENT_NAMES = {
  'claude-desktop': 'Claude Desktop',
  'vscode': 'VS Code',
  'cursor': 'Cursor',
  'windsurf': 'Windsurf',
  'claude-code': 'Claude Code',
  'gemini-cli': 'Gemini CLI',
  'qwen-cli': 'Qwen CLI',
} as const

/**
 * Detect all installed MCP clients on the system
 */
export function detectMCPClients(): MCPClient[] {
  const clients: MCPClient[] = []

  for (const [clientType, paths] of Object.entries(CLIENT_PATHS)) {
    for (const path of paths) {
      if (existsSync(path)) {
        clients.push({
          name: CLIENT_NAMES[clientType as keyof typeof CLIENT_NAMES],
          configPath: path,
          type: clientType as MCPClient['type'],
        })
        break // Only add the first found config for each client type
      }
    }
  }

  return clients
}

/**
 * Check if a specific MCP client is installed
 */
export function isClientInstalled(clientType: MCPClient['type']): boolean {
  if (clientType === 'other') return false

  const paths = CLIENT_PATHS[clientType]
  if (!paths) return false

  return paths.some((path: string) => existsSync(path))
}

/**
 * Get the configuration path for a specific client
 */
export function getClientConfigPath(clientType: MCPClient['type']): string | null {
  if (clientType === 'other') return null

  const paths = CLIENT_PATHS[clientType]
  if (!paths) return null

  for (const path of paths) {
    if (existsSync(path)) {
      return path
    }
  }

  return null
}