/**
 * Native JavaScript config file parser for JSON, YAML, and TOML files
 * Provides basic structure extraction and searchable indexing without tree-sitter
 */

import JSON5 from 'json5'
import YAML from 'js-yaml'
import TOML from '@iarna/toml'
import type { LanguageParser, ParseResult, ParsedElement, FileInfo, NodeType } from '../types/index.js'

export type ConfigFormat = 'json' | 'yaml' | 'toml' | 'env'

/**
 * Native config file parser that extracts structure and creates searchable elements
 */
export class ConfigParser implements LanguageParser {
  readonly name: string
  readonly extensions: string[]
  private format: ConfigFormat

  constructor(name: string, extensions: string[], format: ConfigFormat) {
    this.name = name
    this.extensions = extensions
    this.format = format
  }

  /**
   * Parse config file content and extract searchable elements
   */
  parse(content: string, filePath: string): ParseResult {
    try {
      const parsedData = this.parseContent(content)
      const elements = this.extractElements(parsedData, filePath)

      const fileInfo: FileInfo = {
        path: filePath,
        language: this.name,
        size: Buffer.byteLength(content, 'utf8'),
        metadata: {
          format: this.format,
          nodeCount: elements.length,
        },
      }

      return {
        file: fileInfo,
        elements,
        imports: [], // Config files don't have imports
        exports: [], // Config files don't have exports
        errors: [],
      }
    }
    catch (error) {
      const fileInfo: FileInfo = {
        path: filePath,
        language: this.name,
        size: Buffer.byteLength(content, 'utf8'),
      }

      return {
        file: fileInfo,
        elements: [],
        imports: [],
        exports: [],
        errors: [`Failed to parse ${this.format} file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    }
  }

  /**
   * Parse content based on format type
   */
  private parseContent(content: string): any {
    switch (this.format) {
      case 'json':
        return JSON5.parse(content)
      case 'yaml':
        return YAML.load(content)
      case 'toml':
        return TOML.parse(content)
      case 'env':
        return this.parseEnvFile(content)
      default:
        throw new Error(`Unsupported config format: ${this.format}`)
    }
  }

  /**
   * Parse .env file content into key-value pairs
   */
  private parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {}
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      // Find the first = sign
      const equalsIndex = trimmed.indexOf('=')
      if (equalsIndex === -1) {
        continue
      }

      const key = trimmed.substring(0, equalsIndex).trim()
      let value = trimmed.substring(equalsIndex + 1).trim()

      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.substring(1, value.length - 1)
      }

      if (key) {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Extract searchable elements from parsed config data
   */
  private extractElements(data: any, filePath: string, path: string[] = []): ParsedElement[] {
    const elements: ParsedElement[] = []

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        // Handle arrays
        data.forEach((item, index) => {
          const itemPath = [...path, index.toString()]
          elements.push(...this.extractElements(item, filePath, itemPath))
        })
      }
      else {
        // Handle objects
        Object.entries(data).forEach(([key, value]) => {
          const keyPath = [...path, key]
          const fullPath = keyPath.join('.')

          // Add the key itself as a searchable element
          elements.push({
            name: key,
            type: this.getValueType(value),
            startLine: 1, // Line numbers not available in JS parsing
            endLine: 1,
            startColumn: 0,
            endColumn: 0,
            metadata: {
              configPath: fullPath,
              valueType: typeof value,
              hasChildren: typeof value === 'object' && value !== null,
              value: typeof value === 'object' ? undefined : value,
            },
          })

          // Recursively process nested structures
          if (typeof value === 'object' && value !== null) {
            elements.push(...this.extractElements(value, filePath, keyPath))
          }
        })
      }
    }

    return elements
  }

  /**
   * Determine the type of config element based on its value
   */
  private getValueType(value: any): NodeType {
    if (Array.isArray(value)) return 'variable' // Arrays treated as variables
    if (typeof value === 'object' && value !== null) return 'variable' // Objects treated as variables
    return 'constant' // Primitive values treated as constants
  }

  /**
   * Check if this parser can handle the given file
   */
  canParse(filePath: string): boolean {
    const fileName = filePath.toLowerCase()

    return this.extensions.some((ext) => {
      if (ext.includes('*')) {
        // Handle wildcard patterns like .env*
        const pattern = ext.replace(/\*/g, '.*')
        const regex = new RegExp(pattern + '$')
        return regex.test(fileName)
      }
      return fileName.endsWith(ext)
    })
  }
}