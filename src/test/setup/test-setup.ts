/**
 * Per-test setup that runs in each test context
 * This runs once for each test file to ensure clean state
 */

import { beforeAll, afterAll } from 'vitest'
import { clearMCPMemory } from '../../mcp/handlers.js'

// Automatically run for every test file
beforeAll(() => {
  // Clear MCP memory before each test file
  clearMCPMemory()
})

afterAll(() => {
  // Clean up after each test file
  clearMCPMemory()

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
})