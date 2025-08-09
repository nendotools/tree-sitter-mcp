# Tree-Sitter MCP Service

Fast, in-memory code search and analysis using Tree-Sitter parsers. This Model Context Protocol (MCP) service maintains parsed AST trees in memory with intelligent file watching for instant code navigation.

## Features

- 🚀 **Instant Search**: In-memory AST indexing for <100ms search times
- 📡 **Smart File Watching**: Automatic incremental updates with 2-second debouncing
- 🧠 **Memory Management**: LRU eviction (4 projects max, 1GB limit)
- 🔍 **Type-Aware Search**: Find functions, classes, methods, interfaces by exact or fuzzy match
- 🌐 **Multi-Language**: JavaScript, TypeScript, Python, Go, Rust, Java, C/C++
- 🔄 **Auto-Initialization**: Projects initialize automatically on first search
- 📊 **Clean Architecture**: Modular design with separated concerns and no magic strings

## Installation

### Global Installation (Recommended)

```bash
# Install globally with yarn
yarn global add tree-sitter-mcp

# Or with npm
npm install -g tree-sitter-mcp

# Run setup to configure MCP clients
tree-sitter-mcp setup
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/tree-sitter-mcp.git
cd tree-sitter-mcp

# Install dependencies (Node 18+ required)
yarn install

# Build the project
yarn build

# Install globally from local build
yarn global-install

# Run interactive setup
tree-sitter-mcp setup
```

## Usage

### As MCP Server

The service runs as an MCP server that can be used with Claude Desktop or other MCP clients:

```bash
tree-sitter-mcp --mcp
```

### Standalone CLI

```bash
# List supported languages with extensions
tree-sitter-mcp languages

# Analyze current directory
tree-sitter-mcp analyze

# Analyze specific directory with language filter
tree-sitter-mcp analyze ./src --languages typescript,javascript

# Output analysis to file
tree-sitter-mcp analyze ./src -o analysis.json --pretty

# Run with custom config
tree-sitter-mcp --mcp --config ./config.json

# Enable verbose logging
tree-sitter-mcp --mcp --verbose
```

### Configuration

Configuration file (`~/.config/tree-sitter-mcp/config.json`):

```json
{
  "workingDir": "./src",
  "languages": ["typescript", "javascript"],
  "maxDepth": 10,
  "ignoreDirs": [".git", "node_modules", "dist", "coverage", ".next"],
  "verbose": false,
  "quiet": false,
  "maxProjects": 4,
  "maxMemoryMB": 1024,
  "watcherPollInterval": 2000
}
```

## MCP Tools

### initialize_project
Pre-initialize a project for faster first search (optional - auto-initializes on first use).

```json
{
  "projectId": "my-app",
  "directory": "/path/to/project",
  "languages": ["typescript", "javascript"],
  "maxDepth": 10,
  "ignoreDirs": ["node_modules", ".git"],
  "autoWatch": true
}
```

### search_code
Search for code elements with smart matching. Auto-initializes and watches files.

```json
{
  "projectId": "my-app",
  "query": "handleRequest",
  "types": ["function", "method", "class", "interface"],
  "languages": ["typescript"],
  "exactMatch": false,
  "caseSensitive": false,
  "pathPattern": "**/src/**",
  "maxResults": 20
}
```

Returns: Element name, type, file path, line numbers, parameters, return types, and parent context.

### update_file
Force re-parse a specific file (rarely needed - watcher handles automatically).

```json
{
  "projectId": "my-app",
  "filePath": "/path/to/file.ts"
}
```

### project_status
Get memory usage, file counts, and watcher status.

```json
{
  "projectId": "my-app",
  "includeStats": true
}
```

### destroy_project
Free memory by removing a project and stopping its watcher.

```json
{
  "projectId": "my-app"
}
```

## Development

### Scripts

```bash
yarn dev          # Run in development mode with hot reload
yarn build        # Build for production
yarn test         # Run tests
yarn lint         # Run linter
yarn format       # Format code
yarn typecheck    # Check TypeScript types
```

### Architecture

```
src/
├── cli.ts              # CLI entry point with commander
├── setup.ts            # Interactive MCP client configuration
├── constants/          # Organized constants (no magic strings)
│   ├── service-constants.ts  # Memory, watcher config
│   ├── tree-constants.ts     # Node types, languages
│   └── mcp-constants.ts      # Tool names
├── types/              # TypeScript type definitions
│   ├── tree-types.ts   # AST node types
│   ├── project-types.ts # Project management
│   └── mcp-types.ts    # Tool arguments
├── core/               # Core functionality
│   ├── tree-manager.ts # In-memory AST storage with LRU
│   └── file-watcher.ts # Chokidar-based file monitoring
├── parsers/            # Language parser registry
└── mcp/                # MCP server and tool implementations
```

## Testing

```bash
# Run tests with Vitest
yarn test

# Run with coverage report
yarn test:coverage

# Watch mode for development
yarn test --watch
```

## Requirements

- Node.js 18 or higher
- Yarn or npm
- C++ build tools (for native tree-sitter bindings)

## Performance

- **Parse Time**: 1-5 seconds for large codebases
- **Search Time**: <100ms for indexed AST nodes
- **Memory Usage**: 100-500MB per project
- **File Watch Latency**: 2-second debounced updates
- **Concurrent Projects**: 4 with LRU eviction
- **Max Memory**: 1GB total (configurable)

## Supported Languages

| Language | Extensions | AST Support |
|----------|-----------|-------------|
| JavaScript | .js, .jsx, .mjs, .cjs | Functions, Classes, Variables |
| TypeScript | .ts, .tsx, .mts, .cts | + Interfaces, Types, Enums |
| Python | .py, .pyi | Functions, Classes, Methods |
| Go | .go | Functions, Structs, Interfaces |
| Rust | .rs | Functions, Structs, Traits, Impls |
| Java | .java | Classes, Methods, Interfaces |
| C | .c, .h | Functions, Structs, Enums |
| C++ | .cpp, .cc, .hpp | + Classes, Templates |

## License

MIT License

## Built With

- [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) - Incremental parsing library
- [Model Context Protocol](https://modelcontextprotocol.io) - AI tool integration
- [Chokidar](https://github.com/paulmillr/chokidar) - File watching
- [Commander](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal styling