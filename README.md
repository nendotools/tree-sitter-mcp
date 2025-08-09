# Tree-Sitter MCP

A Model Context Protocol (MCP) server that provides fast, in-memory code search and analysis using [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) parsers. This server enables LLMs to efficiently navigate and understand codebases through semantic AST indexing with intelligent file watching.

## Key Features

- **Fast and lightweight**. In-memory AST indexing delivers <100ms search times.
- **Semantic understanding**. Search by function, class, method, interface - not just text.
- **Automatic synchronization**. File watchers keep the index current with 2-second debouncing.
- **Multi-language support**. JavaScript, TypeScript, Python, Go, Rust, Java, C/C++.

## Requirements

- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop, or any other MCP client

## Getting Started

First, install the Tree-Sitter MCP server with your client.

**Standard config** works in most tools:

```json
{
  "mcpServers": {
    "tree-sitter": {
      "command": "npx",
      "args": [
        "tree-sitter-mcp@latest"
      ]
    }
  }
}
```

### VS Code / Cursor / Windsurf

Add to your MCP settings file (in VS Code: `Cmd+Shift+P` → "MCP: Edit Settings"):

```json
{
  "mcpServers": {
    "tree-sitter": {
      "command": "npx",
      "args": ["tree-sitter-mcp@latest"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tree-sitter": {
      "command": "npx",
      "args": ["tree-sitter-mcp@latest"]
    }
  }
}
```

### Local Development

```bash
git clone https://github.com/your-username/tree-sitter-mcp.git
cd tree-sitter-mcp
yarn install
yarn build

# Run MCP server
yarn mcp

# Or install globally
yarn global-install
tree-sitter-mcp setup
```

## Configuration

Create a config file at `~/.config/tree-sitter-mcp/config.json`:

```json
{
  "workingDir": "./src",
  "languages": ["typescript", "javascript"],
  "maxProjects": 4,
  "maxMemoryMB": 1024,
  "ignoreDirs": ["node_modules", ".git", "dist"]
}
```

### Command Line Options

```bash
tree-sitter-mcp --help           # Show all options
tree-sitter-mcp --languages      # List supported languages
tree-sitter-mcp --verbose        # Enable verbose logging
tree-sitter-mcp --config ./custom-config.json
```

## Tools

The server provides the following MCP tools:

### `search_code`
Search for code elements across your project with semantic understanding.

**Parameters:**
- `projectId` - Unique identifier for the project
- `query` - Search term (function name, class name, etc.)
- `types` - Filter by element types: `function`, `method`, `class`, `interface`
- `languages` - Filter by programming languages
- `exactMatch` - Use exact string matching (default: false)
- `pathPattern` - Filter files by glob pattern

**Example:**
```json
{
  "projectId": "my-app",
  "query": "handleRequest",
  "types": ["function", "method"],
  "languages": ["typescript"]
}
```

### `initialize_project`
Pre-load a project into memory for faster searches.

**Parameters:**
- `projectId` - Unique identifier
- `directory` - Project root directory
- `languages` - Languages to index
- `autoWatch` - Enable file watching (default: true)

### `project_status`
Get memory usage and indexing statistics.

### `update_file`
Manually trigger re-parsing of a specific file.

### `destroy_project`
Free memory by removing a project from the index.

## How It Works

Tree-Sitter MCP maintains an in-memory index of your codebase's abstract syntax tree (AST). When you search, it queries this pre-parsed structure rather than scanning files, delivering instant results.

1. **On first search** - Automatically indexes the project directory
2. **File watching** - Monitors changes and updates the index incrementally
3. **Memory management** - LRU eviction keeps memory usage under control
4. **Smart debouncing** - Batches rapid file changes to minimize re-parsing

## Supported Languages

| Language | Extensions | Search Elements |
|----------|-----------|-----------------|
| JavaScript | `.js`, `.jsx`, `.mjs` | Functions, Classes, Variables |
| TypeScript | `.ts`, `.tsx` | + Interfaces, Types, Enums |
| Python | `.py` | Functions, Classes, Methods |
| Go | `.go` | Functions, Structs, Interfaces |
| Rust | `.rs` | Functions, Structs, Traits |
| Java | `.java` | Classes, Methods, Interfaces |
| C/C++ | `.c`, `.cpp`, `.h` | Functions, Structs, Classes |

## Performance

- Parse time: 1-5 seconds for large codebases
- Search time: <100ms for indexed nodes
- Memory usage: 100-500MB per project
- File watch latency: 2-second debounced updates

## Development

```bash
yarn dev          # Run with hot reload
yarn build        # Build for production
yarn test         # Run tests
yarn typecheck    # Check types
```

## License

MIT

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Acknowledgments

Built with [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) and the [Model Context Protocol](https://modelcontextprotocol.io).