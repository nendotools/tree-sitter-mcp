# Test Fixtures

This directory contains sample projects used for testing the Tree-Sitter MCP functionality.

## Structure

- `simple-ts/` - Simple TypeScript project with basic classes and functions
- `multi-lang/` - Multi-language project with TypeScript, Python, Go, and Rust
- `mono-repo/` - Mono-repository structure with multiple sub-projects
- `large-project/` - Simulated large project for performance testing
- `edge-cases/` - Edge cases: empty files, binary files, unusual structures

## Usage

These fixtures are used by integration tests to verify:
- Project initialization and indexing
- Search functionality across different file types
- MCP tool workflows (initialize → search → find usage)
- File watching and update detection
- Memory management and performance characteristics

## Updating Fixtures

When updating these fixtures:
1. Keep them realistic but minimal
2. Include representative code patterns for each language
3. Test both common cases and edge cases
4. Update corresponding test files when structure changes