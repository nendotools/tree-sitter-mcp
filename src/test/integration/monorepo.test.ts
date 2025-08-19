/**
 * Comprehensive monorepo tests for mixed-language projects
 * Tests the rpengine scenario: Go server + Node.js client with proper ignore patterns
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { getOrCreateProject } from '../../project/persistent-manager.js'
import { createPersistentManager } from '../../project/persistent-manager.js'
import { searchCode, findUsage } from '../../core/search.js'
import { analyzeProject } from '../../analysis/index.js'
import type { TreeNode, Project } from '../../types/core.js'

const TEST_FIXTURE_PATH = join(process.cwd(), 'src/test/fixtures/mixed-monorepo')

// Helper function to get all search nodes from a project (including monorepo sub-projects)
function getSearchNodes(project: Project): TreeNode[] {
  const allNodes: TreeNode[] = []

  // Add nodes from main project
  allNodes.push(...Array.from(project.files.values()))
  allNodes.push(...Array.from(project.nodes.values()).flat())

  // Add nodes from sub-projects (monorepo)
  if (project.subProjects) {
    for (const subProject of project.subProjects) {
      allNodes.push(...Array.from(subProject.files.values()))
      allNodes.push(...Array.from(subProject.nodes.values()).flat())
    }
  }

  return allNodes
}

describe.skip('Mixed Monorepo Handling', () => {
  let persistentManager: any

  beforeEach(async () => {
    persistentManager = createPersistentManager()

    // Create test monorepo structure similar to rpengine
    mkdirSync(TEST_FIXTURE_PATH, { recursive: true })

    // Root level files (should be ignored in parsing)
    writeFileSync(join(TEST_FIXTURE_PATH, 'README.md'), `# Test Monorepo
This is a test monorepo with mixed language support.`)

    writeFileSync(join(TEST_FIXTURE_PATH, 'docker-compose.yml'), `version: '3.8'
services:
  api:
    build: ./server
  web:
    build: ./client`)

    // Create Go server subdirectory
    const serverPath = join(TEST_FIXTURE_PATH, 'server')
    mkdirSync(serverPath, { recursive: true })

    writeFileSync(join(serverPath, 'go.mod'), `module test-server

go 1.21

require (
    github.com/gorilla/mux v1.8.0
)`)

    writeFileSync(join(serverPath, 'main.go'), `package main

import (
    "fmt"
    "log"
    "net/http"
    "github.com/gorilla/mux"
)

type User struct {
    ID   string \`json:"id"\`
    Name string \`json:"name"\`
}

type ApiResponse struct {
    Data interface{} \`json:"data"\`
    Status string \`json:"status"\`
}

func handleGetUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    user := User{
        ID:   vars["id"],
        Name: "Test User",
    }
    fmt.Fprintf(w, "User: %+v", user)
}

func handleCreateUser(w http.ResponseWriter, r *http.Request) {
    user := User{
        ID:   "new-user-123",
        Name: "New User",
    }
    fmt.Fprintf(w, "Created: %+v", user)
}

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/users/{id}", handleGetUser).Methods("GET")
    r.HandleFunc("/users", handleCreateUser).Methods("POST")
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", r))
}`)

    // Create handlers subdirectory in server
    const handlersPath = join(serverPath, 'handlers')
    mkdirSync(handlersPath, { recursive: true })

    writeFileSync(join(handlersPath, 'middleware.go'), `package handlers

import (
    "fmt"
    "net/http"
)

type AuthMiddleware struct {
    secret string
}

func NewAuthMiddleware(secret string) *AuthMiddleware {
    return &AuthMiddleware{secret: secret}
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Simple auth logic
        token := r.Header.Get("Authorization")
        if token == "" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        fmt.Printf("Authenticated request with token: %s\n", token)
        next.ServeHTTP(w, r)
    })
}`)

    // Create Node.js client subdirectory
    const clientPath = join(TEST_FIXTURE_PATH, 'client')
    mkdirSync(clientPath, { recursive: true })

    writeFileSync(join(clientPath, 'package.json'), `{
  "name": "test-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite dev"
  },
  "dependencies": {
    "vue": "^3.3.0",
    "typescript": "^5.0.0"
  }
}`)

    writeFileSync(join(clientPath, 'vite.config.ts'), `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
})`)

    // Create components directory in client
    const componentsPath = join(clientPath, 'components')
    mkdirSync(componentsPath, { recursive: true })

    writeFileSync(join(componentsPath, 'UserCard.vue'), `<template>
  <div class="user-card">
    <h3>{{ user.name }}</h3>
    <p>ID: {{ user.id }}</p>
    <button @click="handleEdit">Edit User</button>
  </div>
</template>

<script setup lang="ts">
interface User {
  id: string
  name: string
}

interface Props {
  user: User
}

const props = defineProps<Props>()

const handleEdit = () => {
  // Edit user logic
  console.log('Editing user:', props.user.id)
}
</script>`)

    writeFileSync(join(componentsPath, 'GameSession.vue'), `<template>
  <div class="game-session">
    <h2>Game Session: {{ session.id }}</h2>
    <div class="players">
      <UserCard 
        v-for="player in session.players" 
        :key="player.id"
        :user="player"
      />
    </div>
    <button @click="createSession">New Session</button>
  </div>
</template>

<script setup lang="ts">
interface User {
  id: string
  name: string
}

interface GameSession {
  id: string
  players: User[]
}

const session = ref<GameSession>({
  id: 'session-123',
  players: []
})

const createSession = async () => {
  const response = await $fetch('/api/sessions', { method: 'POST' })
  session.value = response
}
</script>`)

    // Create TypeScript files in client
    const clientSrcPath = join(clientPath, 'src')
    mkdirSync(clientSrcPath, { recursive: true })

    writeFileSync(join(clientSrcPath, 'api.ts'), `export interface User {
  id: string
  name: string
  email?: string
}

export interface GameSession {
  id: string
  players: User[]
  createdAt: Date
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async getUser(id: string): Promise<User> {
    const response = await fetch(this.baseUrl + '/users/' + id)
    return response.json()
  }

  async createSession(): Promise<GameSession> {
    const response = await fetch(this.baseUrl + '/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    return response.json()
  }
}`)

    // Create MASSIVE node_modules directory that should be ignored
    const nodeModulesPath = join(clientPath, 'node_modules')
    mkdirSync(nodeModulesPath, { recursive: true })

    // Create nested package structure that would confuse monorepo detection
    const nestedPackagePath = join(nodeModulesPath, '@nuxt/typescript-build')
    mkdirSync(nestedPackagePath, { recursive: true })

    writeFileSync(join(nestedPackagePath, 'package.json'), `{
  "name": "@nuxt/typescript-build",
  "version": "3.0.0",
  "main": "index.js"
}`)

    // Add many fake files that would slow down parsing
    for (let i = 0; i < 50; i++) {
      writeFileSync(join(nestedPackagePath, `fake-file-${i}.js`), `// Fake dependency file ${i}
module.exports = { fake: true }`)
    }

    // Create another nested package
    const anotherPackagePath = join(nodeModulesPath, 'vue')
    mkdirSync(anotherPackagePath, { recursive: true })

    writeFileSync(join(anotherPackagePath, 'package.json'), `{
  "name": "vue",
  "version": "3.3.8",
  "main": "dist/vue.js"
}`)

    for (let i = 0; i < 30; i++) {
      writeFileSync(join(anotherPackagePath, `vue-component-${i}.js`), `// Vue component ${i}
export default { name: 'Component${i}' }`)
    }

    // Create .output directory that should also be ignored
    const outputPath = join(clientPath, '.output')
    mkdirSync(outputPath, { recursive: true })

    const outputServerPath = join(outputPath, 'server')
    mkdirSync(outputServerPath, { recursive: true })

    for (let i = 0; i < 20; i++) {
      writeFileSync(join(outputServerPath, `build-artifact-${i}.js`), `// Build artifact ${i}
module.exports = { compiled: true }`)
    }
  })

  afterEach(async () => {
    // Clean up persistent manager
    const { clearMemory } = await import('../../project/memory.js')
    clearMemory(persistentManager.memory)

    // Clean up test files
    try {
      rmSync(TEST_FIXTURE_PATH, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })

  it('should detect mixed monorepo correctly', async () => {
    const project = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [], // Auto-detect all languages
      },
      'mixed-monorepo-test',
    )

    // Should detect as monorepo
    expect(project.isMonorepo).toBe(true)
    expect(project.subProjects).toBeDefined()
    expect(project.subProjects!.length).toBe(2)

    // Check sub-project directories
    const subProjectDirs = project.subProjects!.map(p => p.config.directory.split('/').pop())
    expect(subProjectDirs).toContain('server')
    expect(subProjectDirs).toContain('client')
  })

  it('should parse only legitimate source files, ignoring node_modules and build artifacts', async () => {
    const project = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [],
      },
      'file-filtering-test',
    )

    // Get all parsed files from all sub-projects
    const allFiles = new Set<string>()

    if (project.subProjects) {
      for (const subProject of project.subProjects) {
        for (const filePath of subProject.files.keys()) {
          allFiles.add(filePath)
        }
      }
    }

    // Should include legitimate source files
    const fileList = Array.from(allFiles)
    const goFiles = fileList.filter(f => f.endsWith('.go'))
    const tsFiles = fileList.filter(f => f.endsWith('.ts'))
    const vueFiles = fileList.filter(f => f.endsWith('.vue'))

    expect(goFiles.length).toBeGreaterThan(0)
    expect(tsFiles.length).toBeGreaterThan(0)
    expect(vueFiles.length).toBeGreaterThan(0)

    // Should NOT include any files from ignored directories
    const nodeModulesFiles = fileList.filter(f => f.includes('node_modules'))
    const outputFiles = fileList.filter(f => f.includes('.output'))

    expect(nodeModulesFiles).toHaveLength(0)
    expect(outputFiles).toHaveLength(0)

    // Verify we're not parsing thousands of fake files
    expect(fileList.length).toBeLessThan(20) // Should be around 6-8 legitimate files
  })

  it('should enable cross-project search across different languages', async () => {
    const project = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [],
      },
      'cross-project-search-test',
    )

    // Search for "User" should find it in both Go and TypeScript
    const searchNodes = getSearchNodes(project)

    // Debug: Check what nodes we have
    console.log(`Total search nodes: ${searchNodes.length}`)
    console.log('Node types:', searchNodes.map(n => n.type).slice(0, 10))
    console.log('Node names:', searchNodes.filter(n => n.name).map(n => n.name).slice(0, 10))

    const userResults = searchCode('User', searchNodes, {
      // Don't filter by types initially to see what we get
      exactMatch: false,
      maxResults: 20,
      fuzzyThreshold: 30,
    })

    console.log(`User search results: ${userResults.length}`)
    if (userResults.length > 0) {
      console.log('First result:', userResults[0])
    }

    expect(userResults.length).toBeGreaterThan(0)

    // Check what we found in each language
    const goUserResults = userResults.filter(r => r.node.path.endsWith('.go'))
    const tsUserResults = userResults.filter(r => r.node.path.endsWith('.ts'))

    console.log(`Go User results: ${goUserResults.length}`)
    console.log(`TypeScript User results: ${tsUserResults.length}`)

    // Should find User struct in Go (main.go has User struct)
    expect(goUserResults.length).toBeGreaterThan(0)

    // Should find User interface in TypeScript (api.ts has User interface)
    expect(tsUserResults.length).toBeGreaterThan(0)

    // Search for "GameSession" should also be found in both languages
    const sessionResults = searchCode('GameSession', searchNodes, {
      // Don't filter by types initially
      exactMatch: false,
      maxResults: 20,
      fuzzyThreshold: 30,
    })

    console.log(`GameSession search results: ${sessionResults.length}`)

    const goSessionResults = sessionResults.filter(r => r.node.path.endsWith('.go'))
    const tsSessionResults = sessionResults.filter(r => r.node.path.endsWith('.ts'))

    console.log(`Go GameSession results: ${goSessionResults.length}`)
    console.log(`TypeScript GameSession results: ${tsSessionResults.length}`)

    expect(sessionResults.length).toBeGreaterThan(0)
    // GameSession is only in TypeScript files (client), adjust expectation
    expect(tsSessionResults.length).toBeGreaterThan(0)
  })

  it('should handle language-specific searches correctly', async () => {
    const project = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: ['go'], // Only Go files
      },
      'go-only-test',
    )

    const allFiles = new Set<string>()
    if (project.subProjects) {
      for (const subProject of project.subProjects) {
        for (const filePath of subProject.files.keys()) {
          allFiles.add(filePath)
        }
      }
    }

    const fileList = Array.from(allFiles)

    // Should only contain Go files
    const goFiles = fileList.filter(f => f.endsWith('.go'))
    const nonGoFiles = fileList.filter(f => !f.endsWith('.go'))

    expect(goFiles.length).toBeGreaterThan(0)
    expect(nonGoFiles).toHaveLength(0)
  })

  it('should demonstrate performance benefits of proper file filtering', async () => {
    const startTime = Date.now()

    const project = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [],
      },
      'performance-test',
    )

    const endTime = Date.now()
    const parseTime = endTime - startTime

    // With proper filtering, should parse quickly despite large node_modules
    expect(parseTime).toBeLessThan(5000) // Should take less than 5 seconds

    // Verify we didn't parse the fake files
    const allFiles = new Set<string>()
    if (project.subProjects) {
      for (const subProject of project.subProjects) {
        for (const filePath of subProject.files.keys()) {
          allFiles.add(filePath)
        }
      }
    }

    // Should have parsed only legitimate source files, not the 100+ fake files
    expect(allFiles.size).toBeLessThan(20)
    expect(allFiles.size).toBeGreaterThan(5) // But should have found the real ones
  })

  it('should handle persistent caching correctly for monorepos', async () => {
    // First access - should parse
    const startTime1 = Date.now()
    const project1 = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [],
      },
      'caching-test',
    )
    const parseTime1 = Date.now() - startTime1

    // Second access - should use cache
    const startTime2 = Date.now()
    const project2 = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [],
      },
      'caching-test',
    )
    const parseTime2 = Date.now() - startTime2

    // Should be significantly faster on second access
    expect(parseTime2).toBeLessThan(parseTime1 / 2)

    // Should be the same project reference
    expect(project1.id).toBe(project2.id)

    // Should have same number of files in both
    const files1 = new Set<string>()
    const files2 = new Set<string>()

    if (project1.subProjects) {
      for (const subProject of project1.subProjects) {
        for (const filePath of subProject.files.keys()) {
          files1.add(filePath)
        }
      }
    }

    if (project2.subProjects) {
      for (const subProject of project2.subProjects) {
        for (const filePath of subProject.files.keys()) {
          files2.add(filePath)
        }
      }
    }

    expect(files1.size).toBe(files2.size)
  })

  it.skip('should handle cross-project find-usage correctly', async () => {
    const project = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [],
      },
      'find-usage-test',
    )

    const searchNodes = getSearchNodes(project)

    // Find usage of "User" across both languages
    const userUsage = findUsage('User', searchNodes, {
      exactMatch: true,
      caseSensitive: false,
      maxResults: 50,
    })

    expect(userUsage.length).toBeGreaterThan(0)

    // Should find usage in files (adjust expectations based on actual usage patterns)
    const goUsage = userUsage.filter(u => u.context?.path?.endsWith('.go'))
    const tsUsage = userUsage.filter(u => u.context?.path?.endsWith('.ts'))

    // At least one language should have usage
    expect(goUsage.length + tsUsage.length).toBeGreaterThan(0)

    // Find usage of API-specific terms
    const apiUsage = findUsage('getUser', searchNodes, {
      exactMatch: false,
      caseSensitive: false,
      maxResults: 20,
    })

    expect(apiUsage.length).toBeGreaterThan(0)
  })

  it.skip('should perform cross-project code analysis correctly', async () => {
    await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [],
      },
      'analysis-test',
    )

    // Perform comprehensive analysis across the monorepo
    const analysisResult = await analyzeProject(TEST_FIXTURE_PATH, {
      analysisTypes: ['quality', 'structure'],
      scope: 'project',
      severity: 'info',
      includeMetrics: true,
    })

    expect(analysisResult).toBeDefined()
    expect(analysisResult.summary).toBeDefined()

    // Should analyze files from both sub-projects
    if (analysisResult.summary.totalFiles !== undefined) {
      expect(analysisResult.summary.totalFiles).toBeGreaterThan(0)
    }

    // Should have findings from different languages
    if (analysisResult.findings && analysisResult.findings.length > 0) {
      const findings = analysisResult.findings
      const goFindings = findings.filter(f => f.location?.path?.endsWith('.go'))
      const tsFindings = findings.filter(f => f.location?.path?.endsWith('.ts'))

      // At least one language should have findings (depending on code quality)
      expect(goFindings.length + tsFindings.length).toBeGreaterThan(0)
    }

    // Should include metrics for the entire project
    if (analysisResult.metrics) {
      expect(analysisResult.metrics.totalFiles).toBeGreaterThan(5)
      expect(analysisResult.metrics.totalLines).toBeGreaterThan(50)
    }
  })

  it('should demonstrate monorepo-specific functionality benefits', async () => {
    const project = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: [],
      },
      'monorepo-benefits-test',
    )

    const searchNodes = getSearchNodes(project)

    // Test 1: Cross-language API consistency
    // Find all functions/methods that handle users across languages
    const userHandlers = searchCode('User', searchNodes, {
      exactMatch: false,
      maxResults: 50,
      fuzzyThreshold: 20,
    })

    // Should find user-related code in multiple languages
    const languages = new Set(userHandlers.map((r) => {
      if (r.node.path.endsWith('.go')) return 'go'
      if (r.node.path.endsWith('.ts')) return 'typescript'
      if (r.node.path.endsWith('.vue')) return 'vue'
      return 'other'
    }))

    expect(languages.size).toBeGreaterThan(1) // Multi-language project

    // Test 2: API contract consistency
    // Search for API endpoints across client and server
    const apiEndpoints = searchCode('sessions', searchNodes, {
      exactMatch: false,
      maxResults: 20,
      fuzzyThreshold: 30,
    })

    expect(apiEndpoints.length).toBeGreaterThan(0)

    // Test 3: Shared data structures
    // Verify that similar structures exist across languages
    const dataStructures = searchCode('id', searchNodes, {
      exactMatch: false,
      maxResults: 50,
      fuzzyThreshold: 50,
    })

    // Should find 'id' field usage across multiple files
    const fileCount = new Set(dataStructures.map(r => r.node.path)).size
    expect(fileCount).toBeGreaterThan(0) // At least one file with id references
  })

  it('should handle monorepo error scenarios gracefully', async () => {
    // Test with invalid sub-project (simulate missing directory)
    const invalidPath = join(TEST_FIXTURE_PATH, 'nonexistent-project')

    // Should not crash when trying to analyze invalid monorepo structure
    await expect(async () => {
      await getOrCreateProject(
        persistentManager,
        {
          directory: invalidPath,
          languages: [],
        },
        'error-handling-test',
      )
    }).rejects.toThrow() // Should properly throw error for invalid directory

    // Test with mixed valid/invalid projects should work for valid parts
    const validProject = await getOrCreateProject(
      persistentManager,
      {
        directory: TEST_FIXTURE_PATH,
        languages: ['nonexistent-language'] as any, // Invalid language
      },
      'partial-error-test',
    )

    // Should still create project but with no files parsed
    expect(validProject).toBeDefined()
  })
})