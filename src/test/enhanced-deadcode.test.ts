/**
 * Enhanced Dead Code Analyzer Tests - Real scenarios that trigger detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TreeManager } from '../core/tree-manager.js'
import { DeadCodeCoordinator } from '../mcp/tools/analyzers/deadcode/deadcode-coordinator.js'
import { getParserRegistry } from '../parsers/registry.js'
import type { Config, AnalysisResult } from '../types/index.js'
import { mkdtemp, writeFile, rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('Enhanced Dead Code Analyzer - Real Detection Scenarios', () => {
  let treeManager: TreeManager
  let testDir: string
  let testConfig: Config

  // Helper function to get file nodes from a project
  const getFileNodes = (projectId: string) => {
    const project = treeManager.getProject(projectId)
    if (!project) throw new Error(`Project ${projectId} not found`)
    
    return Array.from(project.fileIndex.values()).filter(node => 
      node && node.type === 'file' && node.content
    )
  }

  // Helper function to create directory if it doesn't exist
  const ensureDir = async (dirPath: string) => {
    try {
      await mkdir(dirPath, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  beforeEach(async () => {
    treeManager = new TreeManager(getParserRegistry())
    
    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'deadcode-test-'))
    
    testConfig = {
      workingDir: testDir,
      languages: ['typescript', 'javascript', 'tsx', 'json'],
      maxDepth: 10,
      ignoreDirs: ['node_modules', '.git'],
    }
  })

  afterEach(async () => {
    // Clean up all projects
    const projects = treeManager.getAllProjects()
    for (const project of projects) {
      try {
        treeManager.destroyProject(project.projectId)
      } catch {
        // Project may already be destroyed
      }
    }
    
    // Clean up test directory
    if (testDir) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  describe('Shadcn-style Self-Referencing Components', () => {
    it('should detect unused exports in index.ts barrel files', async () => {
      // Create shadcn-style component structure
      await writeFile(join(testDir, 'button.tsx'), `
import React from 'react'

export interface ButtonProps {
  variant?: 'default' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
}

export const Button: React.FC<ButtonProps> = ({ variant = 'default', size = 'default' }) => {
  return <button className={\`btn btn-\${variant} btn-\${size}\`}>Button</button>
}

export const buttonVariants = {
  default: 'bg-primary',
  destructive: 'bg-destructive'
}
`)

      await writeFile(join(testDir, 'index.ts'), `
// Barrel file that exports everything but components aren't imported anywhere
export { Button, ButtonProps, buttonVariants } from './button'
export { default as BadgeComponent } from './badge'  // This doesn't exist
`)

      await writeFile(join(testDir, 'app.tsx'), `
import React from 'react'

// App that doesn't import any components from our barrel file
export const App = () => {
  return <div>Hello World</div>  // No Button usage
}
`)

      // Create and initialize project
      await treeManager.createProject('shadcn-test', testConfig)
      await treeManager.initializeProject('shadcn-test')

      // Get file nodes
      const fileNodes = getFileNodes('shadcn-test')

      // Run analysis
      const analysisResult: AnalysisResult = {
        projectId: 'shadcn-test',
        analysisTypes: ['deadcode'],
        scope: 'project',
        findings: [],
        metrics: { deadCode: { orphanedFiles: 0, unusedExports: 0, unusedDependencies: 0 } },
        summary: {
          totalIssues: 0,
          severityBreakdown: { info: 0, warning: 0, critical: 0 }
        }
      }

      const coordinator = new DeadCodeCoordinator()
      await coordinator.analyze(fileNodes, analysisResult)

      // Verify results
      expect(analysisResult.findings.length).toBeGreaterThan(0)
      expect(analysisResult.metrics.deadCode?.unusedExports).toBeGreaterThan(0)
      
      // Should detect unused exports from index.ts
      const unusedExports = analysisResult.findings.filter(f => f.category === 'unused_export')
      expect(unusedExports.length).toBeGreaterThan(0)
      
      // Should detect exports like Button, ButtonProps, buttonVariants
      const indexExports = unusedExports.filter(f => f.location.includes('index.ts'))
      expect(indexExports.length).toBeGreaterThan(0)
    })

    it('should detect orphaned component files that are never imported', async () => {
      // Create components that exist but are never imported
      await writeFile(join(testDir, 'UnusedModal.tsx'), `
import React from 'react'

export const UnusedModal = () => {
  return <div>This modal is never imported</div>
}

export interface ModalProps {
  isOpen: boolean
}
`)

      await writeFile(join(testDir, 'UnusedCard.tsx'), `
import React from 'react'

export const UnusedCard = () => {
  return <div>This card is never used</div>
}
`)

      await writeFile(join(testDir, 'main.tsx'), `
import React from 'react'

// Main app that doesn't import any of the components above
export const App = () => {
  return <div>App without unused components</div>
}
`)

      // Create and analyze
      await treeManager.createProject('orphaned-test', testConfig)
      await treeManager.initializeProject('orphaned-test')

      const fileNodes = getFileNodes('orphaned-test')

      const analysisResult: AnalysisResult = {
        projectId: 'test-project',
        analysisTypes: ['deadcode'],
        scope: 'project',
        findings: [],
        metrics: { deadCode: { orphanedFiles: 0, unusedExports: 0, unusedDependencies: 0 } },
        summary: {
          totalIssues: 0,
          severityBreakdown: { info: 0, warning: 0, critical: 0 }
        }
      }

      const coordinator = new DeadCodeCoordinator()
      await coordinator.analyze(fileNodes, analysisResult)

      // Verify orphaned files are detected
      expect(analysisResult.findings.length).toBeGreaterThan(0)
      expect(analysisResult.metrics.deadCode?.orphanedFiles).toBeGreaterThan(0)
      
      const orphanedFiles = analysisResult.findings.filter(f => f.category === 'orphaned_file')
      expect(orphanedFiles.length).toBeGreaterThanOrEqual(2) // UnusedModal.tsx and UnusedCard.tsx
      
      const modalOrphaned = orphanedFiles.some(f => f.location.includes('UnusedModal.tsx'))
      const cardOrphaned = orphanedFiles.some(f => f.location.includes('UnusedCard.tsx'))
      expect(modalOrphaned).toBe(true)
      expect(cardOrphaned).toBe(true)
    })
  })

  describe('API Client Dead Code Detection', () => {
    it('should detect unused API modules and exports', async () => {
      // Create API client structure with unused modules
      await writeFile(join(testDir, 'api-client.ts'), `
export class ApiClient {
  async get(url: string) { return fetch(url) }
  async post(url: string, data: any) { return fetch(url, { method: 'POST', body: JSON.stringify(data) }) }
}

export const apiClient = new ApiClient()
`)

      await writeFile(join(testDir, 'users-api.ts'), `
import { apiClient } from './api-client'

export const getUser = (id: string) => apiClient.get(\`/users/\${id}\`)
export const createUser = (data: any) => apiClient.post('/users', data)
export const deleteUser = (id: string) => apiClient.get(\`/users/\${id}\`) // Never used
export const updateUserProfile = (id: string, data: any) => apiClient.post(\`/users/\${id}\`, data) // Never used
`)

      await writeFile(join(testDir, 'games-api.ts'), `
import { apiClient } from './api-client'

// Entire module never imported
export const getGames = () => apiClient.get('/games')
export const createGame = (data: any) => apiClient.post('/games', data)
`)

      await writeFile(join(testDir, 'main.ts'), `
import { getUser, createUser } from './users-api'
// Note: games-api is never imported, deleteUser and updateUserProfile are never imported

export const app = {
  loadUser: getUser,
  saveUser: createUser
}
`)

      // Create and analyze
      await treeManager.createProject('api-test', testConfig)
      await treeManager.initializeProject('api-test')

      const fileNodes = getFileNodes('api-test')

      const analysisResult: AnalysisResult = {
        projectId: 'test-project',
        analysisTypes: ['deadcode'],
        scope: 'project',
        findings: [],
        metrics: { deadCode: { orphanedFiles: 0, unusedExports: 0, unusedDependencies: 0 } },
        summary: {
          totalIssues: 0,
          severityBreakdown: { info: 0, warning: 0, critical: 0 }
        }
      }

      const coordinator = new DeadCodeCoordinator()
      await coordinator.analyze(fileNodes, analysisResult)

      // Verify API dead code detection
      expect(analysisResult.findings.length).toBeGreaterThan(0)
      
      // Should detect games-api.ts as orphaned
      const orphanedFiles = analysisResult.findings.filter(f => f.category === 'orphaned_file')
      const gamesApiOrphaned = orphanedFiles.some(f => f.location.includes('games-api.ts'))
      expect(gamesApiOrphaned).toBe(true)
      
      // Should detect unused exports from users-api.ts
      const unusedExports = analysisResult.findings.filter(f => f.category === 'unused_export')
      const unusedUserExports = unusedExports.filter(f => f.location.includes('users-api.ts'))
      expect(unusedUserExports.length).toBeGreaterThanOrEqual(2) // deleteUser and updateUserProfile
    })
  })

  describe('Complex Component Hierarchies', () => {
    it('should handle deeply nested component structures with mixed usage', async () => {
      // Create nested component structure
      await ensureDir(join(testDir, 'components', 'layout'))
      await ensureDir(join(testDir, 'components', 'ui'))
      await ensureDir(join(testDir, 'pages'))
      
      await writeFile(join(testDir, 'components', 'layout', 'Header.tsx'), `
import React from 'react'

export const Header = () => <header>Header</header>
export const HeaderTitle = () => <h1>Title</h1>  // Used
export const HeaderSubtitle = () => <h2>Subtitle</h2>  // Not used
`)

      await writeFile(join(testDir, 'components', 'layout', 'index.ts'), `
export { Header, HeaderTitle, HeaderSubtitle } from './Header'
export { Footer } from './Footer'  // Footer doesn't exist
`)

      await writeFile(join(testDir, 'components', 'ui', 'Button.tsx'), `
import React from 'react'

export const Button = () => <button>Click me</button>
export const IconButton = () => <button>🔘</button>  // Not used
`)

      await writeFile(join(testDir, 'pages', 'Home.tsx'), `
import React from 'react'
import { Header, HeaderTitle } from '../components/layout'
import { Button } from '../components/ui/Button'

export const HomePage = () => (
  <div>
    <Header />
    <HeaderTitle />
    <Button />
  </div>
)
`)

      // Create and analyze
      await treeManager.createProject('nested-test', testConfig)
      await treeManager.initializeProject('nested-test')

      const fileNodes = getFileNodes('nested-test')

      const analysisResult: AnalysisResult = {
        projectId: 'test-project',
        analysisTypes: ['deadcode'],
        scope: 'project',
        findings: [],
        metrics: { deadCode: { orphanedFiles: 0, unusedExports: 0, unusedDependencies: 0 } },
        summary: {
          totalIssues: 0,
          severityBreakdown: { info: 0, warning: 0, critical: 0 }
        }
      }

      const coordinator = new DeadCodeCoordinator()
      await coordinator.analyze(fileNodes, analysisResult)

      // Verify mixed usage detection
      expect(analysisResult.findings.length).toBeGreaterThan(0)
      
      const unusedExports = analysisResult.findings.filter(f => f.category === 'unused_export')
      
      // Should detect HeaderSubtitle and IconButton as unused
      const headerSubtitleUnused = unusedExports.some(f => 
        f.location.includes('Header.tsx') && f.description.includes('HeaderSubtitle')
      )
      const iconButtonUnused = unusedExports.some(f => 
        f.location.includes('Button.tsx') && f.description.includes('IconButton')
      )
      
      expect(headerSubtitleUnused).toBe(true)
      expect(iconButtonUnused).toBe(true)
    })
  })

  describe('Framework Entry Point Detection', () => {
    it('should correctly identify Next.js pages and API routes as entry points', async () => {
      // Create Next.js-style structure
      await ensureDir(join(testDir, 'pages', 'api'))
      await ensureDir(join(testDir, 'components'))
      
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'test-app',
        dependencies: {
          next: '^13.0.0',
          react: '^18.0.0'
        }
      }))

      await writeFile(join(testDir, 'next.config.js'), `
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
`)

      await writeFile(join(testDir, 'pages', 'index.tsx'), `
import React from 'react'
import { UserCard } from '../components/UserCard'

export default function HomePage() {
  return <div><UserCard /></div>
}
`)

      await writeFile(join(testDir, 'pages', 'api', 'users.ts'), `
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ users: [] })
}
`)

      await writeFile(join(testDir, 'components', 'UserCard.tsx'), `
import React from 'react'

export const UserCard = () => <div>User Card</div>
`)

      await writeFile(join(testDir, 'components', 'AdminCard.tsx'), `
import React from 'react'

// This component exists but is never imported - should be detected as dead code
export const AdminCard = () => <div>Admin Card</div>
`)

      // Create and analyze
      await treeManager.createProject('nextjs-test', testConfig)
      await treeManager.initializeProject('nextjs-test')

      const fileNodes = getFileNodes('nextjs-test')

      const analysisResult: AnalysisResult = {
        projectId: 'test-project',
        analysisTypes: ['deadcode'],
        scope: 'project',
        findings: [],
        metrics: { deadCode: { orphanedFiles: 0, unusedExports: 0, unusedDependencies: 0 } },
        summary: {
          totalIssues: 0,
          severityBreakdown: { info: 0, warning: 0, critical: 0 }
        }
      }

      const coordinator = new DeadCodeCoordinator()
      await coordinator.analyze(fileNodes, analysisResult)

      // Verify framework-aware detection
      const orphanedFiles = analysisResult.findings.filter(f => f.category === 'orphaned_file')
      
      // AdminCard should be detected as orphaned
      const adminCardOrphaned = orphanedFiles.some(f => f.location.includes('AdminCard.tsx'))
      expect(adminCardOrphaned).toBe(true)
      
      // Pages and API routes should NOT be detected as orphaned (they're entry points)
      const pageOrphaned = orphanedFiles.some(f => f.location.includes('pages/index.tsx'))
      const apiOrphaned = orphanedFiles.some(f => f.location.includes('pages/api/users.ts'))
      expect(pageOrphaned).toBe(false)
      expect(apiOrphaned).toBe(false)
      
      // UserCard should NOT be orphaned (it's imported by the page)
      const userCardOrphaned = orphanedFiles.some(f => f.location.includes('UserCard.tsx'))
      expect(userCardOrphaned).toBe(false)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of files efficiently', async () => {
      // Create many files to test performance
      const fileCount = 50
      const promises: Promise<void>[] = []

      for (let i = 0; i < fileCount; i++) {
        const isUsed = i < 10 // Only first 10 files are used
        const content = isUsed 
          ? `export const Component${i} = () => <div>Component ${i}</div>`
          : `export const UnusedComponent${i} = () => <div>Unused ${i}</div>`
        
        promises.push(writeFile(join(testDir, `component-${i}.tsx`), content))
      }

      // Create a main file that only imports first 10 components
      const imports = Array.from({ length: 10 }, (_, i) => 
        `import { Component${i} } from './component-${i}'`
      ).join('\n')
      
      const usage = Array.from({ length: 10 }, (_, i) => `<Component${i} />`).join('\n    ')
      
      promises.push(writeFile(join(testDir, 'main.tsx'), `
import React from 'react'
${imports}

export const App = () => (
  <div>
    ${usage}
  </div>
)
`))

      await Promise.all(promises)

      // Create and analyze
      const startTime = performance.now()
      
      await treeManager.createProject('performance-test', testConfig)
      await treeManager.initializeProject('performance-test')

      const fileNodes = getFileNodes('performance-test')

      const analysisResult: AnalysisResult = {
        projectId: 'test-project',
        analysisTypes: ['deadcode'],
        scope: 'project',
        findings: [],
        metrics: { deadCode: { orphanedFiles: 0, unusedExports: 0, unusedDependencies: 0 } },
        summary: {
          totalIssues: 0,
          severityBreakdown: { info: 0, warning: 0, critical: 0 }
        }
      }

      const coordinator = new DeadCodeCoordinator()
      await coordinator.analyze(fileNodes, analysisResult)
      
      const analysisTime = performance.now() - startTime

      // Verify performance and results
      expect(analysisTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(analysisResult.findings.length).toBeGreaterThan(0)
      
      // Should detect ~40 orphaned files (component-10 through component-49)
      const orphanedFiles = analysisResult.findings.filter(f => f.category === 'orphaned_file')
      expect(orphanedFiles.length).toBeGreaterThanOrEqual(30) // At least 30 unused files
      
      console.log(`Performance test: ${fileCount + 1} files analyzed in ${analysisTime.toFixed(2)}ms`)
      console.log(`Found ${orphanedFiles.length} orphaned files out of ${fileCount} total components`)
    })
  })
})