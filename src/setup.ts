/* eslint-disable no-console */
/**
 * Setup script for Tree-Sitter MCP service
 * Handles installation and configuration for various MCP clients
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MCPConfig {
  mcpServers?: {
    [key: string]: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    };
  };
}

export function runSetup(): void {
  const logger = getLogger();
  logger.info(chalk.cyan('Setting up Tree-Sitter MCP service...\n'));

  try {
    // Step 1: Check if running from global installation
    const isGlobal = checkGlobalInstallation();
    
    if (!isGlobal) {
      logger.info(chalk.yellow('📦 Installing globally...'));
      installGlobally();
    } else {
      logger.info(chalk.green('✓ Global installation detected'));
    }

    // Step 2: Detect MCP clients
    const clients = detectMCPClients();
    
    if (clients.length === 0) {
      logger.info(chalk.yellow('\n⚠️  No MCP clients detected.'));
      logger.info(chalk.dim('You can manually configure your MCP client with:'));
      logger.info(chalk.cyan('  Command: tree-sitter-mcp --mcp'));
      return;
    }

    logger.info(chalk.green(`\n✓ Found ${clients.length} MCP client(s):`));
    clients.forEach(client => {
      logger.info(`  • ${client.name} (${client.configPath})`);
    });

    // Step 3: Configure each client
    for (const client of clients) {
      logger.info(chalk.cyan(`\n📝 Configuring ${client.name}...`));
      configureClient(client);
    }

    // Step 4: Create default config
    createDefaultConfig();

    logger.info(chalk.green('\n✅ Setup completed successfully!\n'));
    logger.info(chalk.cyan('You can now use the Tree-Sitter MCP service in your MCP client.'));
    logger.info(chalk.dim('\nTo test the service manually:'));
    logger.info(chalk.cyan('  tree-sitter-mcp --mcp'));
    
  } catch (error) {
    logger.error(chalk.red('\n❌ Setup failed:'), error);
    process.exit(1);
  }
}

function checkGlobalInstallation(): boolean {
  try {
    const result = execSync('npm list -g tree-sitter-mcp', { 
      encoding: 'utf-8',
      stdio: 'pipe' 
    });
    return result.includes('tree-sitter-mcp');
  } catch {
    return false;
  }
}

function installGlobally(): void {
  const logger = getLogger();
  try {
    logger.info(chalk.dim('Running: npm install -g .'));
    execSync('npm install -g .', { 
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });
  } catch (error) {
    throw new Error(`Failed to install globally: ${error}`);
  }
}

interface MCPClient {
  name: string;
  configPath: string;
  type: 'claude-desktop' | 'vscode' | 'other';
}

function detectMCPClients(): MCPClient[] {
  const clients: MCPClient[] = [];
  const home = homedir();

  // Check for Claude Desktop
  const claudeConfigPaths = [
    join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), // macOS
    join(home, '.config', 'Claude', 'claude_desktop_config.json'), // Linux
    join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'), // Windows
  ];

  for (const path of claudeConfigPaths) {
    if (existsSync(path)) {
      clients.push({
        name: 'Claude Desktop',
        configPath: path,
        type: 'claude-desktop',
      });
      break;
    }
  }

  // Check for VS Code (future support)
  const vscodeConfigPath = join(home, '.vscode', 'mcp-config.json');
  if (existsSync(vscodeConfigPath)) {
    clients.push({
      name: 'VS Code',
      configPath: vscodeConfigPath,
      type: 'vscode',
    });
  }

  return clients;
}

function configureClient(client: MCPClient): void {
  const logger = getLogger();
  switch (client.type) {
    case 'claude-desktop':
      configureClaudeDesktop(client.configPath);
      break;
    case 'vscode':
      logger.info(chalk.yellow('  VS Code configuration coming soon...'));
      break;
    default:
      logger.info(chalk.yellow(`  Unknown client type: ${client.type}`));
  }
}

function configureClaudeDesktop(configPath: string): void {
  const logger = getLogger();
  let config: MCPConfig = {};

  // Read existing config if it exists
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      config = JSON.parse(content) as MCPConfig;
      logger.info(chalk.dim('  Existing configuration found, updating...'));
    } catch (error) {
      logger.info(chalk.yellow('  Warning: Could not parse existing config, creating new one'));
    }
  } else {
    logger.info(chalk.dim('  Creating new configuration...'));
    // Ensure directory exists
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Initialize mcpServers if it doesn't exist
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Add or update tree-sitter-mcp configuration
  config.mcpServers['tree-sitter-mcp'] = {
    command: 'tree-sitter-mcp',
    args: ['--mcp'],
    env: {
      TREE_SITTER_MCP_LOG_LEVEL: 'info',
    },
  };

  // Write updated config
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  logger.info(chalk.green('  ✓ Claude Desktop configured'));
}

function createDefaultConfig(): void {
  const logger = getLogger();
  const home = homedir();
  const configDir = join(home, '.config', 'tree-sitter-mcp');
  const configPath = join(configDir, 'config.json');

  if (existsSync(configPath)) {
    logger.info(chalk.dim('\n📁 Default config already exists at:'));
    logger.info(chalk.cyan(`  ${configPath}`));
    return;
  }

  logger.info(chalk.cyan('\n📁 Creating default configuration...'));

  // Create directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Create default config
  const defaultConfig = {
    workingDir: '.',
    languages: [],
    maxDepth: 10,
    ignoreDirs: [
      '.git',
      'node_modules',
      '.node_modules',
      'vendor',
      'target',
      'build',
      'dist',
      'out',
      'coverage',
      '.next',
      '.nuxt',
      '.cache',
    ],
    verbose: false,
    quiet: false,
    maxProjects: 4,
    maxMemoryMB: 1024,
    watcherPollInterval: 2000,
  };

  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  logger.info(chalk.green('  ✓ Default config created at:'));
  logger.info(chalk.cyan(`    ${configPath}`));
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runSetup();
  } catch (error) {
    const logger = getLogger();
    logger.error('Setup script error:', error);
  }
}