/**
 * MCP tool schema definitions - Legacy compatibility layer
 *
 * This file now delegates to the modular schema system.
 * All schema functionality has been refactored into domain-specific modules.
 */

// Re-export the main schema factory from the new modular system
export { createToolSchemas } from './schemas/index.js'