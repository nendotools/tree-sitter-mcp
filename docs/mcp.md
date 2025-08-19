# MCP Integration

How to use Tree-Sitter MCP with Claude and other AI tools via the Model Context Protocol.

## Setup

### Claude Desktop

Add to your Claude Desktop configuration file (`~/.config/claude-desktop/claude_desktop_config.json`):

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

### Other MCP Clients

Tree-Sitter MCP follows the standard MCP protocol and should work with any compliant client:

```bash
tree-sitter-mcp --mcp
```

## Available Tools

When running as an MCP server, Tree-Sitter MCP provides these tools:

### `search_code`
Find code elements by name with fuzzy matching.

### `find_usage`  
Trace where functions, classes, and variables are used.

### `analyze_code`
Comprehensive code quality and structure analysis.

### `check_errors`
Find actionable syntax errors with detailed context and fix suggestions.

## Usage Patterns

### Code Exploration
```
You: "Find all React components in this project"
Claude: Uses search_code with types=["function", "class"] and query="Component"
```

### Refactoring Impact Analysis
```
You: "I want to rename the User class. Show me all places it's used."
Claude: 
1. Uses search_code to find User class definition
2. Uses find_usage to trace all references
3. Provides comprehensive impact analysis
```

### Code Quality Review
```
You: "Analyze the code quality of this project"
Claude: Uses analyze_code with all analysis types to generate detailed report
```

### Architecture Understanding
```
You: "Help me understand how authentication works in this codebase"
Claude:
1. Uses search_code to find auth-related functions
2. Uses find_usage to trace authentication flow
3. Maps out the authentication architecture
```

## Configuration Options

### Working Directory
Set the `cwd` in your MCP configuration to the project root:

```json
{
  "mcpServers": {
    "tree-sitter-mcp": {
      "command": "npx",
      "args": ["@nendo/tree-sitter-mcp", "--mcp"],
      "cwd": "/Users/yourname/projects/your-project"
    }
  }
}
```

### Debug Logging
Enable debug output by setting environment variables:

```json
{
  "mcpServers": {
    "tree-sitter-mcp": {
      "command": "npx",
      "args": ["@nendo/tree-sitter-mcp", "--mcp"],
      "cwd": "/path/to/project",
      "env": {
        "TREE_SITTER_MCP_DEBUG": "true"
      }
    }
  }
}
```

### Multiple Projects
Configure different instances for different projects:

```json
{
  "mcpServers": {
    "frontend-analysis": {
      "command": "npx",
      "args": ["@nendo/tree-sitter-mcp", "--mcp"],
      "cwd": "/path/to/frontend"
    },
    "backend-analysis": {
      "command": "npx", 
      "args": ["@nendo/tree-sitter-mcp", "--mcp"],
      "cwd": "/path/to/backend"
    }
  }
}
```

## Troubleshooting

### Server Not Starting
1. Verify the command path is correct
2. Check that the working directory exists
3. Ensure you have the package installed globally: `npm list -g @nendo/tree-sitter-mcp`

### Permission Errors
Make sure Claude Desktop has access to your project directory and npm binaries.

### Performance Issues
For very large projects (>100k files), the initial parsing may take a few seconds. Consider:
- Using `.gitignore` patterns to exclude unnecessary files
- Focusing analysis on specific subdirectories

### Debug Information
Enable debug logging to see what the server is doing:

```json
{
  "env": {
    "TREE_SITTER_MCP_DEBUG": "true"
  }
}
```

Check the logs in `~/.config/claude-desktop/logs/` for detailed error information.

## Best Practices

### Effective Prompts
- Be specific about what you're looking for: "Find all API endpoint handlers" vs "Find functions"
- Ask for context: "Show me how the User class is used in authentication"
- Request explanations: "Explain the architecture of the payment system"

### Project Organization
- Keep your project structure clean for better analysis results
- Use meaningful function and class names for better search results
- Follow consistent naming conventions

### Performance Tips
- The tool works best on well-structured codebases
- Large monorepos may take longer to analyze
- Focus searches on specific directories when possible

## Integration Examples

### Code Review Assistant
```
You: "Review the code quality of the new payment module"
Claude: 
1. Uses analyze_code on src/payment/ directory
2. Provides quality metrics and suggestions
3. Identifies potential issues and improvements
```

### Documentation Generator
```
You: "Generate documentation for all public APIs"
Claude:
1. Uses search_code to find all exported functions
2. Uses find_usage to understand how they're used
3. Generates comprehensive API documentation
```

### Dependency Mapping
```
You: "Show me all the dependencies of the UserService class"
Claude:
1. Uses search_code to find UserService
2. Uses find_usage to see what it depends on
3. Creates a dependency graph
```