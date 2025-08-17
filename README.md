# Tree-Sitter MCP

[![CI](https://github.com/nendotools/tree-sitter-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/nendotools/tree-sitter-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40nendo%2Ftree-sitter-mcp.svg)](https://www.npmjs.com/package/@nendo/tree-sitter-mcp)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

Fast semantic code search and analysis for common programming languages. Search for functions and classes, trace code usage, and analyze code quality across your entire project.

Works as both a standalone CLI tool and an MCP server for AI tools like Claude Code.

## Getting Started

**Install:**

```bash
npm install -g @nendo/tree-sitter-mcp
```

**Search for code:**

```bash
tree-sitter-mcp search "handleRequest" --type function
```

**Analyze code quality:**

```bash
tree-sitter-mcp analyze --deadcode --structure
```

**Use with Claude Desktop:**

Add to `~/.config/claude-desktop/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tree-sitter-mcp": {
      "command": "npx",
      "args": ["@nendo/tree-sitter-mcp", "--mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

## Features

- **Semantic search** - Find functions, classes, and variables by name across 15+ languages
- **Usage tracing** - See where code is used before making changes
- **Quality analysis** - Detect complex functions, dead code, and architectural issues
- **Fast results** - Sub-100ms searches by parsing code structure, not scanning text
- **No configuration** - Works immediately on any project

## Supported Languages

JavaScript, TypeScript, Python, Go, Rust, Java, C/C++, Ruby, C#, PHP, Kotlin, Scala, Elixir

Config files: JSON, YAML, TOML, .env

## CLI Usage

**Search for code elements:**

```bash
tree-sitter-mcp search "DatabaseManager" --exact
tree-sitter-mcp search "handle.*Request" --type function method
```

**Find usage of identifiers:**

```bash
tree-sitter-mcp find-usage "UserService" --exact
tree-sitter-mcp find-usage "API_KEY" --case-sensitive
```

**Analyze code quality:**

```bash
tree-sitter-mcp analyze --quality --structure --deadcode
tree-sitter-mcp analyze src/components --quality
```

## MCP Tools

When used as an MCP server, provides these tools for AI assistants:

- `search_code` - Search for functions, classes, variables by name
- `find_usage` - Find all usages of identifiers across the project
- `analyze_code` - Comprehensive code quality and structure analysis

See the [full documentation](docs/) for detailed API reference.

## Installation Requirements

This package includes native components requiring build tools:

- **Windows**: Visual Studio Build Tools or `npm install --global windows-build-tools`
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `sudo apt-get install build-essential` (Ubuntu/Debian)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

- [Report bugs](https://github.com/nendotools/tree-sitter-mcp/issues)
- [Request features](https://github.com/nendotools/tree-sitter-mcp/issues)
- [Submit pull requests](https://github.com/nendotools/tree-sitter-mcp/pulls)

## License

GPL-3.0

## Acknowledgments

Built with [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) and the [Model Context Protocol](https://modelcontextprotocol.io).

