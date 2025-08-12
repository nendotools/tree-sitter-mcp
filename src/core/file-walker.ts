/**
 * File walker for traversing directories and discovering parseable files
 */

import { readdir, stat, readFile } from 'fs/promises'
import { join, relative } from 'path'
import { DEFAULT_IGNORE_DIRS, DIRECTORIES, PARSING } from '../constants/index.js'
import type { Config, ParseResult } from '../types/index.js'
import { getLogger } from '../utils/logger.js'
import { ParserRegistry } from '../parsers/registry.js'

/**
 * File walker that recursively traverses directories to find and parse code files
 *
 * Features:
 * - Configurable depth limits and ignore patterns
 * - File size filtering
 * - Language-specific filtering
 * - Path normalization (absolute to relative)
 */
export class FileWalker {
  private parserRegistry: ParserRegistry
  private config: Config
  private ignoreDirs: Set<string>
  private logger = getLogger()

  /**
   * Creates a new file walker instance
   *
   * @param parserRegistry - Registry containing language parsers
   * @param config - Configuration object with walking parameters
   */
  constructor(parserRegistry: ParserRegistry, config: Config) {
    this.parserRegistry = parserRegistry
    this.config = config
    this.ignoreDirs = new Set(config.ignoreDirs || DEFAULT_IGNORE_DIRS)
  }

  /**
   * Starts the file walking process from the configured working directory
   *
   * @returns Promise resolving to array of parsed file results
   */
  async walk(): Promise<ParseResult[]> {
    const startTime = performance.now()
    const results: ParseResult[] = []
    this.logger.debug(`Starting file walk from: ${this.config.workingDir}`)
    await this.walkDirectory(this.config.workingDir, results, 0)
    const duration = (performance.now() - startTime).toFixed(2)
    this.logger.info(`File walk completed, found ${results.length} files in ${duration}ms`)
    return results
  }

  /**
   * Recursively walks a directory, respecting depth limits and ignore patterns
   *
   * @param dir - Directory path to walk
   * @param results - Array to collect parse results
   * @param depth - Current traversal depth
   */
  private async walkDirectory(dir: string, results: ParseResult[], depth: number): Promise<void> {
    const maxDepth = this.config.maxDepth ?? DIRECTORIES.DEFAULT_MAX_DEPTH
    if (depth > maxDepth) {
      this.logger.debug(`Skipping directory ${dir} - depth ${depth} > maxDepth ${maxDepth}`)
      return
    }

    this.logger.debug(`Walking directory: ${dir} at depth ${depth}`)

    try {
      const entries = await readdir(dir, { withFileTypes: true })
      this.logger.debug(`Found ${entries.length} entries in ${dir}`)

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          if (this.ignoreDirs.has(entry.name)) {
            this.logger.debug(`🚫 Ignoring directory: ${entry.name}`)
            continue // Actually skip the ignored directory!
          }
          else {
            this.logger.debug(`📁 Recursing into directory: ${entry.name}`)
            await this.walkDirectory(fullPath, results, depth + 1)
          }
        }
        else if (entry.isFile()) {
          this.logger.debug(`Processing file: ${entry.name}`)
          await this.processFile(fullPath, results)
        }
      }
    }
    catch (error) {
      this.logger.error(`Error walking directory ${dir}:`, error)
    }
  }

  /**
   * Processes an individual file by parsing it if it meets all criteria
   *
   * Applies several filters:
   * - File type must be parseable by registry
   * - File size must be under the limit
   * - Language must match configured filter (if specified)
   *
   * @param filePath - Absolute path to the file to process
   * @param results - Array to add successful parse results to
   */
  private async processFile(filePath: string, results: ParseResult[]): Promise<void> {
    const fileStartTime = performance.now()
    const fileName = filePath.split('/').pop() || filePath
    
    this.logger.debug(`🔍 Checking file: ${fileName}`)
    
    if (!this.parserRegistry.canParse(filePath)) {
      this.logger.debug(`❌ Cannot parse: ${fileName} (no parser available)`)
      return
    }
    
    this.logger.debug(`✅ Can parse: ${fileName}`)

    try {
      const statStartTime = performance.now()
      const stats = await stat(filePath)
      const statDuration = (performance.now() - statStartTime).toFixed(2)
      
      const maxSizeBytes = PARSING.MAX_FILE_SIZE_MB * 1024 * 1024
      if (stats.size > maxSizeBytes) {
        this.logger.debug(`🚫 Large file: ${fileName} (${Math.round(stats.size / 1024 / 1024)}MB > ${PARSING.MAX_FILE_SIZE_MB}MB)`)
        return
      }

      this.logger.debug(`📊 File size OK: ${fileName} (${stats.size} bytes, ${statDuration}ms)`)

      const parser = this.parserRegistry.getParserForFile(filePath)
      if (!parser) {
        this.logger.debug(`❌ No parser found: ${fileName}`)
        return
      }
      
      this.logger.debug(`🔧 Using parser: ${parser.name} for ${fileName}`)

      if (this.config.languages && this.config.languages.length > 0) {
        if (!this.config.languages.includes(parser.name)) {
          this.logger.debug(`🚫 Language filter: ${fileName} (${parser.name} not in ${this.config.languages})`)
          return
        }
      }

      const readStartTime = performance.now()
      const content = await readFile(filePath, 'utf-8')
      const readDuration = (performance.now() - readStartTime).toFixed(2)
      this.logger.debug(`📖 Read: ${fileName} (${content.length} chars, ${readDuration}ms)`)
      
      // Apply line-based filtering to prevent parsing problematic files
      const lines = content.split('\n')
      if (lines.length > PARSING.MAX_LINES_PER_FILE) {
        this.logger.debug(`🚫 Too many lines: ${fileName} (${lines.length} > ${PARSING.MAX_LINES_PER_FILE})`)
        return
      }

      // Check for excessively long lines that might cause parser issues
      const maxLineLength = Math.max(...lines.map(line => line.length))
      if (maxLineLength > PARSING.MAX_LINE_LENGTH) {
        this.logger.debug(`🚫 Long lines: ${fileName} (max ${maxLineLength} > ${PARSING.MAX_LINE_LENGTH} chars)`)
        return
      }
      
      this.logger.debug(`📏 Line check OK: ${fileName} (${lines.length} lines, max ${maxLineLength} chars)`)

      const parseStartTime = performance.now()
      const result = await this.parserRegistry.parseFile(filePath, content)
      const parseDuration = (performance.now() - parseStartTime).toFixed(2)
      
      if (result) {
        this.logger.debug(`⚡ Parse success: ${fileName} (${result.elements.length} elements, ${parseDuration}ms)`)
        
        // Convert absolute path to relative for consistent indexing
        const relativePath = relative(this.config.workingDir, filePath)
        result.file.path = relativePath
        
        // Log existing elements before Vue component detection
        const beforeCount = result.elements.length
        this.logger.debug(`🧩 Elements before Vue detection: ${beforeCount}`)
        if (beforeCount > 0) {
          for (const element of result.elements) {
            this.logger.debug(`   - ${element.name} (${element.type})`)
          }
        }
        
        // Add Vue component detection based on file system patterns
        this.addVueComponentIfApplicable(result, relativePath)
        
        // Log if Vue component was added
        const afterCount = result.elements.length
        if (afterCount > beforeCount) {
          this.logger.debug(`🎯 Vue component added! Now ${afterCount} elements`)
          for (let i = beforeCount; i < afterCount; i++) {
            const element = result.elements[i]
            if (element) {
              this.logger.debug(`   + ${element.name} (${element.type})`)
            }
          }
        }
        
        results.push(result)
        const totalFileDuration = (performance.now() - fileStartTime).toFixed(2)
        this.logger.debug(
          `✅ Complete: ${fileName} with ${result.elements.length} elements in ${totalFileDuration}ms`,
        )
      } else {
        this.logger.debug(`❌ Parse failed: ${fileName} (${parseDuration}ms)`)
      }
    }
    catch (error) {
      const totalFileDuration = (performance.now() - fileStartTime).toFixed(2)
      this.logger.error(`❌ Error processing file ${filePath} after ${totalFileDuration}ms:`, error)
    }
  }

  /**
   * Adds a synthetic component element for Vue files based on file system patterns
   *
   * Vue components are identified by:
   * - .vue file extension
   * - Located in /components directory or subdirectories
   * - Component name is derived from the filename
   *
   * @param result - Parse result to potentially modify
   * @param relativePath - Relative path from project root
   */
  private addVueComponentIfApplicable(result: ParseResult, relativePath: string): void {
    this.logger.debug(`🔍 Vue check: ${relativePath}`)
    
    // Only process .vue files
    if (!relativePath.endsWith('.vue')) {
      this.logger.debug(`❌ Not .vue file: ${relativePath}`)
      return
    }

    this.logger.debug(`✅ Is .vue file: ${relativePath}`)

    // Check if file is in components directory
    const pathSegments = relativePath.split('/').filter(Boolean)
    this.logger.debug(`📁 Path segments: ${pathSegments.join(' > ')}`)
    
    const isInComponents = pathSegments.some(segment => 
      segment === 'components' || 
      segment === 'component' || 
      segment.startsWith('components')
    )

    if (!isInComponents) {
      this.logger.debug(`❌ Not in components directory: ${relativePath}`)
      return
    }

    this.logger.debug(`✅ In components directory: ${relativePath}`)

    // Extract component name from filename
    const filename = pathSegments[pathSegments.length - 1]
    if (!filename) {
      this.logger.debug(`❌ No filename found: ${relativePath}`)
      return
    }
    const componentName = filename.replace('.vue', '')

    // Skip if component name is not valid
    if (!componentName || componentName.length === 0) {
      this.logger.debug(`❌ Invalid component name: ${componentName}`)
      return
    }

    this.logger.debug(`🎯 Creating Vue component: ${componentName}`)

    // Create synthetic component element
    const componentElement = {
      name: componentName,
      type: 'component' as const,
      startLine: 1,
      endLine: 1,
      startColumn: 1,
      endColumn: 1,
      parameters: [],
      returnType: undefined,
      modifiers: [],
      metadata: {
        isVueComponent: true,
        filePath: relativePath,
        componentType: 'vue-sfc', // Single File Component
      },
    }

    // Add the component element to the result
    result.elements.push(componentElement)
    
    this.logger.debug(`Added Vue component: ${componentName} from ${relativePath}`)
  }
}
