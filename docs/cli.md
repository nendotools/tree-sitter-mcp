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
- `-d, --directory <dir>` - Directory to search (default: current directory)
- `-p, --project-id <id>` - Project identifier for AST caching (auto-generated if not provided)
- `--path-pattern <pattern>` - Filter results to files containing this text in their path
- `-t, --type <types...>` - Filter by element types (function, class, variable, etc.)
- `-m, --max-results <n>` - Maximum results to return (default: 20)
- `--fuzzy-threshold <n>` - Minimum fuzzy match score (default: 30)
- `--exact` - Use exact matching instead of fuzzy
- `--force-content-inclusion` - Include content even with 4+ results
- `--max-content-lines <n>` - Max lines for content truncation (default: 150)
- `--disable-content-inclusion` - Disable content inclusion entirely
- `--output <format>` - Output format: json, text (default: json)

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

# Progressive content inclusion (automatic based on result count)
tree-sitter-mcp search "handleRequest" --max-results 1  # Full content
tree-sitter-mcp search "handleRequest" --max-results 3  # Limited content 
tree-sitter-mcp search "handleRequest" --max-results 10 # Metadata only

# Force content inclusion even with many results
tree-sitter-mcp search "User" --force-content-inclusion

# JSON output
tree-sitter-mcp search "User" --output json
```

### `find-usage`

Find all usages of an identifier.

```bash
tree-sitter-mcp find-usage <identifier> [options]
```

**Options:**
- `-d, --directory <dir>` - Directory to search (default: current directory)
- `-p, --project-id <id>` - Project identifier for AST caching (auto-generated if not provided)
- `--path-pattern <pattern>` - Filter results to files containing this text in their path
- `--case-sensitive` - Case sensitive search
- `--exact` - Require exact identifier match (default: true)
- `-m, --max-results <n>` - Maximum results to return (default: 50)
- `--output <format>` - Output format: json, text (default: json)

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

Analyze code quality, structure, dead code, and configuration issues.

```bash
tree-sitter-mcp analyze [options]
```

**Options:**
- `-d, --directory <dir>` - Directory to analyze (default: current directory)
- `-p, --project-id <id>` - Project identifier for AST caching (auto-generated if not provided)
- `--path-pattern <pattern>` - Filter results to files containing this text in their path
- `-a, --analysis-types <types...>` - Analysis types to run: quality, deadcode, structure (default: quality)
- `--max-results <num>` - Maximum number of findings to return (default: 20)
- `--output <format>` - Output format: json, text, markdown (default: json)

**Examples:**
```bash
# Basic quality analysis
tree-sitter-mcp analyze

# Full analysis
tree-sitter-mcp analyze --analysis-types quality deadcode structure

# Analyze specific directory  
tree-sitter-mcp analyze --directory src/components

# Just deadcode analysis
tree-sitter-mcp analyze --analysis-types deadcode

# Markdown report with limited results
tree-sitter-mcp analyze --output markdown --max-results 10
```

### `errors`

Find actionable syntax errors with detailed context and fix suggestions.

```bash
tree-sitter-mcp errors [options]
```

**Options:**
- `-d, --directory <dir>` - Directory to analyze (default: current directory)
- `-p, --project-id <id>` - Project identifier for AST caching (auto-generated if not provided)
- `--path-pattern <pattern>` - Filter results to files containing this text in their path
- `--max-results <num>` - Maximum number of errors to return (default: 50)
- `--output <format>` - Output format: json, text (default: json)

**Examples:**
```bash
# Check for syntax errors
tree-sitter-mcp errors

# Check specific directory
tree-sitter-mcp errors --directory src/components

# Text output with context
tree-sitter-mcp errors --output text

# Limit to first 10 errors
tree-sitter-mcp errors --max-results 10
```

### Global Options

Available for all commands:

- `--help` - Show help
- `--version` - Show version  
- `--debug` - Enable debug logging
- `--quiet` - Suppress non-error output
- `--mcp` - Run as MCP server

## Output Formats

### JSON (Default)
Machine-readable structured data for automation:
```bash
tree-sitter-mcp search "User" --output json | jq '.results[0].name'
```

### Text
Human-readable console output with colors and formatting:
```bash
tree-sitter-mcp search "User" --output text
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