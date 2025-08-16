/**
 * Language parser registry for Tree-Sitter - Central registry for all supported language parsers
 */

import JavaScript from 'tree-sitter-javascript'
import TypeScript from 'tree-sitter-typescript'
import Python from 'tree-sitter-python'
import Go from 'tree-sitter-go'
import Rust from 'tree-sitter-rust'
import Java from 'tree-sitter-java'
import C from 'tree-sitter-c'
import Cpp from 'tree-sitter-cpp'
import Ruby from 'tree-sitter-ruby'
import CSharp from 'tree-sitter-c-sharp'
import PHP from 'tree-sitter-php'
import Kotlin from 'tree-sitter-kotlin'
import Scala from 'tree-sitter-scala'
import Elixir from 'tree-sitter-elixir'
import HTML from 'tree-sitter-html'

import { LANGUAGE_EXTENSIONS } from '../constants/analysis-constants.js'
import type { LanguageParser, ParseResult } from '../types/index.js'
import { BaseParser } from './base-parser.js'
import { ConfigParser } from './config-parser.js'

/**
 * Configuration for a language parser including grammar and supported file extensions
 */
interface LanguageConfig {
  /** Human-readable language name */
  name: string
  /** Tree-Sitter grammar for the language */
  grammar: any
  /** Array of file extensions (including dot) */
  extensions: string[]
  /** Optional syntax highlighting and query configurations */
  queries?: {
    highlights?: string
    locals?: string
    tags?: string
  }
}

// Available language configurations
const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    name: 'javascript',
    grammar: JavaScript,
    extensions: LANGUAGE_EXTENSIONS.javascript || [],
  },
  {
    name: 'typescript',
    grammar: TypeScript.typescript,
    extensions: LANGUAGE_EXTENSIONS.typescript || [],
  },
  {
    name: 'tsx',
    grammar: TypeScript.tsx,
    extensions: ['.tsx'],
  },
  {
    name: 'python',
    grammar: Python,
    extensions: LANGUAGE_EXTENSIONS.python || [],
  },
  {
    name: 'go',
    grammar: Go,
    extensions: LANGUAGE_EXTENSIONS.go || [],
  },
  {
    name: 'rust',
    grammar: Rust,
    extensions: LANGUAGE_EXTENSIONS.rust || [],
  },
  {
    name: 'java',
    grammar: Java,
    extensions: LANGUAGE_EXTENSIONS.java || [],
  },
  {
    name: 'c',
    grammar: C,
    extensions: LANGUAGE_EXTENSIONS.c || [],
  },
  {
    name: 'cpp',
    grammar: Cpp,
    extensions: LANGUAGE_EXTENSIONS.cpp || [],
  },
  {
    name: 'ruby',
    grammar: Ruby,
    extensions: LANGUAGE_EXTENSIONS.ruby || [],
  },
  {
    name: 'csharp',
    grammar: CSharp,
    extensions: LANGUAGE_EXTENSIONS.csharp || [],
  },
  {
    name: 'php',
    grammar: PHP.php,
    extensions: LANGUAGE_EXTENSIONS.php || [],
  },
  {
    name: 'kotlin',
    grammar: Kotlin,
    extensions: LANGUAGE_EXTENSIONS.kotlin || [],
  },
  {
    name: 'scala',
    grammar: Scala,
    extensions: LANGUAGE_EXTENSIONS.scala || [],
  },
  {
    name: 'elixir',
    grammar: Elixir,
    extensions: LANGUAGE_EXTENSIONS.elixir || [],
  },
  {
    name: 'vue',
    grammar: TypeScript.typescript, // Use TypeScript parser for Vue SFC script sections
    extensions: LANGUAGE_EXTENSIONS.vue || [],
  },
  {
    name: 'html',
    grammar: HTML,
    extensions: LANGUAGE_EXTENSIONS.html || [],
  },
]

/**
 * Central registry for managing language parsers and file parsing operations
 *
 * The registry maintains:
 * - A collection of language parsers for different programming languages
 * - File extension to language mapping for automatic parser selection
 * - Singleton pattern for consistent parser access across the application
 *
 * Supports 8+ programming languages with automatic parser selection based on file extensions.
 */
class ParserRegistry {
  private parsers: Map<string, LanguageParser> = new Map()
  private extensionMap: Map<string, string> = new Map()

  /**
   * Creates a new parser registry and initializes all supported language parsers
   */
  constructor() {
    this.initializeParsers()
  }

  /**
   * Initializes all configured language parsers and registers them with the registry
   */
  private initializeParsers(): void {
    // Initialize tree-sitter parsers
    for (const config of LANGUAGE_CONFIGS) {
      const parser = new BaseParser(config.name, config.grammar, config.extensions)
      this.registerParser(parser)
    }

    // Initialize native config parsers
    this.registerParser(new ConfigParser('json', LANGUAGE_EXTENSIONS.json || [], 'json'))
    this.registerParser(new ConfigParser('yaml', LANGUAGE_EXTENSIONS.yaml || [], 'yaml'))
    this.registerParser(new ConfigParser('toml', LANGUAGE_EXTENSIONS.toml || [], 'toml'))
    this.registerParser(new ConfigParser('env', LANGUAGE_EXTENSIONS.env || [], 'env'))
  }

  /**
   * Registers a language parser with the registry
   *
   * @param parser - Language parser to register
   */
  registerParser(parser: LanguageParser): void {
    this.parsers.set(parser.name, parser)

    for (const ext of parser.extensions) {
      this.extensionMap.set(ext, parser.name)
    }
  }

  /**
   * Gets a parser by language name
   *
   * @param language - Language name (e.g., 'typescript', 'python')
   * @returns Language parser or undefined if not found
   */
  getParser(language: string): LanguageParser | undefined {
    return this.parsers.get(language)
  }

  /**
   * Gets the appropriate parser for a file based on its extension
   *
   * @param filePath - Path to the file
   * @returns Language parser or undefined if no suitable parser found
   */
  getParserForFile(filePath: string): LanguageParser | undefined {
    const ext = this.getFileExtension(filePath)
    if (!ext) return undefined

    // First try exact extension match
    const language = this.extensionMap.get(ext)
    if (language) {
      return this.parsers.get(language)
    }

    // If no exact match, check if any parser can handle this file (for wildcards)
    for (const parser of this.parsers.values()) {
      if (parser.canParse(filePath)) {
        return parser
      }
    }

    return undefined
  }

  private getFileExtension(filePath: string): string | undefined {
    const lastDot = filePath.lastIndexOf('.')
    if (lastDot === -1) return undefined
    return filePath.substring(lastDot)
  }

  /**
   * Checks if a file can be parsed by any registered parser
   *
   * @param filePath - Path to the file to check
   * @returns True if a suitable parser exists
   */
  canParse(filePath: string): boolean {
    return this.getParserForFile(filePath) !== undefined
  }

  /**
   * Parses a file using the appropriate language parser
   *
   * @param filePath - Path to the file being parsed
   * @param content - File content to parse
   * @returns Parse result or null if no suitable parser found
   */
  async parseFile(filePath: string, content: string): Promise<ParseResult | null> {
    const parser = this.getParserForFile(filePath)
    if (!parser) return null

    return parser.parse(content, filePath)
  }

  /**
   * Gets a list of all supported language names
   *
   * @returns Array of language names
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys())
  }

  /**
   * Gets a list of all supported file extensions
   *
   * @returns Array of file extensions (including dots)
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys())
  }
}

/**
 * Singleton registry instance
 */
let registry: ParserRegistry | null = null

/**
 * Gets the singleton parser registry instance
 *
 * @returns The global parser registry
 */
export function getParserRegistry(): ParserRegistry {
  if (!registry) {
    registry = new ParserRegistry()
  }
  return registry
}

/**
 * Gets a list of supported languages with their file extensions
 *
 * @returns Array of objects containing language name and supported extensions
 */
export function listSupportedLanguages(): Array<{ name: string, extensions: string[] }> {
  const reg = getParserRegistry()
  return Array.from(reg['parsers'].values()).map(parser => ({
    name: parser.name,
    extensions: parser.extensions,
  }))
}

/**
 * Export ParserRegistry class for testing purposes
 */
export { ParserRegistry }
