/**
 * Basic tests for Tree-Sitter MCP
 */

import { describe, it, expect } from 'vitest'
import { MEMORY, SEARCH, NODE_TYPES } from '../constants/index.js'

describe('Constants', () => {
  it('should have correct memory defaults', () => {
    expect(MEMORY.MAX_PROJECTS).toBe(4)
    expect(MEMORY.MAX_MEMORY_MB).toBe(1024)
  })

  it('should have search configuration', () => {
    expect(SEARCH.DEFAULT_MAX_RESULTS).toBe(20)
    expect(SEARCH.SCORE_EXACT_MATCH).toBe(100)
  })

  it('should have node types defined', () => {
    expect(NODE_TYPES.FILE).toBe('file')
    expect(NODE_TYPES.CLASS).toBe('class')
    expect(NODE_TYPES.FUNCTION).toBe('function')
  })
})

describe('Type System', () => {
  it('should have type definitions', async () => {
    const types = await import('../types/index.js')
    // NodeType is a TypeScript type, not a runtime value
    // Just verify the module loads
    expect(types).toBeDefined()
    expect(types.TreeSitterMCPError).toBeDefined()
  })
})

describe('Logger', () => {
  it('should create logger instance', async () => {
    const { ConsoleLogger } = await import('../utils/logger.js')
    const logger = new ConsoleLogger()
    expect(logger).toBeDefined()
    expect(logger.info).toBeDefined()
    expect(logger.error).toBeDefined()
  })
})

describe('Helpers', () => {
  it('should format bytes correctly', async () => {
    const { formatBytes } = await import('../utils/helpers.js')
    expect(formatBytes(0)).toBe('0 Bytes')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('should generate unique IDs', async () => {
    const { generateId } = await import('../utils/helpers.js')
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
    expect(id1).not.toBe(id2)
  })
})
