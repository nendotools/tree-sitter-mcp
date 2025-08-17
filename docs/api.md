# API Reference

Complete reference for Tree-Sitter MCP tools and parameters.

## MCP Tools

### `search_code`

Search for functions, classes, variables, and other code elements with fuzzy matching.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✓ | - | Search query (name of element) |
| `maxResults` | number | | 20 | Maximum number of results |
| `fuzzyThreshold` | number | | 30 | Minimum fuzzy match score |
| `exactMatch` | boolean | | false | Require exact name match |
| `types` | array | | [] | Filter by element types |
| `pathPattern` | string | | - | Filter by file path pattern |

**Element Types:**
- `function` - Functions and methods
- `class` - Classes and interfaces  
- `variable` - Variables and constants
- `interface` - TypeScript/Java interfaces
- `struct` - Go/Rust structs
- `trait` - Rust traits

**Example:**
```json
{
  "query": "handleRequest",
  "types": ["function", "method"],
  "maxResults": 10,
  "exactMatch": false
}
```

### `find_usage`

Find all usages of a function, variable, class, or identifier.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `identifier` | string | ✓ | - | Function, variable, class, or identifier name |
| `caseSensitive` | boolean | | false | Case sensitive search |
| `exactMatch` | boolean | | true | Require exact identifier match |
| `maxResults` | number | | 50 | Maximum number of results |

**Example:**
```json
{
  "identifier": "UserService",
  "exactMatch": true,
  "maxResults": 25
}
```

### `analyze_code`

Comprehensive code quality, structure, and dead code analysis.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | string | ✓ | - | Project identifier |
| `analysisTypes` | array | ✓ | - | Analysis types to run |
| `scope` | string | ✓ | - | Analysis scope |
| `target` | string | | - | Specific file/method when scope is file/method |
| `includeMetrics` | boolean | | false | Include quantitative metrics |
| `severity` | string | | info | Minimum severity level |

**Analysis Types:**
- `quality` - Complex functions, long methods, parameter count
- `structure` - Circular dependencies, coupling issues
- `deadcode` - Unused exports, orphaned files
- `config-validation` - JSON/YAML validation *(MCP only)*

**Scope Options:**
- `project` - Entire project
- `file` - Single file
- `method` - Specific method/function

**Severity Levels:**
- `info` - All findings
- `warning` - Important issues
- `critical` - Blocking issues

**Example:**
```json
{
  "projectId": "my-app",
  "analysisTypes": ["quality", "deadcode"],
  "scope": "project",
  "includeMetrics": true,
  "severity": "warning"
}
```

## Response Format

All tools return JSON responses with structured data:

### Search Results
```json
{
  "query": "handleRequest",
  "results": [
    {
      "name": "handleRequest",
      "type": "function",
      "path": "/src/api/handlers.ts",
      "startLine": 15,
      "endLine": 25,
      "score": 95,
      "matches": ["name", "content"]
    }
  ],
  "totalResults": 1
}
```

### Usage Results
```json
{
  "identifier": "UserService",
  "usages": [
    {
      "path": "/src/controllers/user.ts",
      "startLine": 10,
      "endLine": 10,
      "context": "const service = new UserService();"
    }
  ],
  "totalUsages": 1
}
```

### Analysis Results
```json
{
  "analysis": {
    "findings": [
      {
        "type": "quality",
        "category": "long_method",
        "severity": "warning",
        "description": "Method is very long (87 lines)",
        "location": "src/processor.ts:45",
        "context": "Consider extracting functionality",
        "metrics": {
          "methodLength": 87,
          "complexity": 12
        }
      }
    ],
    "summary": {
      "totalFindings": 5,
      "criticalFindings": 1,
      "warningFindings": 3,
      "infoFindings": 1
    }
  }
}
```

## Understanding Quality Scores

When `includeMetrics: true` is used with quality analysis, a `codeQualityScore` is calculated on a scale of 0-10. **Important clarifications:**

### What the Score Represents
- **Complexity indicator** - Measures code complexity, not overall project quality
- **Technical debt guide** - Identifies areas that may benefit from refactoring
- **Readability metric** - Higher scores generally indicate more readable code

### What the Score Does NOT Represent
- **Project value** - A lower score doesn't mean your project is "bad"
- **Code correctness** - Functional, working code may have lower scores
- **Business logic quality** - Complex domains naturally require complex code

### Recommended Target Ranges

**5-7: Ideal Range**
- Good balance of simplicity and functionality
- Maintainable for most team sizes
- Sustainable for long-term development

**3-5: Acceptable for Large Projects**
- Expected for complex domains and large codebases
- May indicate areas for gradual improvement
- Often reflects necessary business complexity

**8-10: Avoid Over-Optimization**
- Scores this high may indicate over-abstraction
- Can create maintenance burden through excessive splitting
- May sacrifice readability for artificial simplicity
- No project should aim for a perfect 10

### Project Size Considerations

**Small Projects (< 10k lines)**
- Target 6-8 range
- Higher scores more achievable
- Simple domains allow cleaner code

**Large Projects (> 100k lines)**
- Target 4-6 range is realistic
- Complex business rules justify lower scores
- Focus on critical paths rather than overall score

**Enterprise/Legacy Projects**
- Scores of 3-5 are normal and acceptable
- Incremental improvement more valuable than perfect scores
- Business continuity often trumps code purity

The analysis is designed to **improve readability and reduce technical debt**, but remember that some complexity is inherent to solving complex problems. Use the score as a guide, not a judgment.

## Error Handling

Errors are returned in structured format:

```json
{
  "category": "validation",
  "message": "Query parameter is required",
  "code": "MISSING_REQUIRED_PARAMETER",
  "context": {
    "parameter": "query"
  }
}
```

**Error Categories:**
- `parsing` - File parsing errors
- `search` - Search operation errors  
- `validation` - Parameter validation errors
- `system` - System/file access errors