/**
 * JSON formatting utilities for search output
 */

import type { SearchOutput } from '../execution/results-mapper.js'

/**
 * Format search output as JSON string
 */
export function formatSearchOutput(output: SearchOutput, pretty: boolean = false): string {
  return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output)
}

/**
 * Format search output with custom indentation
 */
export function formatSearchOutputCustom(output: SearchOutput, indent?: number): string {
  return JSON.stringify(output, null, indent)
}

/**
 * Validate that output can be serialized to JSON
 */
export function validateJsonSerializable(output: SearchOutput): void {
  try {
    JSON.stringify(output)
  }
  catch (error) {
    throw new Error(`Output cannot be serialized to JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}