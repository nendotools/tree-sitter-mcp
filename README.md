# Tree-Sitter MCP Server

[![CI](https://github.com/nendotools/tree-sitter-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/nendotools/tree-sitter-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40nendo%2Ftree-sitter-mcp.svg)](https://www.npmjs.com/package/@nendo/tree-sitter-mcp)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A **Model Context Protocol (MCP) server** that provides fast, in-memory code search, usage analysis, and quality assessment using [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) parsers. This **mcp-server** enables LLMs to efficiently navigate, understand, and analyze codebases through semantic AST indexing with intelligent file watching.

## Three Core Capabilities

Tree-Sitter MCP provides three essential tools for codebase exploration and quality analysis:

### 1. **`search_code`** - Find code elements instantly

- **Semantic search** across functions, classes, methods, interfaces, and config keys
- **Fuzzy matching** with intelligent ranking and exact match options
- **Multi-language support** for 20+ programming languages and configuration formats
- **Mono-repo aware** with sub-project isolation and cross-referencing

### 2. **`find_usage`** - Trace identifier usage across your codebase

- **Track dependencies** by finding where functions, variables, or config keys are used
- **Cross-file analysis** with context-aware line-by-line results
- **Configuration tracing** to understand how environment variables flow through your code
- **Impact analysis** for safe refactoring and dependency management

### 3. **`analyze_code`** - Comprehensive code quality assessment

- **Quality analysis**: Detects complex functions, long methods (>50 lines), high parameter counts (>6), calculates quality scores
- **Structure analysis**: Finds circular dependencies, high coupling, deep HTML nesting (>10 levels), architectural issues
- **Dead code analysis**: Identifies unused exports, orphaned files, unreferenced dependencies for optimization
- **Config validation**: Validates JSON/YAML configs, semver formats, URLs in package.json, configuration consistency

## Key Features

- **Fast and lightweight**. In-memory AST indexing delivers <100ms search times.
- **Intelligent fuzzy matching**. Smart ranking with exact matches, prefix matching, word boundaries, and character sequences.
- **Semantic understanding**. Search by function, class, method, interface - not just text.
- **Mono-repo supported**. Sub-project reference isolation with optional cross-referencing.
- **Automatic synchronization**. File watchers keep the index current with 2-second debouncing.
- **Multi-language support**. 20+ languages including JavaScript, TypeScript, Python, Go, Rust, Java, C/C++, Ruby, C#, PHP, Kotlin, Scala, and Elixir.
- **Vue.js framework support**. Automatic component detection and indexing for Vue Single File Components (.vue files) in component directories.
- **Configuration file parsing**. Native support for JSON, YAML, TOML, and .env files with structured key-value indexing.
- **Comprehensive config coverage**. Handles .env.\* wildcard patterns, JSONC comments, and all major config formats.

## Installation Requirements

This package includes native binary components that require C++ build tools during installation:

**Windows:**

- Visual Studio Build Tools 2017 or later, OR
- Visual Studio Community/Professional with C++ workload, OR
- Windows Build Tools: `npm install --global windows-build-tools`

**macOS:**

- Xcode Command Line Tools: `xcode-select --install`

**Linux:**

- Ubuntu/Debian: `sudo apt-get install build-essential`
- CentOS/RHEL: `sudo yum groupinstall "Development Tools"`
- Alpine: `apk add build-base`

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

## Core Tools Reference

### `search_code` - Semantic Code Search

Search for code elements across your project with semantic understanding.

**Parameters:**

- `projectId` - Unique identifier for the project
- `query` - Search term (function name, class name, etc.)
- `types` - Filter by element types: `function`, `method`, `class`, `interface`, `component`, `file`
- `languages` - Filter by programming languages and config formats
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

Search config files:

```json
{
  "projectId": "my-app",
  "query": "DATABASE_URL",
  "types": ["constant"],
  "languages": ["env", "json", "yaml"]
}
```

Find API endpoints in config:

```json
{
  "projectId": "my-app",
  "query": "api_endpoint",
  "languages": ["yaml", "json"],
  "pathPattern": "config/**"
}
```

### `find_usage` - Identifier Usage Analysis

Find all lines where a specific function, variable, class, or identifier is used.

**Parameters:**

- `projectId` - Project to search in
- `identifier` - Function, variable, class, config key, or identifier name
- `languages` - Filter by programming languages and config formats
- `pathPattern` - Filter by file path pattern
- `maxResults` - Maximum number of results (default: 100)
- `exactMatch` - Require exact identifier match with word boundaries
- `caseSensitive` - Case sensitive search (default: false)

**Examples:**

Find function usage:

```json
{
  "projectId": "my-app",
  "identifier": "handleRequest",
  "languages": ["typescript", "javascript"],
  "exactMatch": true
}
```

Find config key usage:

```json
{
  "projectId": "my-app",
  "identifier": "DATABASE_URL",
  "languages": ["env", "yaml", "typescript"]
}
```

### `analyze_code` - Comprehensive Code Analysis

**COMPREHENSIVE CODE ANALYSIS** - Performs deep architectural and quality analysis beyond what linters provide. Returns structured JSON with actionable findings and metrics across four analysis types.

**Auto-initialization**: If the specified project doesn't exist or isn't initialized, the analyzer will automatically create and index the project before analysis, making it seamless to analyze any codebase without manual setup.

**Parameters:**

- `projectId` - Project to analyze (auto-created if not exists)
- `directory` - Project directory (optional, defaults to current directory when auto-initializing)
- `analysisTypes` - Analysis types: quality (complexity/method length), structure (dependencies/coupling), deadcode (unused code), config-validation (JSON/package.json validation)
- `scope` - Analysis scope: project (entire codebase), file (single file), method (specific function/method)
- `target` - Specific file path (e.g., "src/utils/helper.ts") or method name when scope is file/method
- `includeMetrics` - Include quantitative metrics (complexity averages, file counts, quality scores) in addition to specific findings
- `severity` - Show only issues at or above this severity level (critical=blocking issues, warning=should fix, info=suggestions)

**Four Analysis Types:**

1. **Quality Analysis** (`quality`)
   - **Detects:** Complex functions, long methods (>50 lines), high parameter counts (>6)
   - **Calculates:** Code quality scores, complexity averages, method length statistics
   - **Use for:** Code reviews, identifying refactoring candidates, technical debt assessment

2. **Structure Analysis** (`structure`)
   - **Finds:** Circular dependencies, high coupling, deep HTML nesting (>10 levels)
   - **Analyzes:** Architectural issues, file dependency mapping, component relationships
   - **Use for:** Architectural validation, dependency management, maintainability assessment

3. **Dead Code Analysis** (`deadcode`)
   - **Identifies:** Unused exports, orphaned files, unreferenced dependencies
   - **Tracks:** Code that can be safely removed, optimization opportunities
   - **Use for:** Bundle size optimization, codebase cleanup, maintenance reduction

4. **Config Validation** (`config-validation`)
   - **Validates:** JSON/YAML configs, semver formats, URLs in package.json
   - **Checks:** Package.json structure, tsconfig.json validity, configuration consistency
   - **Use for:** Build reliability, deployment validation, configuration management

**Output Format:**

Returns structured JSON object with:

- **Project metadata** (id, analysis types, scope, target)
- **Summary statistics** (totalIssues, severity breakdown by critical/warning/info)
- **Quantitative metrics** (complexity averages, file counts, quality scores by category)
- **Detailed findings array** with type, category, severity, description, location, context, and metrics
- **Perfect for programmatic consumption** (dashboards, CI/CD, automated workflows)

**Examples:**

Full project analysis:

```json
{
  "projectId": "my-app",
  "analysisTypes": ["quality", "structure", "deadcode", "config-validation"],
  "scope": "project"
}
```

Quality analysis only:

```json
{
  "projectId": "my-app",
  "analysisTypes": ["quality"],
  "scope": "project",
  "severityFilter": "warning"
}
```

Single file analysis:

```json
{
  "projectId": "my-app",
  "analysisTypes": ["quality", "structure"],
  "scope": "file",
  "target": "src/utils/helper.ts"
}
```

**Sample Analysis Output:**

```json
{
  "project": {
    "id": "my-app",
    "analysisTypes": ["quality", "structure", "deadcode", "config-validation"],
    "scope": "project",
    "target": null
  },
  "summary": {
    "totalIssues": 12,
    "severityBreakdown": {
      "critical": 2,
      "warning": 7,
      "info": 3
    }
  },
  "metrics": {
    "quality": {
      "avgComplexity": 3.2,
      "avgMethodLength": 15.8,
      "avgParameters": 2.1,
      "totalMethods": 145,
      "codeQualityScore": 7.8
    },
    "structure": {
      "analyzedFiles": 23,
      "circularDependencies": 1,
      "highCouplingFiles": 3,
      "htmlFiles": 5,
      "maxNestingDepth": 12
    },
    "deadCode": {
      "orphanedFiles": 2,
      "unusedExports": 8,
      "unusedDependencies": 1
    },
    "configValidation": {
      "validatedFiles": 4,
      "validationErrors": 3,
      "criticalErrors": 1
    }
  },
  "findings": [
    {
      "type": "quality",
      "category": "long_method",
      "severity": "warning",
      "description": "Method 'processLargeDataset' is very long (87 lines)",
      "location": "src/data/processor.ts:45",
      "context": "Consider extracting functionality into separate methods",
      "metrics": { "methodLength": 87, "complexity": 12 }
    },
    {
      "type": "structure",
      "category": "circular_dependency",
      "severity": "critical",
      "description": "Circular dependency detected",
      "location": "src/auth/manager.ts → src/user/service.ts → src/auth/manager.ts",
      "context": "Circular dependencies can cause runtime errors and make code difficult to test",
      "metrics": null
    },
    {
      "type": "config-validation",
      "category": "validation_error",
      "severity": "critical",
      "description": "Invalid version format: \"not-a-semver\". Must follow semantic versioning (e.g., 1.0.0)",
      "location": "package.json",
      "context": "Configuration validation failed for package.json file",
      "metrics": null
    }
  ]
}
```

## Supporting Tools

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

### Programming Languages

| Language   | Extensions                    | Search Elements                   |
| ---------- | ----------------------------- | --------------------------------- |
| JavaScript | `.js`, `.jsx`, `.mjs`         | Functions, Classes, Variables     |
| TypeScript | `.ts`, `.tsx`                 | + Interfaces, Types, Enums        |
| Python     | `.py`                         | Functions, Classes, Methods       |
| Go         | `.go`                         | Functions, Structs, Interfaces    |
| Rust       | `.rs`                         | Functions, Structs, Traits        |
| Java       | `.java`                       | Classes, Methods, Interfaces      |
| C          | `.c`, `.h`                    | Functions, Structs, Variables     |
| C++        | `.cpp`, `.cc`, `.cxx`, `.hpp` | Functions, Classes, Structs       |
| Ruby       | `.rb`                         | Classes, Methods, Modules         |
| C#         | `.cs`                         | Classes, Methods, Interfaces      |
| PHP        | `.php`, `.phtml`              | Classes, Functions, Methods       |
| Kotlin     | `.kt`, `.kts`                 | Classes, Functions, Objects       |
| Scala      | `.scala`, `.sc`               | Classes, Objects, Traits          |
| Elixir     | `.ex`, `.exs`                 | Modules, Functions, Structs       |
| Vue        | `.vue`                        | Components, Interfaces, Functions |

### Configuration Files

| Format      | Extensions                  | Search Elements                |
| ----------- | --------------------------- | ------------------------------ |
| JSON        | `.json`, `.json5`, `.jsonc` | Keys, Values, Nested Objects   |
| YAML        | `.yaml`, `.yml`             | Keys, Values, Arrays, Comments |
| TOML        | `.toml`                     | Sections, Keys, Values, Tables |
| Environment | `.env*` (wildcard)          | Variables, Values, Comments    |

**Config File Examples:**

- `.env`, `.env.local`, `.env.production` (Environment variables)
- `package.json`, `tsconfig.json`, `.vscode/settings.json` (JSON)
- `docker-compose.yml`, `.github/workflows/*.yml` (YAML)
- `Cargo.toml`, `pyproject.toml` (TOML)

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

