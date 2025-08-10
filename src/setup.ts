import { homedir } from 'os'
import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { fileURLToPath } from 'url'
import { getLogger } from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface MCPConfig {
  mcpServers?: {
    [key: string]: {
      command: string
      args?: string[]
      env?: Record<string, string>
    }
  }
}

interface MCPClient {
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

type SetupMode = 'quick' | 'manual' | 'npm' | 'global' | 'config-only'

export async function runSetup(): Promise<void> {
  const logger = getLogger()

  const args = process.argv.slice(2)
  let mode: SetupMode | undefined

  if (args.includes('--quick')) {
    mode = 'quick'
  }
  else if (args.includes('--npm') || args.includes('--npx')) {
    mode = 'npm'
  }
  else if (args.includes('--global')) {
    mode = 'global'
  }
  else if (args.includes('--manual')) {
    mode = 'manual'
  }
  else if (args.includes('--config-only')) {
    mode = 'config-only'
  }

  if (!mode) {
    logger.info(chalk.cyan.bold('\nTree-Sitter MCP Setup\n'))
    logger.info(chalk.dim('Fast, in-memory code search for LLMs\n'))
  }
  else {
    logger.info(chalk.cyan.bold('\nTree-Sitter MCP Setup\n'))
  }

  try {
    if (!mode) {
      mode = await chooseSetupMode()
    }

    switch (mode) {
      case 'quick':
        await quickSetup()
        break
      case 'manual':
        await manualSetup()
        break
      case 'npm':
        await npmSetup()
        break
      case 'global':
        await globalSetup()
        break
      case 'config-only':
        await configOnlySetup()
        break
    }

    logger.info(chalk.green.bold('\n[SUCCESS] Setup complete!\n'))
    logger.info(chalk.dim('For more information:'))
    logger.info(chalk.white('  https://github.com/your-username/tree-sitter-mcp\n'))
  }
  catch (error) {
    if (error instanceof Error && error.message === 'User cancelled') {
      logger.info(chalk.yellow('\nSetup cancelled\n'))
    }
    else {
      logger.error(chalk.red('\n[ERROR] Setup failed:'), error)
      process.exit(1)
    }
  }
}

async function chooseSetupMode(): Promise<SetupMode> {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to set up Tree-Sitter MCP?',
      choices: [
        {
          name: '[QUICK] Auto-detect and configure MCP clients',
          value: 'quick',
        },
        {
          name: '[NPM/NPX] Use with npx (recommended for most users)',
          value: 'npm',
        },
        {
          name: '[GLOBAL] Install globally on this machine',
          value: 'global',
        },
        {
          name: '[MANUAL] Show configuration instructions',
          value: 'manual',
        },
        {
          name: '[CONFIG] Just create the config file',
          value: 'config-only',
        },
      ],
    },
  ])

  return mode as SetupMode
}

async function quickSetup(): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.cyan('\n[DETECT] Scanning for MCP clients...\n'))

  const clients = detectMCPClients()

  if (clients.length === 0) {
    logger.info(chalk.yellow('No MCP clients detected.\n'))

    if (process.argv.includes('--auto')) {
      logger.info(chalk.dim('Run without --auto flag for manual setup options.'))
      return
    }

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Would you like to see manual setup instructions instead?',
        default: true,
      },
    ])

    if (proceed) {
      await manualSetup()
    }
    return
  }

  logger.info(chalk.green(`Found ${clients.length} MCP client(s):\n`))
  clients.forEach((client) => {
    logger.info(`  • ${chalk.bold(client.name)}`)
    logger.info(`    ${chalk.dim(client.configPath)}`)
  })

  const isAuto = process.argv.includes('--auto')

  let selectedClients: MCPClient[]
  let installMethod: 'npx' | 'global'

  if (isAuto) {
    selectedClients = clients
    installMethod = 'npx'
    logger.info(chalk.cyan('\n[AUTO] Configuring all detected clients with npx...\n'))
  }
  else {
    const clientSelection = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedClients',
        message: '\nWhich clients would you like to configure?',
        choices: clients.map(client => ({
          name: client.name,
          value: client,
          checked: true,
        })),
      },
    ])

    selectedClients = clientSelection.selectedClients

    if (selectedClients.length === 0) {
      logger.info(chalk.yellow('\nNo clients selected.\n'))
      return
    }

    const methodSelection = await inquirer.prompt([
      {
        type: 'list',
        name: 'installMethod',
        message: 'How should the MCP server be installed?',
        choices: [
          {
            name: 'Use npx (recommended - always uses latest version)',
            value: 'npx',
          },
          {
            name: 'Use global installation (requires npm install -g)',
            value: 'global',
          },
        ],
      },
    ])

    installMethod = methodSelection.installMethod
  }

  for (const client of selectedClients) {
    logger.info(chalk.cyan(`\n[CONFIG] Setting up ${client.name}...`))
    await configureClient(client, installMethod)
  }

  await createDefaultConfig()
}

async function npmSetup(): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.cyan('\n=== NPM/NPX Setup ===\n'))
  logger.info(chalk.white('Add this to your MCP client configuration:\n'))

  const config = {
    mcpServers: {
      'tree-sitter': {
        command: 'npx',
        args: ['tree-sitter-mcp@latest'],
      },
    },
  }

  logger.info(chalk.gray(JSON.stringify(config, null, 2)))

  logger.info(chalk.cyan('\n📍 Configuration locations:\n'))

  logger.info(chalk.white('Claude Desktop:'))
  logger.info(
    chalk.dim('  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json'),
  )
  logger.info(chalk.dim('  Linux: ~/.config/Claude/claude_desktop_config.json'))
  logger.info(chalk.dim('  Windows: %APPDATA%\\Claude\\claude_desktop_config.json\n'))

  logger.info(chalk.white('VS Code / Cursor / Windsurf:'))
  logger.info(chalk.dim('  1. Open command palette (Cmd+Shift+P or Ctrl+Shift+P)'))
  logger.info(chalk.dim('  2. Run "MCP: Edit Settings"'))
  logger.info(chalk.dim('  3. Add the configuration shown above\n'))

  await createDefaultConfig()
}

async function globalSetup(): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.cyan('\n=== Global Installation ===\n'))

  const isGlobal = checkGlobalInstallation()

  if (!isGlobal) {
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Install tree-sitter-mcp globally?',
        default: true,
      },
    ])

    if (!proceed) {
      return
    }

    logger.info(chalk.yellow('\nInstalling globally...'))
    installGlobally()
    logger.info(chalk.green('[OK] Installed globally\n'))
  }
  else {
    logger.info(chalk.green('[OK] Already installed globally\n'))
  }

  logger.info(chalk.white('Add this to your MCP client configuration:\n'))

  const config = {
    mcpServers: {
      'tree-sitter': {
        command: 'tree-sitter-mcp',
        args: ['--mcp'],
      },
    },
  }

  logger.info(chalk.gray(JSON.stringify(config, null, 2)))

  const { showLocations } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showLocations',
      message: '\nShow configuration file locations?',
      default: true,
    },
  ])

  if (showLocations) {
    logger.info(chalk.cyan('\n📍 Configuration locations:\n'))
    showConfigLocations()
  }

  await createDefaultConfig()
}

async function manualSetup(): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.cyan('\n=== Manual Setup Instructions ===\n'))

  const { method } = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: 'Choose your installation method:',
      choices: [
        {
          name: 'NPX (no installation required)',
          value: 'npx',
        },
        {
          name: 'Global installation',
          value: 'global',
        },
        {
          name: 'Local development',
          value: 'local',
        },
      ],
    },
  ])

  logger.info(chalk.cyan('\n📋 Configuration:\n'))

  switch (method) {
    case 'npx':
      logger.info(chalk.white('Add this to your MCP client configuration:\n'))
      logger.info(
        chalk.gray(
          JSON.stringify(
            {
              mcpServers: {
                'tree-sitter': {
                  command: 'npx',
                  args: ['tree-sitter-mcp@latest'],
                },
              },
            },
            null,
            2,
          ),
        ),
      )
      break

    case 'global':
      logger.info(chalk.white('1. Install globally:\n'))
      logger.info(chalk.gray('   npm install -g tree-sitter-mcp\n'))
      logger.info(chalk.white('2. Add this to your MCP client configuration:\n'))
      logger.info(
        chalk.gray(
          JSON.stringify(
            {
              mcpServers: {
                'tree-sitter': {
                  command: 'tree-sitter-mcp',
                  args: ['--mcp'],
                },
              },
            },
            null,
            2,
          ),
        ),
      )
      break

    case 'local':
      logger.info(chalk.white('1. Clone and build:\n'))
      logger.info(chalk.gray('   git clone https://github.com/your-username/tree-sitter-mcp.git'))
      logger.info(chalk.gray('   cd tree-sitter-mcp'))
      logger.info(chalk.gray('   npm install'))
      logger.info(chalk.gray('   npm run build\n'))
      logger.info(chalk.white('2. Add this to your MCP client configuration:\n'))
      logger.info(
        chalk.gray(
          JSON.stringify(
            {
              mcpServers: {
                'tree-sitter': {
                  command: 'node',
                  args: ['/path/to/tree-sitter-mcp/dist/cli.js', '--mcp'],
                },
              },
            },
            null,
            2,
          ),
        ),
      )
      break
  }

  const { showLocations } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showLocations',
      message: '\nShow configuration file locations?',
      default: true,
    },
  ])

  if (showLocations) {
    logger.info(chalk.cyan('\n📍 Configuration locations:\n'))
    showConfigLocations()
  }

  await createDefaultConfig()
}

async function configOnlySetup(): Promise<void> {
  const logger = getLogger()

  logger.info(chalk.cyan('\n[CONFIG] Creating configuration file...\n'))

  await createDefaultConfig(true)
}

function showConfigLocations(): void {
  const logger = getLogger()

  logger.info(chalk.white('Claude Desktop:'))
  logger.info(
    chalk.dim('  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json'),
  )
  logger.info(chalk.dim('  Linux: ~/.config/Claude/claude_desktop_config.json'))
  logger.info(chalk.dim('  Windows: %APPDATA%\\Claude\\claude_desktop_config.json\n'))

  logger.info(chalk.white('Claude Code:'))
  logger.info(chalk.dim('  ~/.claude.json'))
  logger.info(chalk.dim('  ~/.claude/settings.local.json\n'))

  logger.info(chalk.white('Gemini CLI:'))
  logger.info(chalk.dim('  ~/.gemini/settings.json\n'))

  logger.info(chalk.white('Qwen CLI:'))
  logger.info(chalk.dim('  ~/.cursor/mcp.json\n'))

  logger.info(chalk.white('VS Code / Cursor / Windsurf:'))
  logger.info(chalk.dim('  Open command palette → "MCP: Edit Settings"\n'))
}

function detectMCPClients(): MCPClient[] {
  const clients: MCPClient[] = []
  const home = homedir()

  const claudeConfigPaths = [
    join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), // macOS
    join(home, '.config', 'Claude', 'claude_desktop_config.json'), // Linux
    join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'), // Windows
  ]

  for (const path of claudeConfigPaths) {
    if (existsSync(path)) {
      clients.push({
        name: 'Claude Desktop',
        configPath: path,
        type: 'claude-desktop',
      })
      break
    }
  }

  const vscodeConfigPaths = [
    join(home, '.vscode', 'mcp', 'settings.json'),
    join(home, 'Library', 'Application Support', 'Code', 'User', 'settings.json'), // macOS
    join(home, '.config', 'Code', 'User', 'settings.json'), // Linux
  ]

  for (const path of vscodeConfigPaths) {
    if (existsSync(path)) {
      clients.push({
        name: 'VS Code',
        configPath: path,
        type: 'vscode',
      })
      break
    }
  }

  const cursorConfigPaths = [
    join(home, '.cursor', 'mcp', 'settings.json'),
    join(home, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'), // macOS
  ]

  for (const path of cursorConfigPaths) {
    if (existsSync(path)) {
      clients.push({
        name: 'Cursor',
        configPath: path,
        type: 'cursor',
      })
      break
    }
  }

  const windsurfConfigPath = join(home, '.windsurf', 'mcp-config.json')
  if (existsSync(windsurfConfigPath)) {
    clients.push({
      name: 'Windsurf',
      configPath: windsurfConfigPath,
      type: 'windsurf',
    })
  }

  const claudeCodeConfigPaths = [
    join(home, '.claude.json'),
    join(home, '.claude', 'settings.local.json'),
  ]

  for (const path of claudeCodeConfigPaths) {
    if (existsSync(path)) {
      clients.push({
        name: 'Claude Code',
        configPath: path,
        type: 'claude-code',
      })
      break
    }
  }

  const geminiConfigPaths = [join(home, '.gemini', 'settings.json')]

  for (const path of geminiConfigPaths) {
    if (existsSync(path)) {
      clients.push({
        name: 'Gemini CLI',
        configPath: path,
        type: 'gemini-cli',
      })
      break
    }
  }

  const qwenConfigPaths = [join(home, '.cursor', 'mcp.json')]

  for (const path of qwenConfigPaths) {
    if (existsSync(path)) {
      clients.push({
        name: 'Qwen CLI',
        configPath: path,
        type: 'qwen-cli',
      })
      break
    }
  }

  return clients
}

async function configureClient(client: MCPClient, method: 'npx' | 'global'): Promise<void> {
  const logger = getLogger()

  switch (client.type) {
    case 'claude-desktop':
      await configureClaudeDesktop(client.configPath, method)
      break

    case 'claude-code':
      await configureClaudeCode(client.configPath, method)
      break

    case 'gemini-cli':
    case 'qwen-cli':
      await configureCLIClient(client, method)
      break

    case 'vscode':
    case 'cursor':
    case 'windsurf': {
      logger.info(chalk.yellow(`  Automatic configuration for ${client.name} not yet supported`))
      logger.info(chalk.dim(`  Please add the configuration manually using:`))
      logger.info(chalk.dim(`  Command palette → "MCP: Edit Settings"`))

      const config
        = method === 'npx'
          ? { command: 'npx', args: ['tree-sitter-mcp@latest'] }
          : { command: 'tree-sitter-mcp', args: ['--mcp'] }

      logger.info(
        chalk.gray('\n' + JSON.stringify({ mcpServers: { 'tree-sitter': config } }, null, 2)),
      )
      break
    }

    default:
      logger.info(chalk.yellow(`  Unknown client type: ${client.type}`))
  }
}

async function configureClaudeDesktop(configPath: string, method: 'npx' | 'global'): Promise<void> {
  const logger = getLogger()
  let config: MCPConfig = {}

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8')
      config = JSON.parse(content) as MCPConfig
      logger.info(chalk.dim('  Updating existing configuration...'))
    }
    catch {
      logger.info(chalk.yellow('  Warning: Could not parse existing config, creating backup...'))
      const backupPath = `${configPath}.backup`
      writeFileSync(backupPath, readFileSync(configPath, 'utf-8'))
      logger.info(chalk.dim(`  Backup saved to: ${backupPath}`))
    }
  }
  else {
    logger.info(chalk.dim('  Creating new configuration...'))
    const dir = dirname(configPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  if (method === 'npx') {
    config.mcpServers['tree-sitter'] = {
      command: 'npx',
      args: ['tree-sitter-mcp@latest'],
    }
  }
  else {
    config.mcpServers['tree-sitter'] = {
      command: 'tree-sitter-mcp',
      args: ['--mcp'],
    }
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2))
  logger.info(chalk.green('  [OK] Claude Desktop configured'))
}

async function configureClaudeCode(configPath: string, method: 'npx' | 'global'): Promise<void> {
  const logger = getLogger()
  let config: any = {}

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8')
      config = JSON.parse(content)
      logger.info(chalk.dim('  Updating existing configuration...'))
    }
    catch {
      logger.info(chalk.yellow('  Warning: Could not parse existing config, creating backup...'))
      const backupPath = `${configPath}.backup`
      writeFileSync(backupPath, readFileSync(configPath, 'utf-8'))
      logger.info(chalk.dim(`  Backup saved to: ${backupPath}`))
    }
  }
  else {
    logger.info(chalk.dim('  Creating new configuration...'))
    const dir = dirname(configPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  if (!config.projects) {
    config.projects = {}
  }

  const currentDir = process.cwd()

  if (!config.projects[currentDir]) {
    config.projects[currentDir] = {}
  }

  if (!config.projects[currentDir].mcpServers) {
    config.projects[currentDir].mcpServers = {}
  }

  if (method === 'npx') {
    config.projects[currentDir].mcpServers['tree-sitter'] = {
      command: 'npx',
      args: ['tree-sitter-mcp@latest'],
    }
  }
  else {
    config.projects[currentDir].mcpServers['tree-sitter'] = {
      command: 'tree-sitter-mcp',
      args: ['--mcp'],
    }
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2))
  logger.info(chalk.green('  [OK] Claude Code configured'))
}

async function configureCLIClient(client: MCPClient, method: 'npx' | 'global'): Promise<void> {
  const logger = getLogger()
  let config: MCPConfig = {}

  if (existsSync(client.configPath)) {
    try {
      const content = readFileSync(client.configPath, 'utf-8')
      config = JSON.parse(content) as MCPConfig
      logger.info(chalk.dim('  Updating existing configuration...'))
    }
    catch {
      logger.info(chalk.yellow('  Warning: Could not parse existing config, creating backup...'))
      const backupPath = `${client.configPath}.backup`
      writeFileSync(backupPath, readFileSync(client.configPath, 'utf-8'))
      logger.info(chalk.dim(`  Backup saved to: ${backupPath}`))
    }
  }
  else {
    logger.info(chalk.dim('  Creating new configuration...'))
    const dir = dirname(client.configPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  if (method === 'npx') {
    config.mcpServers['tree-sitter'] = {
      command: 'npx',
      args: ['tree-sitter-mcp@latest'],
    }
  }
  else {
    config.mcpServers['tree-sitter'] = {
      command: 'tree-sitter-mcp',
      args: ['--mcp'],
    }
  }

  writeFileSync(client.configPath, JSON.stringify(config, null, 2))
  logger.info(chalk.green(`  [OK] ${client.name} configured`))
}

async function createDefaultConfig(interactive: boolean = false): Promise<void> {
  const logger = getLogger()
  const home = homedir()
  const configDir = join(home, '.config', 'tree-sitter-mcp')
  const configPath = join(configDir, 'config.json')

  if (existsSync(configPath)) {
    if (interactive) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Configuration file already exists. Overwrite?',
          default: false,
        },
      ])

      if (!overwrite) {
        logger.info(chalk.dim('\nKeeping existing configuration.'))
        return
      }
    }
    else {
      logger.info(chalk.dim('\n[INFO] Configuration already exists at:'))
      logger.info(chalk.cyan(`   ${configPath}`))
      return
    }
  }

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  const defaultConfig = {
    workingDir: '.',
    languages: [], // Empty means all supported languages
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
  }

  if (interactive) {
    const { customize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'customize',
        message: 'Would you like to customize the configuration?',
        default: false,
      },
    ])

    if (customize) {
      const customConfig = await customizeConfig(defaultConfig)
      writeFileSync(configPath, JSON.stringify(customConfig, null, 2))
    }
    else {
      writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
    }
  }
  else {
    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
  }

  logger.info(chalk.green('\n[OK] Configuration created at:'))
  logger.info(chalk.cyan(`   ${configPath}`))
}

async function customizeConfig(defaultConfig: any): Promise<any> {
  const { maxProjects, maxMemoryMB, watcherPollInterval } = await inquirer.prompt([
    {
      type: 'number',
      name: 'maxProjects',
      message: 'Maximum number of projects in memory:',
      default: defaultConfig.maxProjects,
    },
    {
      type: 'number',
      name: 'maxMemoryMB',
      message: 'Maximum memory usage (MB):',
      default: defaultConfig.maxMemoryMB,
    },
    {
      type: 'number',
      name: 'watcherPollInterval',
      message: 'File watcher poll interval (ms):',
      default: defaultConfig.watcherPollInterval,
    },
  ])

  return {
    ...defaultConfig,
    maxProjects,
    maxMemoryMB,
    watcherPollInterval,
  }
}

function checkGlobalInstallation(): boolean {
  try {
    const result = execSync('npm list -g tree-sitter-mcp', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    return result.includes('tree-sitter-mcp')
  }
  catch {
    return false
  }
}

function installGlobally(): void {
  const logger = getLogger()
  try {
    logger.info(chalk.dim('Running: npm install -g .'))
    execSync('npm install -g .', {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    })
  }
  catch (error) {
    throw new Error(`Failed to install globally: ${error}`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runSetup()
  }
  catch (error) {
    const logger = getLogger()
    logger.error('Setup script error:', error)
  }
}
