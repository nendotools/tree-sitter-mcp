/**
 * Tree-Sitter MCP Setup - Legacy compatibility layer
 *
 * This file now delegates to the modular setup system.
 * All setup functionality has been refactored into domain-specific modules.
 */

import { runSetup } from './setup/index.js'

// Re-export the main setup function for backward compatibility
export { runSetup }

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runSetup()
  }
  catch (error) {
    const { getLogger } = await import('./utils/logger.js')
    const logger = getLogger()
    logger.error('Setup script error:', error)
  }
}
