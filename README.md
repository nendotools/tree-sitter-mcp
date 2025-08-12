# Tree-Sitter MCP

[![CI](https://github.com/nendotools/tree-sitter-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/nendotools/tree-sitter-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40nendo%2Ftree-sitter-mcp.svg)](https://www.npmjs.com/package/@nendo/tree-sitter-mcp)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A Model Context Protocol (MCP) server that provides fast, in-memory code search and analysis using [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) parsers. This server enables LLMs to efficiently navigate and understand codebases through semantic AST indexing with intelligent file watching.

## Key Features

- **Fast and lightweight**. In-memory AST indexing delivers <100ms search times.
- **Intelligent fuzzy matching**. Smart ranking with exact matches, prefix matching, word boundaries, and character sequences.
- **Semantic understanding**. Search by function, class, method, interface - not just text.
- **Mono-repo supported**. Sub-project reference isolation with optional cross-referencing.
- **Automatic synchronization**. File watchers keep the index current with 2-second debouncing.
- **Multi-language support**. 15+ languages including JavaScript, TypeScript, Python, Go, Rust, Java, C/C++, Ruby, C#, PHP, Kotlin, Scala, and Elixir.
- **Vue.js framework support**. Automatic component detection and indexing for Vue Single File Components (.vue files) in component directories.

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
- `types` - Filter by element types: `function`, `method`, `class`, `interface`, `component`
- `languages` - Filter by programming languages
- `exactMatch` - Use exact string matching (default: false)
- `priorityType` - Boost specific types in ranking: `function`, `method`, `class`, `interface`, `variable`
- `fuzzyThreshold` - Minimum match score to include (default: 30)
- `pathPattern` - Filter files by glob pattern

**Mono-repo Parameters:**

- `subProjects` - Array of specific sub-projects to search within
- `excludeSubProjects` - Array of sub-projects to exclude from search
- `crossProjectSearch` - Boolean to search across multiple sub-projects

**Examples:**

Fuzzy search with priority:
```json
{
  "projectId": "my-app",
  "query": "handleRequest",
  "types": ["function", "method"],
  "priorityType": "method",
  "languages": ["typescript"]
}
```

Exact search:
```json
{
  "projectId": "my-app",
  "query": "handleRequest",
  "exactMatch": true,
  "languages": ["typescript"]
}
```

Mono-repo: Search only in specific sub-project:
```json
{
  "projectId": "my-monorepo",
  "query": "DatabaseManager",
  "subProjects": ["backend"]
}
```

Mono-repo: Search across all sub-projects for shared interfaces:
```json
{
  "projectId": "my-monorepo", 
  "query": "ConfigInterface",
  "crossProjectSearch": true,
  "types": ["interface", "class"]
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

## Error Handling

All MCP tools return structured JSON error responses for AI-friendly consumption. When a tool fails, the response will be a JSON object with the following structure:

```json
{
  "category": "project|filesystem|parsing|search|validation|system",
  "message": "Human-readable error description",
  "code": "ERROR_CODE_IDENTIFIER",
  "context": {
    "key": "additional error details"
  }
}
```

**Error Categories:**

- `project` - Project-related errors (not found, already exists)
- `filesystem` - File system errors (path not found, permission denied)
- `parsing` - Language parsing errors (unsupported language, syntax errors)
- `search` - Search-related errors (invalid query, no results context)
- `validation` - Parameter validation errors (missing required fields)
- `system` - Internal system errors (memory exhausted, unexpected failures)

**Example Error Response:**

```json
{
  "category": "project",
  "message": "Project \"my-app\" not found",
  "code": "PROJECT_NOT_FOUND",
  "context": {
    "projectId": "my-app"
  }
}
```

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

| Language   | Extensions                  | Search Elements                      |
| ---------- | --------------------------- | ------------------------------------ |
| JavaScript | `.js`, `.jsx`, `.mjs`       | Functions, Classes, Variables        |
| TypeScript | `.ts`, `.tsx`               | + Interfaces, Types, Enums           |
| Python     | `.py`                       | Functions, Classes, Methods          |
| Go         | `.go`                       | Functions, Structs, Interfaces       |
| Rust       | `.rs`                       | Functions, Structs, Traits           |
| Java       | `.java`                     | Classes, Methods, Interfaces         |
| C          | `.c`, `.h`                  | Functions, Structs, Variables        |
| C++        | `.cpp`, `.cc`, `.cxx`, `.hpp` | Functions, Classes, Structs        |
| Ruby       | `.rb`                       | Classes, Methods, Modules            |
| C#         | `.cs`                       | Classes, Methods, Interfaces         |
| PHP        | `.php`, `.phtml`            | Classes, Functions, Methods          |
| Kotlin     | `.kt`, `.kts`               | Classes, Functions, Objects          |
| Scala      | `.scala`, `.sc`             | Classes, Objects, Traits             |
| Elixir     | `.ex`, `.exs`               | Modules, Functions, Structs          |
| Vue        | `.vue`                      | Components, Interfaces, Functions    |

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

