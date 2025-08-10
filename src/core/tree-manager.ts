/**
 * Tree Manager - Manages in-memory project trees
 */

import { readFileSync } from 'fs'
import { basename } from 'path'
import { MEMORY, NODE_TYPES, ERRORS } from '../constants/index.js'
import type {
  Config,
  ProjectTree,
  TreeNode,
  ProjectStats,
  ProjectInfo,
  SearchOptions,
  SearchResult,
  NodeType,
  ParseResult,
} from '../types/index.js'
import { TreeSitterMCPError } from '../types/index.js'
import { getLogger } from '../utils/logger.js'
import { FileWalker } from './file-walker.js'
import { ParserRegistry } from '../parsers/registry.js'
import { generateId } from '../utils/helpers.js'

export class TreeManager {
  private projects: Map<string, ProjectTree> = new Map()
  private maxProjects: number = MEMORY.MAX_PROJECTS
  private maxMemoryMB: number = MEMORY.MAX_MEMORY_MB
  private currentMemoryMB: number = 0
  private parserRegistry: ParserRegistry
  private logger = getLogger()

  constructor(parserRegistry: ParserRegistry) {
    this.parserRegistry = parserRegistry
  }

  createProject(projectId: string, config: Config): ProjectTree {
    // Check if project already exists
    if (this.projects.has(projectId)) {
      const project = this.projects.get(projectId)
      if (!project) {
        throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
      }
      return project
    }

    // Check memory limits and evict if necessary
    if (this.projects.size >= this.maxProjects) {
      this.evictLRUProject()
    }

    // Create new project tree
    const project: ProjectTree = {
      projectId,
      root: this.createRootNode(config.workingDir),
      fileIndex: new Map(),
      nodeIndex: new Map(),
      config,
      initialized: false,
      lastUpdate: new Date(),
      createdAt: new Date(),
      accessedAt: new Date(),
      memoryUsage: 0,
    }

    this.projects.set(projectId, project)
    this.logger.info(`Created project: ${projectId}`)

    return project
  }

  async initializeProject(projectId: string): Promise<void> {
    const project = this.getProject(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }

    if (project.initialized) {
      this.logger.debug(`Project ${projectId} already initialized`)
      return
    }

    this.logger.info(`Initializing project: ${projectId}`)

    // Walk directory and parse files
    const walker = new FileWalker(this.parserRegistry, project.config)
    const files = await walker.walk()

    this.logger.info(`FileWalker returned ${files.length} files for project ${projectId}`)

    // Build tree from parsed files
    for (const file of files) {
      await this.addFileToTree(project, file)
    }

    project.initialized = true
    project.lastUpdate = new Date()
    project.memoryUsage = this.estimateProjectMemory(project)

    this.currentMemoryMB += project.memoryUsage / (1024 * 1024)
    this.checkMemoryLimits()

    this.logger.info(`Project ${projectId} initialized with ${project.fileIndex.size} files`)
  }

  async updateFile(projectId: string, filePath: string): Promise<void> {
    const project = this.getProject(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }

    this.logger.debug(`Updating file: ${filePath} in project ${projectId}`)

    // Remove old file node if exists
    const oldNode = project.fileIndex.get(filePath)
    if (oldNode) {
      this.removeNodeFromIndex(project, oldNode)
    }

    // Re-parse and add file
    try {
      const content = readFileSync(filePath, 'utf-8')
      const parseResult = await this.parserRegistry.parseFile(filePath, content)

      if (parseResult) {
        await this.addFileToTree(project, parseResult)
      }
    }
    catch (error) {
      this.logger.error(`Failed to update file ${filePath}:`, error)
    }

    project.lastUpdate = new Date()
  }

  async search(projectId: string, query: string, options: SearchOptions): Promise<SearchResult[]> {
    const project = this.getProject(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }

    project.accessedAt = new Date()

    // Placeholder for search implementation
    // This would search through project.nodeIndex
    const results: SearchResult[] = []

    // Simple name-based search
    const lowerQuery = query.toLowerCase()

    for (const [name, nodes] of project.nodeIndex) {
      if (this.matchesQuery(name, lowerQuery, options)) {
        for (const node of nodes) {
          if (this.matchesFilters(node, options)) {
            results.push(this.createSearchResult(node))
          }
        }
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.score - a.score)

    // Apply limit
    const maxResults = options.maxResults || 20
    return results.slice(0, maxResults)
  }

  destroyProject(projectId: string): void {
    const project = this.projects.get(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }

    this.currentMemoryMB -= project.memoryUsage / (1024 * 1024)
    this.projects.delete(projectId)
    this.logger.info(`Destroyed project: ${projectId}`)
  }

  getProject(projectId: string): ProjectTree | undefined {
    const project = this.projects.get(projectId)
    if (project) {
      project.accessedAt = new Date()
    }
    return project
  }

  getProjectStats(projectId: string): ProjectStats {
    const project = this.getProject(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }

    const stats: ProjectStats = {
      totalFiles: project.fileIndex.size,
      totalNodes: 0,
      languages: {},
      nodeTypes: {} as Record<NodeType, number>,
      lastUpdate: project.lastUpdate,
      initialized: project.initialized,
      memoryUsage: project.memoryUsage,
    }

    // Count nodes and languages
    for (const nodes of project.nodeIndex.values()) {
      stats.totalNodes += nodes.length
    }

    return stats
  }

  getProjectTree(projectId: string): TreeNode | null {
    const project = this.getProject(projectId)
    return project ? project.root : null
  }

  getAllProjects(): ProjectInfo[] {
    const projects: ProjectInfo[] = []

    for (const [id, project] of this.projects) {
      projects.push({
        projectId: id,
        workingDir: project.config.workingDir,
        initialized: project.initialized,
        createdAt: project.createdAt,
        accessedAt: project.accessedAt,
        memoryUsage: project.memoryUsage,
        watcherActive: false, // Will be set by file watcher
      })
    }

    return projects
  }

  serializeTree(node: TreeNode): Record<string, unknown> {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      path: node.path,
      children: node.children.map(child => this.serializeTree(child)),
    }
  }

  private createRootNode(workingDir: string): TreeNode {
    return {
      id: generateId(),
      path: workingDir,
      name: basename(workingDir) || 'root',
      type: NODE_TYPES.DIRECTORY,
      children: [],
      lastModified: new Date(),
    }
  }

  private addFileToTree(project: ProjectTree, parseResult: ParseResult): void {
    const filePath = parseResult.file.path
    
    // Create file node
    const fileNode: TreeNode = {
      id: generateId(),
      path: filePath,
      name: basename(filePath),
      type: NODE_TYPES.FILE,
      language: parseResult.file.language,
      children: [],
      lastModified: new Date(),
    }

    // Add file to file index
    project.fileIndex.set(filePath, fileNode)

    // Process parsed elements and add to node index
    for (const element of parseResult.elements) {
      const elementNode: TreeNode = {
        id: generateId(),
        path: filePath,
        name: element.name,
        type: element.type,
        language: parseResult.file.language,
        startLine: element.startLine,
        endLine: element.endLine,
        startColumn: element.startColumn,
        endColumn: element.endColumn,
        parameters: element.parameters,
        returnType: element.returnType,
        children: [],
        parent: fileNode,
        lastModified: new Date(),
      }

      // Add to node index by name
      if (!project.nodeIndex.has(element.name)) {
        project.nodeIndex.set(element.name, [])
      }
      project.nodeIndex.get(element.name)!.push(elementNode)

      // Add as child to file node
      fileNode.children.push(elementNode)
    }

    this.logger.debug(`Added file to tree: ${filePath} with ${parseResult.elements.length} elements`)
  }

  private removeNodeFromIndex(project: ProjectTree, node: TreeNode): void {
    // Remove from node index
    const nodes = project.nodeIndex.get(node.name)
    if (nodes) {
      const filtered = nodes.filter(n => n.id !== node.id)
      if (filtered.length > 0) {
        project.nodeIndex.set(node.name, filtered)
      }
      else {
        project.nodeIndex.delete(node.name)
      }
    }

    // Remove from file index if it's a file
    if (node.type === NODE_TYPES.FILE) {
      project.fileIndex.delete(node.path)
    }

    // Recursively remove children
    for (const child of node.children) {
      this.removeNodeFromIndex(project, child)
    }
  }

  private matchesQuery(name: string, query: string, options: SearchOptions): boolean {
    const nameLower = name.toLowerCase()

    if (options.exactMatch) {
      return nameLower === query
    }

    return nameLower.includes(query)
  }

  private matchesFilters(node: TreeNode, options: SearchOptions): boolean {
    // Type filter
    if (options.types && options.types.length > 0) {
      if (!options.types.includes(node.type)) {
        return false
      }
    }

    // Language filter
    if (options.languages && options.languages.length > 0) {
      if (!node.language || !options.languages.includes(node.language)) {
        return false
      }
    }

    // Path pattern filter
    if (options.pathPattern) {
      // Simple pattern matching
      if (!node.path.includes(options.pathPattern)) {
        return false
      }
    }

    return true
  }

  private createSearchResult(node: TreeNode): SearchResult {
    return {
      node,
      filePath: node.path,
      score: this.calculateScore(node),
      context: {
        parentName: node.parent?.name,
        parentType: node.parent?.type,
      },
    }
  }

  private calculateScore(node: TreeNode): number {
    let score = 50 // Base score

    // Boost for certain types
    if (node.type === NODE_TYPES.CLASS || node.type === NODE_TYPES.INTERFACE) {
      score += 10
    }
    else if (node.type === NODE_TYPES.FUNCTION || node.type === NODE_TYPES.METHOD) {
      score += 5
    }

    return score
  }

  private estimateProjectMemory(project: ProjectTree): number {
    // Rough estimation
    const nodeCount = project.nodeIndex.size
    const fileCount = project.fileIndex.size

    return (
      nodeCount * MEMORY.DEFAULT_NODE_SIZE_BYTES
      + fileCount * 1024
      + project.nodeIndex.size * MEMORY.DEFAULT_INDEX_ENTRY_BYTES
    )
  }

  private evictLRUProject(): void {
    let oldestProject: ProjectTree | null = null
    let oldestTime = new Date()

    for (const project of this.projects.values()) {
      if (project.accessedAt < oldestTime) {
        oldestTime = project.accessedAt
        oldestProject = project
      }
    }

    if (oldestProject) {
      this.destroyProject(oldestProject.projectId)
      this.logger.info(`Evicted LRU project: ${oldestProject.projectId}`)
    }
  }

  private checkMemoryLimits(): void {
    if (this.currentMemoryMB > this.maxMemoryMB) {
      this.logger.warn('Memory limit exceeded, evicting projects...')
      while (this.currentMemoryMB > this.maxMemoryMB && this.projects.size > 1) {
        this.evictLRUProject()
      }
    }
  }
}
