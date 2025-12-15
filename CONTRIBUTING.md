# Contributing to Tree-Sitter MCP

We welcome contributions! This guide will help you get started with contributing to Tree-Sitter MCP.

## Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Install dependencies**: `npm install`
4. **Run tests**: `npm test`
5. **Make your changes**
6. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Build Tools Required

Tree-Sitter MCP includes native components. You'll need:

**macOS:**
```bash
xcode-select --install
```

**Windows:**
```bash
npm install --global windows-build-tools
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install build-essential
```

### Installation

```bash
# Clone your fork
git clone https://github.com/your-username/tree-sitter-mcp.git
cd tree-sitter-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Project Structure

```
src/
├── analysis/          # Code quality and structure analysis
├── cli/              # Command-line interface
├── constants/        # Configuration and constants
├── core/             # Core parsing and search functionality
├── mcp/              # MCP server implementation
├── project/          # Project management and file handling
├── test/             # Test files and fixtures
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## How to Contribute

### Reporting Bugs

**Before creating an issue:**
- Search existing issues to avoid duplicates
- Use the latest version
- Test with a minimal reproduction case

**When creating a bug report, include:**
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version)
- Code samples or test cases

**Bug Report Template:**
```markdown
## Bug Description
Brief description of the issue.

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: [e.g., macOS 14.0]
- Node.js: [e.g., 18.17.0]
- Package version: [e.g., 2.0.0]
```

### Feature Requests

**Before requesting a feature:**
- Check if it's already planned in our [roadmap](roadmap/)
- Search existing feature requests
- Consider if it fits the project scope

**Feature Request Template:**
```markdown
## Feature Description
Brief description of the feature.

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this work?

## Alternatives Considered
Other approaches you've considered.
```

### Code Contributions

#### Types of Contributions Welcome

1. **Bug fixes** - Always welcome
2. **Language support** - Adding new programming language parsers
3. **Analysis improvements** - Better code quality detection
4. **Performance optimizations** - Faster parsing and analysis
5. **Documentation** - Improving guides and examples
6. **Test coverage** - Adding test cases

#### Development Workflow

1. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Add tests** for new functionality:
   ```bash
   npm test
   ```

4. **Run linting**:
   ```bash
   npm run lint
   npm run typecheck
   ```

5. **Commit your changes** with a clear message:
   ```bash
   git commit -m "feat: add support for Kotlin language parsing"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a pull request** with:
   - Clear description of changes
   - Link to related issue (if any)
   - Test results
   - Documentation updates (if needed)

## Coding Standards

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Check formatting
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Code Quality Guidelines

Follow the standards in [CLAUDE.md](CLAUDE.md):

- **Single responsibility** - One function, one purpose
- **Maximum complexity** - Keep cyclomatic complexity ≤ 15
- **Method length** - Maximum 50 lines for production code
- **No magic strings** - Use constants and templates
- **Type safety** - Avoid `any` types

### Commit Messages

Use conventional commit format:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/modifications
- `refactor:` - Code refactoring
- `perf:` - Performance improvements

Examples:
```
feat: add Python async function parsing
fix: resolve memory leak in file watcher
docs: add examples for CLI usage
test: add integration tests for Go analysis
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/test/parser.test.ts

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- **Unit tests** for individual functions
- **Integration tests** for complete workflows
- **Fixture tests** for language parsing

Test file naming: `*.test.ts`

Example test structure:
```typescript
import { describe, it, expect } from 'vitest'
import { functionToTest } from '../src/module'

describe('Function Name', () => {
  it('should handle basic case', () => {
    const result = functionToTest('input')
    expect(result).toBe('expected')
  })

  it('should handle edge case', () => {
    const result = functionToTest('')
    expect(result).toBe('default')
  })
})
```

### Test Fixtures

Add language examples in `src/test/fixtures/`:

```
src/test/fixtures/
├── javascript-example/
├── python-example/
└── your-language-example/
    ├── simple.ext
    ├── complex.ext
    └── edge-cases.ext
```

## Adding Language Support

### Step-by-Step Guide

1. **Install Tree-Sitter grammar** - `npm install tree-sitter-<language>`
2. **Add parser constants** in `src/constants/parsers.ts`
3. **Add file extensions** in `src/constants/file-types.ts`
4. **Register parser** in `src/core/languages.ts`
5. **Create test fixtures** in `src/test/fixtures/`
6. **Add parser tests** in `src/test/unit/core/parser.test.ts`
7. **Update documentation**

### Example: Adding Swift Support

```typescript
// 1. src/constants/parsers.ts - Add to each constant
export const PARSER_NAMES = {
  // ... existing languages
  SWIFT: 'swift',
} as const

export const FUNCTION_TYPES = {
  // ... existing languages
  SWIFT: ['function_declaration'],
} as const

export const CLASS_TYPES = {
  // ... existing languages
  SWIFT: ['class_declaration', 'struct_declaration', 'protocol_declaration'],
} as const

// 2. src/constants/file-types.ts
export const LOGIC_EXTENSIONS = {
  // ... existing extensions
  SWIFT: ['.swift'],
} as const

// 3. src/core/languages.ts
import Swift from 'tree-sitter-swift'

// Add to LANGUAGE_CONFIGS array:
{
  name: PARSER_NAMES.SWIFT,
  extensions: [...LOGIC_EXTENSIONS.SWIFT],
  parserName: PARSER_NAMES.SWIFT,
  functionTypes: [...FUNCTION_TYPES.SWIFT],
  classTypes: [...CLASS_TYPES.SWIFT],
}

// Add to GRAMMARS object:
[PARSER_NAMES.SWIFT]: Swift,
```

## Documentation

### Types of Documentation

1. **API documentation** - In `docs/api.md`
2. **CLI documentation** - In `docs/cli.md`
3. **Usage examples** - In `docs/examples.md`
4. **Code comments** - JSDoc for public APIs only

### Documentation Standards

- **Clear examples** for all features
- **Step-by-step guides** for complex workflows
- **Real-world use cases**
- **Keep it updated** with code changes

## Release Process

Releases are handled by maintainers following semantic versioning:

- **Patch** (1.0.1) - Bug fixes
- **Minor** (1.1.0) - New features, backward compatible
- **Major** (2.0.0) - Breaking changes

## Community

### Getting Help

- **GitHub Issues** - For bugs and feature requests
- **Discussions** - For questions and ideas
- **Code Review** - All pull requests get reviewed

### Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Be respectful and constructive in all interactions.

### Recognition

Contributors are recognized in:
- Release notes
- GitHub contributor graphs
- Package.json contributors field

## Common Tasks

### Adding a New Analysis Rule

1. **Define the rule** in `src/analysis/quality-patterns.ts`
2. **Implement detection** in appropriate analyzer
3. **Add test cases** with positive/negative examples
4. **Update documentation** with the new rule

### Fixing a Parser Issue

1. **Create a test case** that reproduces the issue
2. **Identify the parsing logic** in `src/core/parser.ts`
3. **Fix the Tree-Sitter query** or extraction logic
4. **Verify the fix** with tests
5. **Add regression test** to prevent future issues

### Performance Optimization

1. **Profile the code** to identify bottlenecks
2. **Add benchmarks** for the slow operation
3. **Implement optimization**
4. **Verify performance improvement**
5. **Ensure no regression** in functionality

Thank you for contributing to Tree-Sitter MCP! 🚀