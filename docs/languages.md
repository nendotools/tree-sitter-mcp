# Language Support

Tree-Sitter MCP supports semantic analysis for 15+ programming languages and configuration formats.

## Programming Languages

| Language | Extensions | Supported Elements | Notes |
|----------|------------|-------------------|-------|
| **JavaScript** | `.js`, `.jsx`, `.mjs` | Functions, Classes, Variables, Exports | Full ES6+ support |
| **TypeScript** | `.ts`, `.tsx` | Functions, Classes, Interfaces, Types, Enums | Complete TypeScript syntax |
| **Python** | `.py` | Functions, Classes, Methods, Variables | Python 3.x syntax |
| **Go** | `.go` | Functions, Structs, Interfaces, Methods | Go modules support |
| **Rust** | `.rs` | Functions, Structs, Traits, Impls, Enums | Rust 2021 edition |
| **Java** | `.java` | Classes, Methods, Interfaces, Enums | Java 8+ features |
| **C** | `.c`, `.h` | Functions, Structs, Variables, Typedefs | C99/C11 standard |
| **C++** | `.cpp`, `.cc`, `.cxx`, `.hpp` | Functions, Classes, Structs, Namespaces | C++17 features |
| **Ruby** | `.rb` | Classes, Methods, Modules, Constants | Ruby 3.x syntax |
| **C#** | `.cs` | Classes, Methods, Interfaces, Properties | .NET 6+ features |
| **PHP** | `.php`, `.phtml` | Classes, Functions, Methods, Traits | PHP 8.x syntax |
| **Kotlin** | `.kt`, `.kts` | Classes, Functions, Objects, Interfaces | Kotlin 1.9+ |
| **Scala** | `.scala`, `.sc` | Classes, Objects, Traits, Methods | Scala 3.x syntax |
| **Elixir** | `.ex`, `.exs` | Modules, Functions, Structs, Protocols | OTP 26+ |

## Configuration Files

| Format | Extensions | Supported Elements | Use Cases |
|--------|------------|-------------------|-----------|
| **JSON** | `.json`, `.json5`, `.jsonc` | Keys, Values, Nested Objects | Package configs, API responses |
| **YAML** | `.yaml`, `.yml` | Keys, Values, Arrays, Comments | CI/CD configs, documentation |
| **TOML** | `.toml` | Sections, Keys, Values, Tables | Rust configs, Python projects |
| **Environment** | `.env*` | Variables, Values, Comments | Environment configuration |

## Language-Specific Features

### JavaScript/TypeScript
- **Async/await** patterns
- **React components** (JSX/TSX)
- **ES modules** and CommonJS
- **Decorators** (TypeScript)
- **Generic types** (TypeScript)

### Python
- **Async functions** and generators
- **Class decorators** and methods
- **Type hints** (3.5+)
- **Context managers**
- **Data classes**

### Go
- **Go routines** and channels
- **Interface implementations**
- **Package-level functions**
- **Struct methods**
- **Generic types** (1.18+)

### Rust
- **Trait implementations**
- **Macro definitions**
- **Async functions**
- **Generic constraints**
- **Pattern matching**

### Java
- **Annotations**
- **Lambda expressions**
- **Stream operations**
- **Record classes**
- **Sealed classes**

## Search Capabilities by Language

### Element Types

| Element Type | JavaScript | TypeScript | Python | Go | Rust | Java | Others |
|--------------|------------|------------|--------|----|----- |------|--------|
| `function` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `method` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `class` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | Varies |
| `interface` | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| `struct` | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| `trait` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `variable` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Code Quality Analysis

| Analysis Type | Supported Languages | Notes |
|---------------|-------------------|-------|
| **Complexity** | All | Cyclomatic complexity calculation |
| **Method Length** | All | Line count analysis |
| **Parameter Count** | All | Function signature analysis |
| **Nesting Depth** | All | Control flow analysis |
| **Dead Code** | JS/TS, Python, Go, Rust | Import/export analysis |
| **Circular Dependencies** | JS/TS, Python, Go | Module dependency tracking |

## Usage Examples by Language

### JavaScript/TypeScript
```bash
# Find React components
tree-sitter-mcp search "Component" --type class function

# Find async functions
tree-sitter-mcp search "async" --path-pattern "**/*.{ts,js}"

# Find interfaces (TypeScript only)
tree-sitter-mcp search "Interface" --type interface
```

### Python
```bash
# Find class methods
tree-sitter-mcp search "process" --type method

# Find async functions
tree-sitter-mcp search "async_" --type function

# Find all classes
tree-sitter-mcp search "" --type class --max-results 50
```

### Go
```bash
# Find struct definitions
tree-sitter-mcp search "User" --type struct

# Find interface implementations
tree-sitter-mcp search "Writer" --type interface

# Find package functions
tree-sitter-mcp search "New" --type function
```

### Rust
```bash
# Find trait definitions
tree-sitter-mcp search "Display" --type trait

# Find struct implementations
tree-sitter-mcp search "impl" --type struct

# Find async functions
tree-sitter-mcp search "async" --type function
```

## Language Detection

Tree-Sitter MCP automatically detects languages based on:

1. **File extensions** - Primary detection method
2. **Shebang lines** - For script files
3. **Content analysis** - Fallback for ambiguous cases

## Limitations

### Current Limitations
- **Preprocessor directives** (C/C++) may not be fully parsed
- **Complex macros** (Rust, C++) may affect accuracy
- **Dynamic imports** (JavaScript) are detected but not fully traced
- **Reflection** usage may not be captured in usage analysis

### Performance Considerations
- **Large files** (>10k lines) may take longer to parse
- **Deep nesting** can slow down analysis
- **Binary files** are automatically excluded

## Adding Language Support

Tree-Sitter MCP uses Tree-Sitter parsers. To add support for a new language:

1. Ensure a Tree-Sitter grammar exists for the language
2. Add parser configuration to `src/constants/parsers.ts`
3. Define element extraction rules in `src/core/parser.ts`
4. Add file extension mappings in `src/constants/file-types.ts`

See the [Contributing Guide](../CONTRIBUTING.md) for details on adding language support.