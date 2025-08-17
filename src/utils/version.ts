/**
 * Utility for reading package.json version
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

/**
 * Get the version from package.json
 */
export function getVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const packagePath = join(__dirname, '../../package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
  return packageJson.version
}