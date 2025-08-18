# CLI Reference

Complete command-line interface documentation for Tree-Sitter MCP.

## Installation

```bash
npm install -g @nendo/tree-sitter-mcp
```

## Commands

### `search`

Search for code elements by name.

```bash
tree-sitter-mcp search <query> [options]
```

**Options:**
- `--project-id <id>` - Project identifier for AST caching (auto-generated if not provided)
- `--type <types...>` - Filter by element types (function, class, variable, etc.)
- `--exact` - Use exact matching instead of fuzzy
- `--max-results <n>` - Maximum results to return (default: 20)
- `--fuzzy-threshold <n>` - Minimum fuzzy match score (default: 30)
- `--path-pattern <pattern>` - Filter files by glob pattern
- `--output <format>` - Output format: text, json, markdown (default: text)

**Examples:**
```bash
# Basic search
tree-sitter-mcp search "handleRequest"

# Search for functions only
tree-sitter-mcp search "handle" --type function method

# Exact match
tree-sitter-mcp search "DatabaseManager" --exact

# Search in specific files
tree-sitter-mcp search "config" --path-pattern "**/*.{ts,js}"

# JSON output
tree-sitter-mcp search "User" --output json
```

### `find-usage`

Find all usages of an identifier.

```bash
tree-sitter-mcp find-usage <identifier> [options]
```

**Options:**
- `--project-id <id>` - Project identifier for AST caching (auto-generated if not provided)
- `--exact` - Require exact identifier match (default: true)
- `--case-sensitive` - Case sensitive search
- `--max-results <n>` - Maximum results to return (default: 50)
- `--output <format>` - Output format: text, json, markdown (default: text)

**Examples:**
```bash
# Find function usage
tree-sitter-mcp find-usage "handleRequest"

# Case sensitive search
tree-sitter-mcp find-usage "API_KEY" --case-sensitive

# JSON output
tree-sitter-mcp find-usage "UserService" --output json
```

### `analyze`

Analyze code quality, structure, and dead code.

```bash
tree-sitter-mcp analyze [directory] [options]
```

**Options:**
- `--project-id <id>` - Project identifier for AST caching (auto-generated if not provided)
- `--quality` - Include quality analysis (default: true)
- `--structure` - Include structure analysis
- `--deadcode` - Include dead code analysis  
- `--severity <level>` - Minimum severity: info, warning, critical (default: info)
- `--output <format>` - Output format: text, json, markdown (default: text)
- `--metrics` - Include quantitative metrics

**Examples:**
```bash
# Basic quality analysis
tree-sitter-mcp analyze

# Full analysis
tree-sitter-mcp analyze --quality --structure --deadcode

# Analyze specific directory
tree-sitter-mcp analyze src/components

# Warning level and above
tree-sitter-mcp analyze --severity warning

# Markdown report
tree-sitter-mcp analyze --output markdown --metrics
```

### Global Options

Available for all commands:

- `--help` - Show help
- `--version` - Show version
- `--verbose` - Verbose output
- `--quiet` - Suppress non-error output

## Output Formats

### Text (Default)
Human-readable console output with colors and formatting.

### JSON
Machine-readable structured data for automation:
```bash
tree-sitter-mcp search "User" --output json | jq '.results[0].name'
```

### Markdown
Documentation-ready format for reports:
```bash
tree-sitter-mcp analyze --output markdown > code-analysis.md
```

## Examples

### CI/CD Integration

**Check for dead code:**
```bash
#!/bin/bash
dead_code=$(tree-sitter-mcp analyze --deadcode --output json | jq '.analysis.findings | length')
if [ "$dead_code" -gt 0 ]; then
  echo "Dead code found! Review needed."
  tree-sitter-mcp analyze --deadcode
  exit 1
fi
```

**Quality gate:**
```bash
#!/bin/bash
critical_issues=$(tree-sitter-mcp analyze --severity critical --output json | jq '.analysis.summary.criticalFindings')
if [ "$critical_issues" -gt 0 ]; then
  echo "Critical quality issues found!"
  tree-sitter-mcp analyze --severity critical
  exit 1
fi
```

### Development Workflow

**Find all references before refactoring:**
```bash
tree-sitter-mcp find-usage "oldFunctionName" --output markdown > refactor-impact.md
```

**Explore a new codebase:**
```bash
# Find entry points
tree-sitter-mcp search "main" --type function
tree-sitter-mcp search "index" --type function

# Find all classes
tree-sitter-mcp search "" --type class --max-results 100
```

**Generate quality report:**
```bash
tree-sitter-mcp analyze --quality --structure --deadcode --output markdown --metrics > quality-report.md
```

### AST Caching

**Use project identifiers for faster repeated analysis:**
```bash
# First run parses and caches the AST
tree-sitter-mcp search "User" --project-id "my-api"

# Subsequent runs reuse cached AST for instant results
tree-sitter-mcp find-usage "UserService" --project-id "my-api"
tree-sitter-mcp analyze --project-id "my-api" --deadcode

# Auto-generated project ID from directory name
tree-sitter-mcp search "config" /path/to/my-project
# Creates project ID "my-project" automatically

# Manual project IDs for better organization
tree-sitter-mcp analyze --project-id "frontend-v2" ./src
tree-sitter-mcp analyze --project-id "api-server" ./backend
```

## Exit Codes

- `0` - Success
- `1` - Error occurred
- `2` - Invalid arguments

## Environment Variables

- `TREE_SITTER_MCP_DEBUG` - Enable debug logging
- `NO_COLOR` - Disable colored output