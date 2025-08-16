/**
 * Base parser implementation using Tree-Sitter for multi-language code analysis
 */

import Parser from 'tree-sitter'
import { NODE_TYPES } from '../constants/analysis-constants.js'
import type {
  LanguageParser,
  ParseResult,
  ParsedElement,
  NodeType,
  FileInfo,
} from '../types/index.js'

/**
 * Base parser class that provides Tree-Sitter integration for code analysis
 *
 * This parser extracts semantic information from source code including:
 * - Functions, methods, classes, interfaces, and other code elements
 * - Parameter information and return types where available
 * - Import/export statements for dependency tracking
 * - Syntax error detection and reporting
 * - Position information (line/column) for all elements
 *
 * Supports multiple programming languages through language-specific grammars
 * and maintains consistent element extraction across different syntaxes.
 */
export class BaseParser implements LanguageParser {
  public name: string
  public extensions: string[]
  private parser: Parser

  /**
   * Creates a new parser instance for a specific language
   *
   * @param name - Human-readable language name (e.g., 'typescript', 'python')
   * @param language - Tree-Sitter language grammar
   * @param extensions - Array of file extensions this parser supports (e.g., ['.ts', '.tsx'])
   */
  constructor(name: string, language: any, extensions: string[]) {
    this.name = name
    this.extensions = extensions
    this.parser = new Parser()
    this.parser.setLanguage(language)
  }

  /**
   * Determines if this parser can handle the given file
   *
   * @param filePath - Path to the file to check
   * @returns True if the file extension is supported by this parser
   */
  canParse(filePath: string): boolean {
    const fileExt = this.getFileExtension(filePath)
    return this.extensions.includes(fileExt)
  }

  /**
   * Parses source code and extracts semantic information
   *
   * @param content - Source code content to parse
   * @param filePath - Path to the source file
   * @returns Complete parse results including elements, imports, exports, and errors
   */
  parse(content: string, filePath: string): ParseResult {
    const tree = this.parser.parse(content)
    const elements: ParsedElement[] = []
    const imports: string[] = []
    const exports: string[] = []
    const errors: string[] = []

    this.walkTree(tree.rootNode, content, elements, imports, exports)

    if (tree.rootNode.hasError) {
      errors.push('File contains syntax errors')
      this.collectErrors(tree.rootNode, errors, content)
    }

    const fileInfo: FileInfo = {
      path: filePath,
      language: this.name,
      size: Buffer.byteLength(content, 'utf8'),
    }

    return {
      file: fileInfo,
      elements,
      imports,
      exports,
      errors,
    }
  }

  /**
   * Recursively traverses the AST and extracts relevant information
   *
   * @param node - Current AST node to process
   * @param source - Original source code for text extraction
   * @param elements - Array to collect parsed code elements
   * @param imports - Array to collect import statements
   * @param exports - Array to collect export statements
   */
  private walkTree(
    node: Parser.SyntaxNode,
    source: string,
    elements: ParsedElement[],
    imports: string[],
    exports: string[],
  ): void {
    const element = this.processNode(node, source)
    if (element) {
      elements.push(element)
    }

    this.checkImportsExports(node, source, imports, exports)

    for (const child of node.children) {
      this.walkTree(child, source, elements, imports, exports)
    }
  }

  /**
   * Processes an individual AST node and extracts element information
   *
   * @param node - AST node to process
   * @param source - Source code for text extraction
   * @returns Parsed element or null if node is not relevant
   */
  private processNode(node: Parser.SyntaxNode, source: string): ParsedElement | null {
    const nodeType = this.mapNodeType(node.type)
    if (!nodeType) return null

    const name = this.extractNodeName(node, source)
    if (!name) return null

    const element: ParsedElement = {
      name,
      type: nodeType,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column,
      endColumn: node.endPosition.column,
    }

    if (nodeType === NODE_TYPES.FUNCTION || nodeType === NODE_TYPES.METHOD) {
      element.parameters = this.extractParameters(node, source)
      element.returnType = this.extractReturnType(node, source)
    }

    return element
  }

  /**
   * Maps Tree-Sitter node types to our standardized element types
   *
   * @param nodeType - Tree-Sitter node type string
   * @returns Standardized node type or null if not relevant
   */
  private mapNodeType(nodeType: string): NodeType | null {
    const typeMap: Record<string, NodeType> = {
      // Common across languages
      function_declaration: NODE_TYPES.FUNCTION,
      function_definition: NODE_TYPES.FUNCTION,
      method_declaration: NODE_TYPES.METHOD,
      method_definition: NODE_TYPES.METHOD,
      class_declaration: NODE_TYPES.CLASS,
      class_definition: NODE_TYPES.CLASS,
      interface_declaration: NODE_TYPES.INTERFACE,
      struct_declaration: NODE_TYPES.STRUCT,
      enum_declaration: NODE_TYPES.ENUM,
      type_alias: NODE_TYPES.TYPE,
      variable_declaration: NODE_TYPES.VARIABLE,
      const_declaration: NODE_TYPES.CONSTANT,

      // JavaScript/TypeScript specific
      arrow_function: NODE_TYPES.FUNCTION,
      function: NODE_TYPES.FUNCTION,
      generator_function: NODE_TYPES.FUNCTION,
      async_function: NODE_TYPES.FUNCTION,
      class: NODE_TYPES.CLASS,
      interface: NODE_TYPES.INTERFACE,
      type_alias_declaration: NODE_TYPES.TYPE,
      lexical_declaration: NODE_TYPES.VARIABLE,

      // Python specific
      decorated_definition: NODE_TYPES.FUNCTION,

      // Go specific
      type_declaration: NODE_TYPES.TYPE,
      struct_type: NODE_TYPES.STRUCT,
      interface_type: NODE_TYPES.INTERFACE,

      // Rust specific
      function_item: NODE_TYPES.FUNCTION,
      impl_item: NODE_TYPES.METHOD,
      struct_item: NODE_TYPES.STRUCT,
      enum_item: NODE_TYPES.ENUM,
      trait_item: NODE_TYPES.INTERFACE,

      // Java specific
      constructor_declaration: NODE_TYPES.METHOD,

      // C/C++ specific
      struct_specifier: NODE_TYPES.STRUCT,
      class_specifier: NODE_TYPES.CLASS,
      enum_specifier: NODE_TYPES.ENUM,
    }

    return typeMap[nodeType] || null
  }

  /**
   * Extracts the name/identifier from an AST node
   *
   * @param node - AST node to extract name from
   * @param source - Source code for text extraction
   * @returns Element name or null if not found
   */
  private extractNodeName(node: Parser.SyntaxNode, source: string): string | null {
    const identifierNode = this.findChildByType(node, [
      'identifier',
      'property_identifier',
      'field_identifier',
      'type_identifier',
    ])

    if (identifierNode) {
      return source.substring(identifierNode.startIndex, identifierNode.endIndex)
    }

    // Fallback for specific node types
    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name')
      if (nameNode) {
        return source.substring(nameNode.startIndex, nameNode.endIndex)
      }
    }

    return null
  }

  /**
   * Extracts parameter names from function/method nodes
   *
   * @param node - Function or method AST node
   * @param source - Source code for text extraction
   * @returns Array of parameter names
   */
  private extractParameters(node: Parser.SyntaxNode, source: string): string[] {
    const params: string[] = []
    const paramList = this.findChildByType(node, [
      'formal_parameters',
      'parameter_list',
      'parameters',
    ])

    if (paramList) {
      for (const child of paramList.children) {
        if (child.type === 'identifier' || child.type === 'parameter') {
          const paramName = source.substring(child.startIndex, child.endIndex)
          if (paramName && paramName !== ',' && paramName !== '(' && paramName !== ')') {
            params.push(paramName)
          }
        }
      }
    }

    return params
  }

  /**
   * Extracts return type information from function/method nodes
   *
   * @param node - Function or method AST node
   * @param source - Source code for text extraction
   * @returns Return type string or undefined if not found
   */
  private extractReturnType(node: Parser.SyntaxNode, source: string): string | undefined {
    const returnTypeNode
      = node.childForFieldName('return_type')
        || this.findChildByType(node, ['type_annotation', 'return_type'])

    if (returnTypeNode) {
      return source.substring(returnTypeNode.startIndex, returnTypeNode.endIndex)
    }

    return undefined
  }

  private checkImportsExports(
    node: Parser.SyntaxNode,
    source: string,
    imports: string[],
    exports: string[],
  ): void {
    // Check for import statements
    if (node.type.includes('import')) {
      const importPath = this.extractImportPath(node, source)
      if (importPath && !imports.includes(importPath)) {
        imports.push(importPath)
      }
    }

    // Check for export statements
    if (node.type.includes('export')) {
      const exportName = this.extractExportName(node, source)
      if (exportName && !exports.includes(exportName)) {
        exports.push(exportName)
      }
    }
  }

  private extractImportPath(node: Parser.SyntaxNode, source: string): string | null {
    // Find string literal in import statement
    const stringNode = this.findChildByType(node, ['string', 'string_literal'])
    if (stringNode) {
      const path = source.substring(stringNode.startIndex, stringNode.endIndex)
      // Remove quotes
      return path.replace(/^['"`]|['"`]$/g, '')
    }
    return null
  }

  private extractExportName(node: Parser.SyntaxNode, source: string): string | null {
    // Find identifier in export statement
    const identifierNode = this.findChildByType(node, ['identifier'])
    if (identifierNode) {
      return source.substring(identifierNode.startIndex, identifierNode.endIndex)
    }
    return null
  }

  private findChildByType(node: Parser.SyntaxNode, types: string[]): Parser.SyntaxNode | null {
    for (const child of node.children) {
      if (types.includes(child.type)) {
        return child
      }
    }
    return null
  }

  private collectErrors(node: Parser.SyntaxNode, errors: string[], source: string): void {
    if (node.hasError) {
      if (node.isMissing) {
        errors.push(`Missing ${node.type} at line ${node.startPosition.row + 1}`)
      }
      else if (node.type === 'ERROR') {
        const text = source.substring(node.startIndex, node.endIndex)
        errors.push(`Syntax error at line ${node.startPosition.row + 1}: "${text}"`)
      }
    }

    for (const child of node.children) {
      this.collectErrors(child, errors, source)
    }
  }

  /**
   * Extracts file extension from a file path
   *
   * @param filePath - Path to extract extension from
   * @returns File extension including the dot, or empty string if none
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.')
    return lastDot > -1 ? filePath.substring(lastDot) : ''
  }
}
