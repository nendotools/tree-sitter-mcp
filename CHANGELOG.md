# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-01-18 - Return of the AST-cache

### Added
- **AST Persistence System**: Revolutionary caching system providing 99.5% performance improvement for repeated operations
- **Project ID Support**: New `--project-id` option for all CLI commands (`search`, `analyze`, `find-usage`)
- **Smart Project Management**: Automatic projectId generation from directory names with collision detection
- **LRU Cache Management**: Intelligent eviction keeping the 10 most recently used projects in memory
- **Dual Mapping Strategy**: Projects mapped by both explicit projectId and directory path for maximum flexibility
- **Performance Benchmarks**: Comprehensive test suite proving massive speed improvements (5.4ms → 0.03ms cached access)

### Security & Validation
- **Input Sanitization**: Project IDs automatically sanitized removing special characters, enforcing length limits
- **Directory Validation**: Early exit for invalid directories with clear error messages  
- **Process Safety**: Fixed potential CLI hanging issues with proper file watcher lifecycle management
- **Edge Case Handling**: Comprehensive validation for Unicode characters, empty inputs, and malformed data

### Enhanced CLI Experience
- **Persistent Projects**: Reuse parsed ASTs across multiple operations on the same codebase
- **Auto-Generated IDs**: No projectId? We'll create one from your directory name (`/path/to/my-app` → `my-app`)
- **Lightning Fast**: Sub-millisecond search operations on cached projects
- **Backward Compatible**: All existing CLI usage continues to work unchanged

### MCP Server Improvements  
- **Persistent MCP Projects**: Long-running MCP servers now cache parsed ASTs between requests
- **Enhanced Responses**: MCP tool responses now include projectId information for better tracking
- **Massive Speedup**: Subsequent MCP requests on the same project are orders of magnitude faster
- **File Watching**: MCP servers can watch for file changes and update ASTs in real-time

### Testing & Quality
- **Performance Tests**: New test suite proving 99%+ performance improvements with real metrics
- **Validation Tests**: 15 new tests covering input sanitization, edge cases, and error scenarios
- **44 Total Tests**: Comprehensive coverage ensuring reliability and performance
- **Security Testing**: Edge cases for malicious inputs, Unicode handling, and process safety

### Architecture Improvements
- **Single Responsibility**: Clean separation between persistent management and core functionality
- **Code Quality**: All new code follows strict quality standards (max 50 lines per function, <15 complexity)
- **Type Safety**: Zero `any` usage, proper TypeScript throughout with enhanced type definitions
- **Memory Efficient**: Smart memory management with configurable limits and automatic cleanup

### Usage Examples
```bash
# Explicit project management
tree-sitter-mcp search "createProject" --project-id my-app

# Auto-generated from directory (my-app → project ID)  
tree-sitter-mcp search "createProject" 

# Works across all commands
tree-sitter-mcp analyze --project-id backend-api
tree-sitter-mcp find-usage "User" --project-id frontend-app
```

## [1.4.2] - 2025-08-12

### Fixed
- **EMFILE Error Resolution**: Fixed critical "too many open files" error in large projects (385+ files)
- **Performance**: Selective directory watching reduces resource usage by ~95%
- **File Watcher**: Smart project detection for Vue, React, Angular, and monorepo structures

### Enhanced
- **Directory Detection**: Intelligent project type detection with automatic directory selection
- **Resource Management**: Watch 1-5 key directories instead of 385+ individual files
- **Fallback System**: Graceful degradation for unknown project types
- **Test Coverage**: 45+ comprehensive test cases for file watching scenarios

### Technical
- New selective directory watching implementation in `FileWatcher`
- Added `directory-detection.ts` utility with smart project detection
- Comprehensive test suites for directory detection and file watching
- Maintains full file change detection while preventing system resource limits

## [1.4.1] - 2025-08-12

### Fixed
- **Performance**: Critical performance fix for file searches with path patterns
- Fixed file search taking 160+ seconds by reordering filter operations
- Now filters by path pattern first, then performs expensive fuzzy matching
- Dramatically improved search speeds for large projects (385+ files)

### Improved
- Enhanced MCP tool descriptions with more assertive usage guidance
- Better AI guidance for when to use file search vs code search
- Clearer examples of search patterns and use cases

## [1.4.0] - 2025-01-12

### Added
- **File-level search capability** - Search for files by name, partial name, and fuzzy matching
- **Glob pattern support** - Find files using patterns like `**/*.vue`, `**/components/**/*.ts`
- **Empty query support** - Use path patterns without search terms for file discovery
- **Mixed search results** - Return both files and code elements in unified results
- **Enhanced file index** - Dedicated file indexing alongside existing code element indexing

### Enhanced
- **Search tool flexibility** - `search_code` now supports `file` type in addition to code elements
- **Improved error handling** - Better validation for empty queries and path patterns
- **Documentation updates** - Updated README with file search examples and usage patterns

### Use Cases
- **Code exploration**: Find all Vue components with `types: ["file"], pathPattern: "**/*.vue"`
- **File discovery**: Locate specific files by name or fuzzy matching
- **Architecture analysis**: Search for files and their contained elements simultaneously
- **Pattern-based searches**: Use glob patterns to find files in specific directories

### Technical
- 10 comprehensive test cases covering all file search scenarios
- Maintains backward compatibility with existing code element searches
- Enhanced fuzzy scoring for filename matching
- Proper mono-repo support for file searches

## [1.3.0] - 2025-01-12

### Added
- Vue.js Single File Component (.vue) support with automatic component detection
- Enhanced component indexing for files in `components` directories and subdirectories
- New `component` type filter for `search_code` tool
- Performance tracking and granular debugging logs for file processing
- File size and line length limits to prevent parser bottlenecks (5MB, 10k lines, 1k chars/line)

### Fixed
- **Critical**: Fixed directory ignore logic that wasn't properly skipping ignored directories
- Fixed Vue parser registration - Vue files now properly parsed using TypeScript grammar
- Fixed file discovery vs indexing discrepancy in complex project structures
- Enhanced fuzzy search scoring and threshold handling

### Improved
- Significant performance improvements for large Vue.js projects
- Better error handling and logging throughout the parsing pipeline
- More accurate file type detection and component naming
- Enhanced context output with precise location information (line:column format)

### Performance
- File walking: ~330ms for 279 files in complex Vue projects
- Full project indexing: handles 190+ Vue components with 474+ code elements
- Search responses: <10ms for indexed projects

## [1.2.2] - 2024-12-XX

### Added
- Add badges, fix license, improve CI reliability
- Fix rollup module error by removing package-lock and using npm install
- Include repository in package.json
- Disable npm cache in CI to avoid stale dependencies

## [1.2.1] - 2024-12-XX

### Fixed
- Fix npm package files - include setup.js

## [1.2.0] - 2024-12-XX

### Added
- Add intelligent fuzzy search with hierarchical scoring
- Expand language support to 15 languages with comprehensive test fixtures
- Refactor TreeManager methods and improve JSDoc documentation

## [1.1.0] - 2024-11-XX

### Added
- Enhanced search capabilities and performance improvements

## [1.0.1] - 2024-11-XX

### Fixed
- Bug fixes and stability improvements

## [1.0.0] - 2024-11-XX

### Added
- Initial stable release with basic MCP functionality
- Multi-language support for programming languages
- Fast in-memory AST indexing and search
- Mono-repo support with sub-project isolation
- File watching with automatic synchronization