/**
 * Parser tests for Tree-Sitter functionality
 */

import { describe, it, expect, beforeAll } from 'vitest'
import Parser from 'tree-sitter'
import JavaScript from 'tree-sitter-javascript'

describe('Tree-Sitter Parser', () => {
  let parser: Parser

  beforeAll(() => {
    parser = new Parser()
    parser.setLanguage(JavaScript)
  })

  it('should parse JavaScript code', () => {
    const code = `
      function hello(name) {
        console.log('Hello, ' + name);
      }
    `

    const tree = parser.parse(code)
    expect(tree).toBeDefined()
    expect(tree.rootNode).toBeDefined()
    expect(tree.rootNode.type).toBe('program')
  })

  it('should find function declarations', () => {
    const code = `
      function greet(name) {
        return 'Hello, ' + name;
      }
      
      const add = (a, b) => a + b;
    `

    const tree = parser.parse(code)
    const functions: string[] = []

    const walk = (node: Parser.SyntaxNode) => {
      if (node.type === 'function_declaration' || node.type === 'arrow_function') {
        const nameNode = node.childForFieldName('name')
        if (nameNode) {
          functions.push(code.substring(nameNode.startIndex, nameNode.endIndex))
        }
      }
      for (const child of node.children) {
        walk(child)
      }
    }

    walk(tree.rootNode)
    expect(functions).toContain('greet')
  })

  it('should detect syntax errors', () => {
    const code = `function broken( { }`
    const tree = parser.parse(code)
    // In tree-sitter, hasError is a property, not a method
    expect(tree.rootNode.hasError).toBe(true)
  })

  it('should parse classes', () => {
    const code = `
      class Animal {
        constructor(name) {
          this.name = name;
        }
        
        speak() {
          console.log(this.name + ' makes a sound');
        }
      }
    `

    const tree = parser.parse(code)
    let className = ''

    const walk = (node: Parser.SyntaxNode) => {
      if (node.type === 'class_declaration') {
        const nameNode = node.childForFieldName('name')
        if (nameNode) {
          className = code.substring(nameNode.startIndex, nameNode.endIndex)
        }
      }
      for (const child of node.children) {
        walk(child)
      }
    }

    walk(tree.rootNode)
    expect(className).toBe('Animal')
  })
})
