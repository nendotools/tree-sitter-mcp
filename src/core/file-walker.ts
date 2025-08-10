/**
 * File walker for traversing directories and discovering parseable files
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { DEFAULT_IGNORE_DIRS, WATCHER, DIRECTORIES } from '../constants/index.js';
import type { Config, ParseResult } from '../types/index.js';
import { getLogger } from '../utils/logger.js';
import { ParserRegistry } from '../parsers/registry.js';

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
  private parserRegistry: ParserRegistry;
  private config: Config;
  private ignoreDirs: Set<string>;
  private logger = getLogger();

  /**
   * Creates a new file walker instance
   *
   * @param parserRegistry - Registry containing language parsers
   * @param config - Configuration object with walking parameters
   */
  constructor(parserRegistry: ParserRegistry, config: Config) {
    this.parserRegistry = parserRegistry;
    this.config = config;
    this.ignoreDirs = new Set(config.ignoreDirs || DEFAULT_IGNORE_DIRS);
  }

  /**
   * Starts the file walking process from the configured working directory
   *
   * @returns Promise resolving to array of parsed file results
   */
  async walk(): Promise<ParseResult[]> {
    const results: ParseResult[] = [];
    this.logger.debug(`Starting file walk from: ${this.config.workingDir}`);
    await this.walkDirectory(this.config.workingDir, results, 0);
    this.logger.info(`File walk completed, found ${results.length} files`);
    return results;
  }

  /**
   * Recursively walks a directory, respecting depth limits and ignore patterns
   *
   * @param dir - Directory path to walk
   * @param results - Array to collect parse results
   * @param depth - Current traversal depth
   */
  private async walkDirectory(dir: string, results: ParseResult[], depth: number): Promise<void> {
    const maxDepth = this.config.maxDepth ?? DIRECTORIES.DEFAULT_MAX_DEPTH;
    if (depth > maxDepth) {
      this.logger.debug(`Skipping directory ${dir} - depth ${depth} > maxDepth ${maxDepth}`);
      return;
    }

    this.logger.debug(`Walking directory: ${dir} at depth ${depth}`);

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      this.logger.debug(`Found ${entries.length} entries in ${dir}`);

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (this.ignoreDirs.has(entry.name)) {
            this.logger.debug(`Ignoring directory: ${entry.name}`);
          } else {
            this.logger.debug(`Recursing into directory: ${entry.name}`);
            await this.walkDirectory(fullPath, results, depth + 1);
          }
        } else if (entry.isFile()) {
          this.logger.debug(`Processing file: ${entry.name}`);
          await this.processFile(fullPath, results);
        }
      }
    } catch (error) {
      this.logger.error(`Error walking directory ${dir}:`, error);
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
    if (!this.parserRegistry.canParse(filePath)) {
      return;
    }

    try {
      const stats = await stat(filePath);
      if (stats.size > WATCHER.MAX_FILE_SIZE_MB * 1024 * 1024) {
        this.logger.debug(`Skipping large file: ${filePath}`);
        return;
      }

      const parser = this.parserRegistry.getParserForFile(filePath);
      if (!parser) return;

      if (this.config.languages && this.config.languages.length > 0) {
        if (!this.config.languages.includes(parser.name)) {
          return;
        }
      }

      const content = await readFile(filePath, 'utf-8');
      const result = await this.parserRegistry.parseFile(filePath, content);

      if (result) {
        // Convert absolute path to relative for consistent indexing
        const relativePath = relative(this.config.workingDir, filePath);
        result.file.path = relativePath;
        results.push(result);
        this.logger.debug(
          `Successfully parsed file: ${filePath} with ${result.elements.length} elements`
        );
      }
    } catch (error) {
      this.logger.error(`Error processing file ${filePath}:`, error);
    }
  }
}
