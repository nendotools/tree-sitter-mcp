/**
 * File size utilities for performance optimization
 */

export const FILE_SIZE_LIMITS = {
  SMALL: 50000, // 50KB - very fast processing
  MEDIUM: 200000, // 200KB - normal processing
  LARGE: 500000, // 500KB - slower processing
  VERY_LARGE: 1000000, // 1MB - skip processing
} as const

/**
 * Checks if a file should be skipped due to size constraints
 */
export function shouldSkipLargeFile(content: string, maxSize: number = FILE_SIZE_LIMITS.LARGE): boolean {
  return content.length > maxSize
}

/**
 * Gets a performance-appropriate file size limit based on operation type
 */
export function getFileSizeLimit(operation: 'deadcode' | 'search' | 'analysis'): number {
  switch (operation) {
    case 'deadcode':
      return FILE_SIZE_LIMITS.LARGE
    case 'search':
      return FILE_SIZE_LIMITS.VERY_LARGE
    case 'analysis':
      return FILE_SIZE_LIMITS.MEDIUM
    default:
      return FILE_SIZE_LIMITS.MEDIUM
  }
}

/**
 * Logs file size warnings for debugging
 */
export function logLargeFileSkip(filePath: string, contentLength: number, maxSize: number): void {
  console.log(`  ⚠️ Skipping large file: ${filePath} (${contentLength} chars > ${maxSize})`)
}