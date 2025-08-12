# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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