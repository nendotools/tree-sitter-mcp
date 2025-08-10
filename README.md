# Tree-Sitter MCP

A Model Context Protocol (MCP) server that provides fast, in-memory code search and analysis using [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) parsers. This server enables LLMs to efficiently navigate and understand codebases through semantic AST indexing with intelligent file watching.

## Key Features

- **Fast and lightweight**. In-memory AST indexing delivers <100ms search times.
- **Semantic understanding**. Search by function, class, method, interface - not just text.
- **Automatic synchronization**. File watchers keep the index current with 2-second debouncing.
- **Multi-language support**. JavaScript, TypeScript, Python, Go, Rust, Java, C/C++.

## Quick Setup

**Install and configure automatically:**

```bash
npm install -g tree-sitter-mcp
tree-sitter-mcp setup
```

This will auto-detect your MCP clients (Claude Desktop, Claude Code, VS Code, Cursor, Windsurf, Gemini CLI, Qwen CLI) and configure them automatically.

## Manual Setup

### Use with NPX (Recommended)

Add this to your MCP client configuration:

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

### Configuration Locations

**Claude Desktop:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Claude Code:**
- `~/.claude.json`
- `~/.claude/settings.local.json`

**Gemini CLI:**
- `~/.gemini/settings.json`

**Qwen CLI:**
- `~/.cursor/mcp.json`

**VS Code / Cursor / Windsurf:**
- Open command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
- Run "MCP: Edit Settings"
- Add the configuration above

### Global Installation

If you prefer a global installation:

```bash
npm install -g tree-sitter-mcp
```

Then use this configuration:

```json
{
  "mcpServers": {
    "tree-sitter": {
      "command": "tree-sitter-mcp"
    }
  }
}
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

### `find_usage`
Find all lines where a specific function, variable, class, or identifier is used.

**Parameters:**
- `projectId` - Project to search in
- `identifier` - Function, variable, class, or identifier name
- `languages` - Filter by programming languages
- `pathPattern` - Filter by file path pattern
- `maxResults` - Maximum number of results (default: 100)
- `exactMatch` - Require exact identifier match with word boundaries
- `caseSensitive` - Case sensitive search (default: false)

**Example:**
```json
{
  "projectId": "my-app",
  "identifier": "handleRequest",
  "languages": ["typescript", "javascript"],
  "exactMatch": true
}
```

### `destroy_project`
Free memory by removing a project from the index.

## Debug Logging

To enable detailed debug logging for troubleshooting, set the environment variable:

```bash
TREE_SITTER_MCP_DEBUG=true npx tree-sitter-mcp@latest
```

This will:
- Enable verbose logging output
- Write detailed logs to `logs/mcp-server.log` 
- Show file walking, parsing, and indexing details
- Display memory usage and performance metrics

**Note:** Debug logging is disabled by default for optimal performance.

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

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request.

## Acknowledgments

Built with [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) and the [Model Context Protocol](https://modelcontextprotocol.io).