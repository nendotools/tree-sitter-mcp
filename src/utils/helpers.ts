/**
 * General utility functions for the Tree-Sitter MCP service
 */

import { randomBytes } from 'crypto';

/**
 * Generates a random hexadecimal identifier
 *
 * Uses cryptographically secure random bytes to create unique identifiers
 * for tree nodes, projects, and other entities requiring unique IDs.
 *
 * @returns 16-character hexadecimal string
 */
export function generateId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Creates a debounced version of a function that delays execution
 *
 * Useful for file watching and other high-frequency events where you want
 * to limit the rate of function calls by ensuring the function is only
 * called after a specified delay period has passed without new calls.
 *
 * @param func - Function to debounce
 * @param wait - Delay in milliseconds before executing the function
 * @returns Debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Formats a byte count into a human-readable string with appropriate units
 *
 * Converts raw byte counts to more readable formats (KB, MB, GB) with
 * automatic unit selection based on size. Used for memory usage reporting
 * and file size display.
 *
 * @param bytes - Number of bytes to format
 * @returns Formatted string with appropriate unit (e.g., "1.5 MB", "512 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a duration in milliseconds to a human-readable string
 *
 * Automatically selects the most appropriate time unit based on duration:
 * - Milliseconds for values under 1 second
 * - Seconds for values under 1 minute
 * - Minutes and seconds for values under 1 hour
 * - Hours and minutes for longer durations
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2.5s", "5m 30s", "1h 15m")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
