/**
 * Global setup and teardown for all vitest tests
 * Runs once before all tests and once after all tests complete
 */

import { clearMCPMemory } from '../../mcp/handlers.js'

export function setup() {
  console.log('[SETUP] Global test setup - clearing MCP memory...')

  // Clear any existing MCP memory state
  clearMCPMemory()

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }

  console.log('[SETUP] Global test setup complete')
}

export function teardown() {
  console.log('[TEARDOWN] Global test teardown - cleaning up resources...')

  // Final cleanup of all MCP memory
  clearMCPMemory()

  // Force garbage collection to free memory
  if (global.gc) {
    global.gc()
    // Give a moment for GC to complete
    setTimeout(() => {
      if (global.gc) global.gc()
    }, 100)
  }

  console.log('[TEARDOWN] Global test teardown complete')
}