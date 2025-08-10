/**
 * Language parser registry for Tree-Sitter
 */

import JavaScript from 'tree-sitter-javascript'
import TypeScript from 'tree-sitter-typescript'
import Python from 'tree-sitter-python'
import Go from 'tree-sitter-go'
import Rust from 'tree-sitter-rust'
import Java from 'tree-sitter-java'
import C from 'tree-sitter-c'
import Cpp from 'tree-sitter-cpp'

import { LANGUAGE_EXTENSIONS } from '../constants/index.js'
import type { LanguageParser, ParseResult } from '../types/index.js'
import { BaseParser } from './base-parser.js'

// Language configuration
interface LanguageConfig {
  name: string
  grammar: any
  extensions: string[]
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
]

class ParserRegistry {
  private parsers: Map<string, LanguageParser> = new Map()
  private extensionMap: Map<string, string> = new Map()

  constructor() {
    this.initializeParsers()
  }

  private initializeParsers(): void {
    for (const config of LANGUAGE_CONFIGS) {
      const parser = new BaseParser(config.name, config.grammar, config.extensions)
      this.registerParser(parser)
    }
  }

  registerParser(parser: LanguageParser): void {
    this.parsers.set(parser.name, parser)

    // Map extensions to language names
    for (const ext of parser.extensions) {
      this.extensionMap.set(ext, parser.name)
    }
  }

  getParser(language: string): LanguageParser | undefined {
    return this.parsers.get(language)
  }

  getParserForFile(filePath: string): LanguageParser | undefined {
    const ext = this.getFileExtension(filePath)
    if (!ext) return undefined

    const language = this.extensionMap.get(ext)
    if (!language) return undefined

    return this.parsers.get(language)
  }

  private getFileExtension(filePath: string): string | undefined {
    const lastDot = filePath.lastIndexOf('.')
    if (lastDot === -1) return undefined
    return filePath.substring(lastDot)
  }

  canParse(filePath: string): boolean {
    return this.getParserForFile(filePath) !== undefined
  }

  async parseFile(filePath: string, content: string): Promise<ParseResult | null> {
    const parser = this.getParserForFile(filePath)
    if (!parser) return null

    return parser.parse(content, filePath)
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys())
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys())
  }
}

// Singleton instance
let registry: ParserRegistry | null = null

export function getParserRegistry(): ParserRegistry {
  if (!registry) {
    registry = new ParserRegistry()
  }
  return registry
}

export function listSupportedLanguages(): Array<{ name: string, extensions: string[] }> {
  const reg = getParserRegistry()
  return Array.from(reg['parsers'].values()).map(parser => ({
    name: parser.name,
    extensions: parser.extensions,
  }))
}

// Export for testing
export { ParserRegistry }
