/**
 * Language parser registry - simplified but functional
 */

import Parser from 'tree-sitter'
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
import HTML from 'tree-sitter-html'
import Kotlin from 'tree-sitter-kotlin'

import { LOGIC_EXTENSIONS, PARSER_NAMES, FUNCTION_TYPES, CLASS_TYPES } from '../constants/index.js'
import type { LanguageConfig, TreeSitterLanguage } from '../types/core.js'

export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    name: PARSER_NAMES.JAVASCRIPT,
    extensions: [...LOGIC_EXTENSIONS.JAVASCRIPT, '.jsx'],
    parserName: PARSER_NAMES.JAVASCRIPT,
    functionTypes: [...FUNCTION_TYPES.JAVASCRIPT],
    classTypes: [...CLASS_TYPES.JAVASCRIPT],
  },
  {
    name: PARSER_NAMES.TYPESCRIPT,
    extensions: [...LOGIC_EXTENSIONS.TYPESCRIPT, '.tsx'],
    parserName: PARSER_NAMES.TYPESCRIPT,
    functionTypes: [...FUNCTION_TYPES.TYPESCRIPT],
    classTypes: [...CLASS_TYPES.TYPESCRIPT],
  },
  {
    name: PARSER_NAMES.PYTHON,
    extensions: [...LOGIC_EXTENSIONS.PYTHON],
    parserName: PARSER_NAMES.PYTHON,
    functionTypes: [...FUNCTION_TYPES.PYTHON],
    classTypes: [...CLASS_TYPES.PYTHON],
  },
  {
    name: PARSER_NAMES.GO,
    extensions: [...LOGIC_EXTENSIONS.GO],
    parserName: PARSER_NAMES.GO,
    functionTypes: [...FUNCTION_TYPES.GO],
    classTypes: [...CLASS_TYPES.GO],
  },
  {
    name: PARSER_NAMES.RUST,
    extensions: [...LOGIC_EXTENSIONS.RUST],
    parserName: PARSER_NAMES.RUST,
    functionTypes: [...FUNCTION_TYPES.RUST],
    classTypes: [...CLASS_TYPES.RUST],
  },
  {
    name: PARSER_NAMES.JAVA,
    extensions: [...LOGIC_EXTENSIONS.JAVA],
    parserName: PARSER_NAMES.JAVA,
    functionTypes: [...FUNCTION_TYPES.JAVA],
    classTypes: [...CLASS_TYPES.JAVA],
  },
  {
    name: PARSER_NAMES.C,
    extensions: [...LOGIC_EXTENSIONS.C],
    parserName: PARSER_NAMES.C,
    functionTypes: [...FUNCTION_TYPES.C],
    classTypes: [...CLASS_TYPES.C],
  },
  {
    name: PARSER_NAMES.CPP,
    extensions: [...LOGIC_EXTENSIONS.CPP],
    parserName: PARSER_NAMES.CPP,
    functionTypes: [...FUNCTION_TYPES.CPP],
    classTypes: [...CLASS_TYPES.CPP],
  },
  {
    name: PARSER_NAMES.RUBY,
    extensions: [...LOGIC_EXTENSIONS.RUBY],
    parserName: PARSER_NAMES.RUBY,
    functionTypes: [...FUNCTION_TYPES.RUBY],
    classTypes: [...CLASS_TYPES.RUBY],
  },
  {
    name: PARSER_NAMES.CSHARP,
    extensions: [...LOGIC_EXTENSIONS.CSHARP],
    parserName: PARSER_NAMES.CSHARP,
    functionTypes: [...FUNCTION_TYPES.CSHARP],
    classTypes: [...CLASS_TYPES.CSHARP],
  },
  {
    name: PARSER_NAMES.PHP,
    extensions: [...LOGIC_EXTENSIONS.PHP],
    parserName: PARSER_NAMES.PHP,
    functionTypes: [...FUNCTION_TYPES.PHP],
    classTypes: [...CLASS_TYPES.PHP],
  },
  {
    name: PARSER_NAMES.HTML,
    extensions: ['.html', '.htm'],
    parserName: PARSER_NAMES.HTML,
    functionTypes: [...FUNCTION_TYPES.HTML],
    classTypes: [...CLASS_TYPES.HTML],
  },
  {
    name: PARSER_NAMES.KOTLIN,
    extensions: [...LOGIC_EXTENSIONS.KOTLIN],
    parserName: PARSER_NAMES.KOTLIN,
    functionTypes: [...FUNCTION_TYPES.KOTLIN],
    classTypes: [...CLASS_TYPES.KOTLIN],
  },
]

const GRAMMARS: Record<string, TreeSitterLanguage> = {
  [PARSER_NAMES.JAVASCRIPT]: JavaScript,
  [PARSER_NAMES.TYPESCRIPT]: TypeScript.typescript,
  [PARSER_NAMES.TSX]: TypeScript.tsx,
  [PARSER_NAMES.PYTHON]: Python,
  [PARSER_NAMES.GO]: Go,
  [PARSER_NAMES.RUST]: Rust,
  [PARSER_NAMES.JAVA]: Java,
  [PARSER_NAMES.C]: C,
  [PARSER_NAMES.CPP]: Cpp,
  [PARSER_NAMES.RUBY]: Ruby,
  [PARSER_NAMES.CSHARP]: CSharp,
  [PARSER_NAMES.PHP]: PHP.php,
  [PARSER_NAMES.HTML]: HTML,
  [PARSER_NAMES.KOTLIN]: Kotlin,
}

const parsers = new Map<string, Parser>()

export function initializeParsers(): void {
  for (const config of LANGUAGE_CONFIGS) {
    const grammar = GRAMMARS[config.parserName]
    if (grammar) {
      const parser = new Parser()
      try {
        parser.setLanguage(grammar)
        parsers.set(config.name, parser)
      }
      catch (error) {
        console.warn(`Failed to initialize parser for ${config.name}:`, error)
      }
    }
  }
}

export function getParser(language: string): Parser | undefined {
  return parsers.get(language)
}

export function getLanguageByExtension(extension: string): LanguageConfig | undefined {
  return LANGUAGE_CONFIGS.find(config =>
    config.extensions.includes(extension.toLowerCase()),
  )
}

export function getLanguageByName(name: string): LanguageConfig | undefined {
  return LANGUAGE_CONFIGS.find(config => config.name === name)
}

initializeParsers()