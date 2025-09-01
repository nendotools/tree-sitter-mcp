# Content Inclusion Enhancement Specification

## Overview

This specification outlines an enhancement to the `search_code` functionality that automatically includes code content based on result count, transforming tree-sitter-mcp from a discovery tool into a complete semantic workspace.

## Problem Statement

Currently, `search_code` returns metadata (location, type, boundaries) but requires separate `Read` operations to get actual code content. This creates a two-step workflow:

1. `search_code` → Find function locations
2. `Read` → Get function content for editing

For targeted searches (≤3 results), users typically need the content immediately, making the current workflow inefficient.

## Solution: Progressive Content Inclusion

### Auto-Include Logic

```typescript
interface ContentInclusionRules {
  results <= 1: "full_content"      // No size limit
  results 2-3: "limited_content"    // 150-line limit
  results >= 4: "metadata_only"     // Current behavior
}
```

### Implementation Strategy

#### 1. Enhanced Search Result Interface

```typescript
interface SearchResult {
  node: LightweightTreeNode
  score: number
  matches: string[]
  
  // New fields
  contentIncluded: boolean
  content?: string
  contentTruncated?: boolean
  contentLines?: number
}
```

#### 2. Modified searchCode Function

**Location**: `src/core/search.ts` - function `searchCode()`

**Changes**:
- Add content extraction after results are sorted and sliced
- Apply inclusion rules based on final result count
- Extract content directly from TreeNode.content
- Apply size limits for 2-3 result scenarios

#### 3. Content Extraction Logic

```typescript
function includeContentInResults(results: SearchResult[]): SearchResult[] {
  const resultCount = results.length
  
  if (resultCount >= 4) {
    // No content inclusion for discovery mode
    return results.map(r => ({ ...r, contentIncluded: false }))
  }
  
  return results.map(result => {
    const node = result.node
    if (!node.content) {
      return { ...result, contentIncluded: false }
    }
    
    if (resultCount === 1) {
      // Full content for single results
      return {
        ...result,
        contentIncluded: true,
        content: node.content,
        contentTruncated: false,
        contentLines: node.content.split('\n').length
      }
    }
    
    if (resultCount <= 3) {
      // Limited content for small result sets
      const lines = node.content.split('\n')
      const shouldTruncate = lines.length > 150
      
      return {
        ...result,
        contentIncluded: true,
        content: shouldTruncate 
          ? lines.slice(0, 150).join('\n') + '\n\n// ... truncated ...'
          : node.content,
        contentTruncated: shouldTruncate,
        contentLines: lines.length
      }
    }
    
    return { ...result, contentIncluded: false }
  })
}
```

#### 4. MCP Handler Updates

**Location**: `src/mcp/handlers.ts` - function `handleSearchCode()`

**Changes**:
- Update result mapping to include new content fields
- Maintain backward compatibility for existing clients

```typescript
// In handleSearchCode() around line 130
results: results.map(r => ({
  name: r.node.name,
  type: r.node.type,
  path: r.node.path,
  startLine: r.node.startLine,
  endLine: r.node.endLine,
  startColumn: r.node.startColumn,
  endColumn: r.node.endColumn,
  score: r.score,
  matches: r.matches,
  
  // New fields
  contentIncluded: r.contentIncluded,
  content: r.content,
  contentTruncated: r.contentTruncated,
  contentLines: r.contentLines,
})),
```

## Implementation Details

### Phase 1: Core Enhancement
1. Modify `SearchResult` interface in `src/types/core.ts`
2. Update `searchCode()` in `src/core/search.ts`
3. Add content inclusion logic
4. Update MCP handler response format

### Phase 2: Safety & Performance
1. Add memory usage monitoring
2. Implement content size warnings
3. Add configuration options for limits
4. Update tests for new functionality

### Phase 3: Documentation & API
1. Update API documentation
2. Add usage examples
3. Update CLI to show content when appropriate
4. Update CLAUDE.md integration guidance

## Configuration Options

Add optional configuration to control behavior:

```typescript
interface SearchOptions {
  // Existing options...
  maxResults?: number
  fuzzyThreshold?: number
  exactMatch?: boolean
  
  // New content options
  forceContentInclusion?: boolean     // Override auto-include logic
  maxContentLines?: number            // Override 150-line limit
  disableContentInclusion?: boolean   // Disable for performance
}
```

## Backward Compatibility

- All existing fields remain unchanged
- New fields are optional and additive
- Clients can ignore new fields safely
- Performance impact only on small result sets

## Memory Impact Analysis

### Before Enhancement
- Search results: ~1KB per result (metadata only)
- 20 results: ~20KB memory usage
- No content references stored

### After Enhancement
- 1 result: Up to ~50KB (full function content)
- 2-3 results: Up to ~15KB per result (150 lines max)
- 4+ results: ~1KB per result (unchanged)

**Risk Mitigation**:
- Content included only for targeted searches
- Size limits prevent runaway memory usage
- Lightweight node copying prevents AST retention

## Testing Strategy

### Unit Tests
```typescript
describe('Content Inclusion', () => {
  test('single result includes full content')
  test('2-3 results include truncated content')
  test('4+ results exclude content')
  test('large functions are truncated properly')
  test('memory usage remains stable')
})
```

### Integration Tests
```typescript
describe('MCP Handler', () => {
  test('search_code returns content for targeted searches')
  test('backward compatibility maintained')
  test('content truncation flags work correctly')
})
```

## Usage Examples

### Before (2-step workflow)
```typescript
// Step 1: Find function
const results = await search_code("executeSearch", { exactMatch: true })
// Result: { name: "executeSearch", path: "/path/file.ts", startLine: 13, endLine: 64 }

// Step 2: Get content
const content = await Read("/path/file.ts", { offset: 13, limit: 52 })
```

### After (1-step workflow)
```typescript
// Single step: Find function with content
const results = await search_code("executeSearch", { exactMatch: true })
// Result: { 
//   name: "executeSearch", 
//   path: "/path/file.ts", 
//   startLine: 13, 
//   endLine: 64,
//   contentIncluded: true,
//   content: "export async function executeSearch(query: string...)..."
// }
```

## User Experience Benefits

### For Targeted Searches (≤3 results)
- **Eliminated step**: No more Read operations needed
- **Faster workflow**: Immediate access to code content
- **Better context**: Full function signatures and implementations

### For Exploratory Searches (4+ results)
- **Unchanged behavior**: Still fast metadata-only results
- **No memory bloat**: Performance remains optimal
- **Clear discovery**: Focus on finding the right target

### User Control
- **Natural throttling**: More specific searches = more content
- **Intuitive behavior**: API responds to user intent
- **Progressive disclosure**: Broad → narrow → detailed

## Implementation Effort

- **Low complexity**: Leverages existing content extraction
- **High impact**: Eliminates most Read operations
- **Safe change**: Additive, backward-compatible
- **Easy rollback**: Can be feature-flagged if needed

## Success Metrics

- **Workflow efficiency**: Reduction in Read tool usage after search_code
- **User satisfaction**: Improved developer experience reports
- **Performance stability**: Memory usage remains within acceptable bounds
- **Adoption**: Increased usage of tree-sitter-mcp over basic file tools

---

## Decision: Implementation vs Documentation

**Recommendation**: Implement this enhancement

**Rationale**:
- Well-defined scope with clear boundaries
- Backward compatible and low-risk
- High impact on user workflow efficiency
- Aligns with the "slim alternative to Find + Read" vision

This enhancement transforms tree-sitter-mcp from a discovery tool into a complete semantic workspace while maintaining its lightweight, focused design philosophy.