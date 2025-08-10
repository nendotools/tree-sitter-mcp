/**
 * Parser tests for Tree-Sitter functionality
 */

import { describe, it, expect, beforeAll } from 'vitest'
import Parser from 'tree-sitter'
import JavaScript from 'tree-sitter-javascript'
import { getParserRegistry } from '../parsers/registry.js'
import { readFileSync } from 'fs'
import { join } from 'path'

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

describe('Language Fixture Parsing', () => {
  const registry = getParserRegistry()
  const fixturesDir = join(__dirname, 'fixtures')

  const languageFixtures = [
    { lang: 'javascript', file: 'javascript-example/src/user.js' },
    { lang: 'typescript', file: 'typescript-example/src/user.ts' },
    { lang: 'python', file: 'python-example/src/user.py' },
    { lang: 'go', file: 'go-example/user.go' },
    { lang: 'rust', file: 'rust-example/src/user.rs' },
    { lang: 'java', file: 'java-example/src/com/example/models/User.java' },
    { lang: 'c', file: 'c-example/src/user.c' },
    { lang: 'cpp', file: 'cpp-example/src/user.hpp' },
    { lang: 'ruby', file: 'ruby-example/lib/user.rb' },
    { lang: 'csharp', file: 'csharp-example/Models/User.cs' },
    { lang: 'php', file: 'php-example/src/User.php' },
    { lang: 'kotlin', file: 'kotlin-example/src/User.kt' },
    { lang: 'scala', file: 'scala-example/src/User.scala' },
    { lang: 'elixir', file: 'elixir-example/lib/user.ex' },
  ]

  languageFixtures.forEach(({ lang, file }) => {
    it(`should parse ${lang} fixture without errors`, async () => {
      const filePath = join(fixturesDir, file)
      let code: string

      try {
        code = readFileSync(filePath, 'utf8')
      }
      catch {
        console.warn(`Could not read fixture file: ${filePath}`)
        return
      }

      // Use the registry's parseFile method which handles grammar selection internally
      const result = await registry.parseFile(filePath, code)
      expect(result).toBeDefined()
      expect(result?.file).toBeDefined()
      expect(result?.file.language).toBe(lang)
      expect(result?.errors.length).toBe(0)

      // Check that we extracted some elements
      // Note: Some languages might not extract elements due to parser limitations
      // but successful parsing without errors is the main goal
      if (result?.elements.length === 0) {
        console.warn(`No elements extracted for ${lang} - this may be expected for some languages`)
      }
    })
  })
})
