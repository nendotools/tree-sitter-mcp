/**
 * Claude Code CLI integration
 */

import { homedir } from 'os'
import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import { getLogger } from '../../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Configure Claude Code CLI with tree-sitter MCP
 */
export async function configureClaudeCode(
  _configPath: string,
  method: 'npx' | 'global',
  installAgent: boolean = true,
): Promise<void> {
  const logger = getLogger()
  const home = homedir()

  try {
    // Remove existing tree-sitter MCP if present
    logger.info(chalk.dim('  Removing existing tree-sitter MCP if present...'))
    await removeExistingMCP()

    // Create MCP configuration based on method
    const mcpConfig = await createMCPConfig(method)

    // Add tree-sitter MCP using claude mcp add-json command
    await addMCPToClaudeCode(mcpConfig)

    // Copy agent to ~/.claude/agents directory if requested
    if (installAgent) {
      await installClaudeAgent(home)
    }
    else {
      logger.info(chalk.dim('  Skipping agent installation'))
    }
  }
  catch (error) {
    logger.error(
      chalk.red('  [ERROR] Failed to configure Claude Code:'),
      error instanceof Error ? error.message : error,
    )
    throw error
  }
}

/**
 * Remove existing tree-sitter MCP configuration
 */
async function removeExistingMCP(): Promise<void> {
  try {
    execSync('claude mcp remove tree-sitter -s user', { stdio: 'pipe' })
  }
  catch {
    // Ignore errors if tree-sitter MCP doesn't exist
  }
}

/**
 * Create MCP configuration based on installation method
 */
async function createMCPConfig(method: 'npx' | 'global'): Promise<any> {
  if (method === 'npx') {
    return await createNPXConfig()
  }
  else {
    return await createGlobalConfig()
  }
}

/**
 * Create NPX-based configuration
 */
async function createNPXConfig(): Promise<any> {
  const logger = getLogger()

  try {
    // Check if package is published to npm
    execSync('npm view @nendo/tree-sitter-mcp version', { stdio: 'pipe' })
    logger.info(chalk.dim('  Using published npm package'))

    return {
      type: 'stdio',
      command: 'npx',
      args: ['@nendo/tree-sitter-mcp@latest', '--mcp'],
      env: { TREE_SITTER_MCP_DEBUG: 'true' },
    }
  }
  catch {
    // Package not published, use local development build
    logger.info(chalk.yellow('  Package not published, using local development build'))
    return await createLocalConfig()
  }
}

/**
 * Create global installation configuration
 */
async function createGlobalConfig(): Promise<any> {
  const logger = getLogger()

  try {
    const globalPath = execSync('which tree-sitter-mcp', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()

    const nodePath = getNodePath()
    logger.info(chalk.dim('  Using globally installed command'))

    return {
      type: 'stdio',
      command: nodePath,
      args: [globalPath, '--mcp'],
      env: { TREE_SITTER_MCP_DEBUG: 'true' },
    }
  }
  catch {
    // Global command not available, use local build
    logger.info(chalk.yellow('  Global command not found, using local development build'))
    return await createLocalConfig()
  }
}

/**
 * Create local development configuration
 */
async function createLocalConfig(): Promise<any> {
  const localCliPath = join(__dirname, '..', '..', '..', 'dist', 'cli.js')

  if (!existsSync(localCliPath)) {
    throw new Error('Local build not found. Run "npm run build" first.')
  }

  const nodePath = getNodePath()

  return {
    type: 'stdio',
    command: nodePath,
    args: [localCliPath, '--mcp'],
    env: { TREE_SITTER_MCP_DEBUG: 'true' },
  }
}

/**
 * Get Node.js executable path
 */
function getNodePath(): string {
  return execSync('which node', { encoding: 'utf-8', stdio: 'pipe' }).trim()
}

/**
 * Add MCP configuration to Claude Code
 */
async function addMCPToClaudeCode(mcpConfig: any): Promise<void> {
  const logger = getLogger()

  const mcpCommand = `claude mcp add-json tree-sitter '${JSON.stringify(mcpConfig)}'`
  logger.info(chalk.dim('  Adding tree-sitter MCP with JSON config...'))

  execSync(mcpCommand, { stdio: 'pipe' })
  logger.info(chalk.green('  [OK] Tree-sitter MCP added to user scope'))
}

/**
 * Install Claude Code agent
 */
async function installClaudeAgent(home: string): Promise<void> {
  const logger = getLogger()
  const agentsDir = join(home, '.claude', 'agents')
  const agentSourcePath = join(__dirname, '..', '..', '..', 'agents', 'treesitter-code-agent.md')
  const agentDestPath = join(agentsDir, 'treesitter-code-agent.md')

  if (existsSync(agentSourcePath)) {
    if (!existsSync(agentsDir)) {
      mkdirSync(agentsDir, { recursive: true })
    }

    const agentContent = readFileSync(agentSourcePath, 'utf-8')
    writeFileSync(agentDestPath, agentContent)
    logger.info(chalk.green('  [OK] Tree-sitter agent copied to ~/.claude/agents'))
  }
  else {
    logger.info(chalk.yellow('  Warning: Agent file not found, skipping agent copy'))
  }
}