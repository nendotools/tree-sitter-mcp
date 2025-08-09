/**
 * File walker for traversing directories
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { DIRECTORIES, WATCHER } from '../constants/index.js';
import type { Config, ParseResult } from '../types/index.js';
import { getLogger } from '../utils/logger.js';
import { ParserRegistry } from '../parsers/registry.js';

export class FileWalker {
  private parserRegistry: ParserRegistry;
  private config: Config;
  private ignoreDirs: Set<string>;
  private logger = getLogger();

  constructor(parserRegistry: ParserRegistry, config: Config) {
    this.parserRegistry = parserRegistry;
    this.config = config;
    this.ignoreDirs = new Set(config.ignoreDirs || DIRECTORIES.DEFAULT_IGNORE);
  }

  async walk(): Promise<ParseResult[]> {
    const results: ParseResult[] = [];
    await this.walkDirectory(this.config.workingDir, results, 0);
    return results;
  }

  private async walkDirectory(
    dir: string,
    results: ParseResult[],
    depth: number
  ): Promise<void> {
    if (depth > this.config.maxDepth) {
      return;
    }

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!this.ignoreDirs.has(entry.name)) {
            await this.walkDirectory(fullPath, results, depth + 1);
          }
        } else if (entry.isFile()) {
          await this.processFile(fullPath, results);
        }
      }
    } catch (error) {
      this.logger.error(`Error walking directory ${dir}:`, error);
    }
  }

  private async processFile(filePath: string, results: ParseResult[]): Promise<void> {
    // Check if we can parse this file
    if (!this.parserRegistry.canParse(filePath)) {
      return;
    }

    // Check file size
    try {
      const stats = await stat(filePath);
      if (stats.size > WATCHER.MAX_FILE_SIZE_MB * 1024 * 1024) {
        this.logger.debug(`Skipping large file: ${filePath}`);
        return;
      }

      // Check language filter
      const parser = this.parserRegistry.getParserForFile(filePath);
      if (!parser) return;

      if (this.config.languages && this.config.languages.length > 0) {
        if (!this.config.languages.includes(parser.name)) {
          return;
        }
      }

      // Read and parse file
      const content = await readFile(filePath, 'utf-8');
      const result = await this.parserRegistry.parseFile(filePath, content);
      
      if (result) {
        // Convert absolute path to relative
        const relativePath = relative(this.config.workingDir, filePath);
        result.file.path = relativePath;
        results.push(result);
      }
    } catch (error) {
      this.logger.error(`Error processing file ${filePath}:`, error);
    }
  }
}