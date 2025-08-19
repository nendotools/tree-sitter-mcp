# Examples

Real-world examples and use cases for Tree-Sitter MCP.

## Code Exploration

### Understanding a New Codebase

**Scenario:** You've joined a team and need to understand their TypeScript React application.

```bash
# Find main entry points
tree-sitter-mcp search "main" --type function
tree-sitter-mcp search "App" --type class function

# Discover React components
tree-sitter-mcp search "Component" --type class function --path-pattern "**/*.{tsx,jsx}"

# Find API endpoints
tree-sitter-mcp search "api" --type function --path-pattern "**/api/**"

# Understand routing
tree-sitter-mcp search "Route" --type function class
```

### Finding Code Patterns

**Scenario:** You want to find all authentication-related code.

```bash
# Search for auth functions
tree-sitter-mcp search "auth" --type function method

# Find authentication classes
tree-sitter-mcp search "Auth" --type class interface

# Search for JWT usage
tree-sitter-mcp find-usage "jwt" --case-sensitive

# Find middleware functions
tree-sitter-mcp search "middleware" --type function
```

## Refactoring

### Safe Function Renaming

**Scenario:** You want to rename `getUserData` to `fetchUserProfile`.

```bash
# First, find the function definition
tree-sitter-mcp search "getUserData" --exact --type function

# Find all usages to understand impact
tree-sitter-mcp find-usage "getUserData" --exact

# Generate impact report
tree-sitter-mcp find-usage "getUserData" --exact --output markdown > refactor-impact.md
```

### Class Extraction

**Scenario:** A class has grown too large and needs to be split.

```bash
# Analyze the large class
tree-sitter-mcp analyze src/services/UserService.ts --analysis-types quality

# Find all methods in the class
tree-sitter-mcp search "" --type method --path-pattern "**/UserService.ts"

# Find external dependencies
tree-sitter-mcp find-usage "UserService" --exact
```

## Code Quality

### Quality Audit

**Scenario:** Conducting a code quality review before a major release.

```bash
# Full quality analysis
tree-sitter-mcp analyze --analysis-types quality structure deadcode

# Generate quality report
tree-sitter-mcp analyze --analysis-types quality structure deadcode --output markdown > quality-audit.md
```

**Note on Quality Scores:** The `codeQualityScore` measures complexity, not project value. Target 5-7 for most projects, 3-5 for large/complex codebases. Scores of 8+ may indicate over-abstraction. No project should aim for a perfect 10.

### Dead Code Cleanup

**Scenario:** Preparing to remove unused code before a release.

```bash
# Find all dead code
tree-sitter-mcp analyze --analysis-types deadcode

# Check specific directory
tree-sitter-mcp analyze src/utils --analysis-types deadcode
```

## API Development

### Finding API Endpoints

**Scenario:** Documenting all REST API endpoints in an Express.js application.

```bash
# Find route definitions
tree-sitter-mcp search "router\." --path-pattern "**/routes/**"
tree-sitter-mcp search "app\.(get|post|put|delete)" --path-pattern "**/*.js"

# Find middleware functions
tree-sitter-mcp search "middleware" --type function

# Find controller methods
tree-sitter-mcp search "Controller" --type class
tree-sitter-mcp search "" --type method --path-pattern "**/controllers/**"
```

### Database Schema Analysis

**Scenario:** Understanding database models in a Node.js application.

```bash
# Find model definitions
tree-sitter-mcp search "Schema" --type variable class
tree-sitter-mcp search "model" --type function --path-pattern "**/models/**"

# Find database queries
tree-sitter-mcp search "query" --type method function
tree-sitter-mcp find-usage "findOne"
tree-sitter-mcp find-usage "aggregate"
```

## Testing

### Test Coverage Analysis

**Scenario:** Ensuring all critical functions have tests.

```bash
# Find all test files
tree-sitter-mcp search "test" --path-pattern "**/*.{test,spec}.{js,ts}"

# Find functions that might need tests
tree-sitter-mcp search "" --type function --path-pattern "src/**" | grep -v test

# Find mock usage
tree-sitter-mcp find-usage "mock"
tree-sitter-mcp find-usage "jest"
```

### Finding Test Patterns

**Scenario:** Understanding testing patterns in a codebase.

```bash
# Find test suites
tree-sitter-mcp search "describe" --type function
tree-sitter-mcp search "it" --type function

# Find setup/teardown patterns
tree-sitter-mcp search "beforeEach" --type function
tree-sitter-mcp search "afterEach" --type function

# Find assertion patterns
tree-sitter-mcp find-usage "expect"
tree-sitter-mcp find-usage "assert"
```

## Architecture Analysis

### Dependency Mapping

**Scenario:** Understanding the dependency structure of a microservices project.

```bash
# Find service definitions
tree-sitter-mcp search "Service" --type class interface

# Find import patterns
tree-sitter-mcp search "import" --path-pattern "**/*.ts"

# Analyze circular dependencies
tree-sitter-mcp analyze --structure
```

### Design Pattern Detection

**Scenario:** Identifying design patterns in a codebase.

```bash
# Find Factory patterns
tree-sitter-mcp search "Factory" --type class function
tree-sitter-mcp search "create" --type function

# Find Observer patterns
tree-sitter-mcp search "Observer" --type class interface
tree-sitter-mcp search "subscribe" --type method

# Find Singleton patterns
tree-sitter-mcp search "getInstance" --type method
tree-sitter-mcp search "singleton" --type class
```

## CI/CD Integration

### Quality Gates

**Scenario:** Adding code quality checks to your CI pipeline.

```bash
#!/bin/bash
# quality-check.sh

echo "Running code quality analysis..."

# Check for critical issues
critical_issues=$(tree-sitter-mcp analyze --analysis-types quality --output json | jq '.summary.criticalFindings')

if [ "$critical_issues" -gt 0 ]; then
    echo "ERROR: Critical quality issues found:"
    tree-sitter-mcp analyze --analysis-types quality --output text
    exit 1
fi

# Check for dead code
dead_code=$(tree-sitter-mcp analyze --analysis-types deadcode --output json | jq '.findings | length')

if [ "$dead_code" -gt 10 ]; then
    echo "WARNING: Significant dead code detected:"
    tree-sitter-mcp analyze --analysis-types deadcode --output text
    echo "Consider cleanup before merge"
fi

echo "SUCCESS: Quality checks passed"
```

### Documentation Generation

**Scenario:** Automatically generating API documentation.

```bash
#!/bin/bash
# generate-docs.sh

echo "Generating API documentation..."

# Find all exported functions
tree-sitter-mcp search "" --type function --output json | \
  jq -r '.results[] | select(.path | contains("src/api/")) | .name' | \
  sort | uniq > api-functions.txt

# Find all interfaces (TypeScript)
tree-sitter-mcp search "" --type interface --output json | \
  jq -r '.results[] | .name' | \
  sort | uniq > api-interfaces.txt

echo "Found $(wc -l < api-functions.txt) API functions"
echo "Found $(wc -l < api-interfaces.txt) interfaces"
```

## MCP Usage with Claude

### Code Review Assistant

**Conversation example:**

```
You: "Review the authentication module for security issues"

Claude: I'll analyze the authentication code for potential security issues.

[Uses search_code to find auth-related functions]
[Uses analyze_code on authentication modules]
[Uses find_usage to trace authentication flows]

Found several areas to review:
1. Password handling in src/auth/password.ts
2. JWT token validation in src/auth/jwt.ts
3. Session management in src/auth/session.ts

Key findings:
- Password hashing appears secure (bcrypt usage)
- JWT secret should be environment variable
- Session timeout needs configuration
```

### Architecture Documentation

**Conversation example:**

```
You: "Help me document the payment processing architecture"

Claude: I'll map out the payment processing architecture for you.

[Uses search_code to find payment-related classes]
[Uses find_usage to trace payment flows]
[Uses analyze_code to understand structure]

Payment Architecture:
1. PaymentController - Handles HTTP requests
2. PaymentService - Business logic layer  
3. PaymentProcessor - External API integration
4. PaymentModel - Database representation

The flow follows: Controller → Service → Processor → External APIs
```

## Performance Optimization

### Finding Performance Bottlenecks

**Scenario:** Identifying potentially slow functions.

```bash
# Find long functions that might be slow
tree-sitter-mcp analyze --analysis-types quality --output text | grep "long_method"

# Find complex functions
tree-sitter-mcp analyze --analysis-types quality --output text | grep "high_complexity"

# Find functions with many parameters (potential over-engineering)  
tree-sitter-mcp analyze --analysis-types quality --output text | grep "too_many_parameters"
```

### Database Query Analysis

**Scenario:** Finding potentially expensive database operations.

```bash
# Find all database queries
tree-sitter-mcp find-usage "query"
tree-sitter-mcp find-usage "findAll"
tree-sitter-mcp find-usage "aggregate"

# Find N+1 query patterns
tree-sitter-mcp search "forEach" --type method
tree-sitter-mcp search "map" --type method

# Look for missing indexes hints
tree-sitter-mcp find-usage "index"
tree-sitter-mcp search "createIndex" --type function
```