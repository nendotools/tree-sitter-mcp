# Tree-Sitter MCP

A Model Context Protocol (MCP) server that provides fast, in-memory code search and analysis using [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) parsers. This server enables LLMs to efficiently navigate and understand codebases through semantic AST indexing with intelligent file watching.

## Key Features

- **Fast and lightweight**. In-memory AST indexing delivers <100ms search times.
- **Semantic understanding**. Search by function, class, method, interface - not just text.
- **Automatic synchronization**. File watchers keep the index current with 2-second debouncing.
- **Multi-language support**. JavaScript, TypeScript, Python, Go, Rust, Java, C/C++.

## Setup

**Quick setup (automatic):**

```bash
npm install -g @nendo/tree-sitter-mcp
tree-sitter-mcp setup --quick --auto
```

**Interactive setup:**

```bash
npm install -g @nendo/tree-sitter-mcp
tree-sitter-mcp setup
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

To enable debug logging, add the `env` section to your MCP configuration:

```json
{
  "mcpServers": {
    "tree-sitter": {
      "command": "npx",
      "args": ["@nendo/tree-sitter-mcp@latest", "--mcp"],
      "env": {
        "TREE_SITTER_MCP_DEBUG": "true"
      }
    }
  }
}
```

This writes detailed logs to `logs/mcp-server.log` in the project directory.

## How It Works

Tree-Sitter MCP maintains an in-memory index of your codebase's abstract syntax tree (AST). When you search, it queries this pre-parsed structure rather than scanning files, delivering instant results.

1. **On first search** - Automatically indexes the project directory
2. **File watching** - Monitors changes and updates the index incrementally
3. **Memory management** - LRU eviction keeps memory usage under control
4. **Smart debouncing** - Batches rapid file changes to minimize re-parsing

## Supported Languages

| Language   | Extensions            | Search Elements                |
| ---------- | --------------------- | ------------------------------ |
| JavaScript | `.js`, `.jsx`, `.mjs` | Functions, Classes, Variables  |
| TypeScript | `.ts`, `.tsx`         | + Interfaces, Types, Enums     |
| Python     | `.py`                 | Functions, Classes, Methods    |
| Go         | `.go`                 | Functions, Structs, Interfaces |
| Rust       | `.rs`                 | Functions, Structs, Traits     |
| Java       | `.java`               | Classes, Methods, Interfaces   |
| C/C++      | `.c`, `.cpp`, `.h`    | Functions, Structs, Classes    |

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

