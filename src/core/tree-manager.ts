/**
 * Tree Manager - Core engine for managing in-memory project trees and search indexes
 */

import { readFileSync } from 'fs'
import { MEMORY, NODE_TYPES, ERRORS } from '../constants/index.js'
import type {
  Config,
  ProjectTree,
  TreeNode,
  ProjectStats,
  ProjectInfo,
  SearchOptions,
  SearchResult,
  SearchScope,
  NodeType,
  ParseResult,
} from '../types/index.js'
import { TreeSitterMCPError } from '../types/index.js'
import { getLogger } from '../utils/logger.js'
import { FileWalker } from './file-walker.js'
import { ParserRegistry } from '../parsers/registry.js'
import { generateId } from '../utils/helpers.js'
import { findProjectRootWithMonoRepo } from '../utils/project-detection.js'
import { resolve, relative, basename } from 'path'

/**
 * Tree Manager is the core engine that manages in-memory AST representations of projects
 *
 * Key responsibilities:
 * - Project lifecycle management (create, initialize, destroy)
 * - Memory management with LRU eviction
 * - Fast semantic search across indexed code elements
 * - Mono-repo support with sub-project isolation
 * - File-level and element-level indexing
 *
 * Performance characteristics:
 * - <100ms search times for indexed projects
 * - Configurable memory limits with automatic eviction
 * - Incremental updates via file watching integration
 */
export class TreeManager {
  private projects: Map<string, ProjectTree> = new Map()
  private maxProjects: number = MEMORY.MAX_PROJECTS
  private maxMemoryMB: number = MEMORY.MAX_MEMORY_MB
  private currentMemoryMB: number = 0
  private parserRegistry: ParserRegistry
  private logger = getLogger()

  /**
   * Creates a new TreeManager instance
   *
   * @param parserRegistry - Registry containing language parsers for code analysis
   */
  constructor(parserRegistry: ParserRegistry) {
    this.parserRegistry = parserRegistry
  }

  /**
   * Creates a new project tree structure
   *
   * If the project already exists, returns the existing instance.
   * Automatically handles memory limits by evicting LRU projects when necessary.
   *
   * @param projectId - Unique identifier for the project
   * @param config - Configuration object with project settings
   * @returns The created or existing project tree
   * @throws TreeSitterMCPError if project creation fails
   */
  createProject(projectId: string, config: Config): ProjectTree {
    if (this.projects.has(projectId)) {
      const project = this.projects.get(projectId)
      if (!project) {
        throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
      }
      return project
    }

    if (this.projects.size >= this.maxProjects) {
      this.evictLRUProject()
    }

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
      isMonoRepo: false,
      subProjects: new Map(),
      subProjectFileIndex: new Map(),
      subProjectNodeIndex: new Map(),
    }

    this.projects.set(projectId, project)
    this.logger.info(`Created project: ${projectId}`)

    return project
  }

  /**
   * Initializes a project by walking its directory structure and building the AST index
   *
   * This is the core indexing process that:
   * - Detects mono-repo structure and sub-projects
   * - Walks the directory tree to find parseable files
   * - Builds search indexes for fast lookups
   * - Calculates memory usage and applies limits
   *
   * @param projectId - Unique project identifier
   * @throws TreeSitterMCPError if project doesn't exist or initialization fails
   */
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

    const monoRepoInfo = await findProjectRootWithMonoRepo(project.config.workingDir)
    if (monoRepoInfo.isMonoRepo && monoRepoInfo.subProjects.length > 0) {
      project.isMonoRepo = true
      this.logger.info(`Detected mono-repo with ${monoRepoInfo.subProjects.length} sub-projects`)

      for (const subProject of monoRepoInfo.subProjects) {
        const subProjectName = this.getSubProjectName(subProject.path, project.config.workingDir)
        project.subProjects!.set(subProjectName, {
          name: subProjectName,
          path: subProject.path,
          languages: subProject.languages,
          indicators: subProject.indicators,
        })
        project.subProjectFileIndex!.set(subProjectName, new Map())
        project.subProjectNodeIndex!.set(subProjectName, new Map())
        this.logger.info(
          `  • Registered sub-project: ${subProjectName} (${subProject.languages.join(', ')})`,
        )
      }
    }

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

  /**
   * Updates a single file in the project's AST index
   *
   * Performs incremental updates by:
   * - Removing the old file's nodes from indexes
   * - Re-parsing the file with current content
   * - Adding new nodes back to indexes
   *
   * @param projectId - Project containing the file
   * @param filePath - Path to the file to update
   * @throws TreeSitterMCPError if project doesn't exist
   */
  async updateFile(projectId: string, filePath: string): Promise<void> {
    const project = this.getProject(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }

    this.logger.debug(`Updating file: ${filePath} in project ${projectId}`)

    const oldNode = project.fileIndex.get(filePath)
    if (oldNode) {
      this.removeNodeFromIndex(project, oldNode)
    }

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

  /**
   * Performs fast semantic search across the project's indexed code elements
   *
   * Search process:
   * - Updates project access time for LRU tracking
   * - Determines search scope (main project vs mono-repo sub-projects)
   * - Matches query against element names with optional exact matching
   * - Applies filters for types, languages, and path patterns
   * - Ranks results by relevance score
   * - Returns top results within the specified limit
   *
   * @param projectId - Project to search within
   * @param query - Search term to match against element names
   * @param options - Search options including filters and scope
   * @returns Array of matching search results, sorted by relevance
   * @throws TreeSitterMCPError if project doesn't exist
   */
  async search(projectId: string, query: string, options: SearchOptions): Promise<SearchResult[]> {
    const project = this.getProject(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }

    project.accessedAt = new Date()

    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()

    const nodeIndexesToSearch = this.getNodeIndexesToSearch(project, options.scope)

    for (const { nodeIndex, subProjectName } of nodeIndexesToSearch) {
      for (const [name, nodes] of nodeIndex) {
        if (this.matchesQuery(name, lowerQuery, options)) {
          for (const node of nodes) {
            if (this.matchesFilters(node, options)) {
              const result = this.createSearchResult(node)
              result.subProject = subProjectName
              results.push(result)
            }
          }
        }
      }
    }

    results.sort((a, b) => b.score - a.score)

    const maxResults = options.maxResults || 20
    return results.slice(0, maxResults)
  }

  /**
   * Removes a project from memory and cleans up its resources
   *
   * @param projectId - Project to destroy
   * @throws TreeSitterMCPError if project doesn't exist
   */
  destroyProject(projectId: string): void {
    const project = this.projects.get(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }

    this.currentMemoryMB -= project.memoryUsage / (1024 * 1024)
    this.projects.delete(projectId)
    this.logger.info(`Destroyed project: ${projectId}`)
  }

  /**
   * Retrieves a project by ID and updates its access time for LRU tracking
   *
   * @param projectId - Project identifier to retrieve
   * @returns The project tree or undefined if not found
   */
  getProject(projectId: string): ProjectTree | undefined {
    const project = this.projects.get(projectId)
    if (project) {
      project.accessedAt = new Date()
    }
    return project
  }

  /**
   * Calculates comprehensive statistics for a project
   *
   * @param projectId - Project to analyze
   * @returns Statistics including file count, node count, memory usage
   * @throws TreeSitterMCPError if project doesn't exist
   */
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

    // Count nodes by language and type
    for (const nodes of project.nodeIndex.values()) {
      for (const node of nodes) {
        stats.totalNodes++

        // Count by language
        if (node.language) {
          stats.languages[node.language] = (stats.languages[node.language] || 0) + 1
        }

        // Count by node type
        if (node.type) {
          stats.nodeTypes[node.type] = (stats.nodeTypes[node.type] || 0) + 1
        }
      }
    }

    return stats
  }

  /**
   * Gets the root tree node for a project
   *
   * @param projectId - Project identifier
   * @returns Root tree node or null if project doesn't exist
   */
  getProjectTree(projectId: string): TreeNode | null {
    const project = this.getProject(projectId)
    return project ? project.root : null
  }

  /**
   * Gets information about all managed projects
   *
   * @returns Array of project information objects
   */
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
        watcherActive: false,
      })
    }

    return projects
  }

  /**
   * Serializes a tree node and its children to a plain object
   *
   * @param node - Tree node to serialize
   * @returns Serialized representation suitable for JSON output
   */
  serializeTree(node: TreeNode): Record<string, unknown> {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      path: node.path,
      children: node.children.map(child => this.serializeTree(child)),
    }
  }

  /**
   * Creates the root directory node for a project tree
   *
   * @param workingDir - Working directory path for the project
   * @returns Root tree node representing the project directory
   */
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

  /**
   * Adds a parsed file and its code elements to the project's indexes
   *
   * Creates file and element nodes, updates both main project indexes
   * and mono-repo sub-project indexes if applicable.
   *
   * @param project - Project tree to update
   * @param parseResult - Parsed file data with code elements
   */
  private addFileToTree(project: ProjectTree, parseResult: ParseResult): void {
    const filePath = parseResult.file.path

    const fileNode: TreeNode = {
      id: generateId(),
      path: filePath,
      name: basename(filePath),
      type: NODE_TYPES.FILE,
      language: parseResult.file.language,
      children: [],
      lastModified: new Date(),
    }

    // Add file to main file index
    project.fileIndex.set(filePath, fileNode)

    // Determine which sub-project this file belongs to (if any)
    let belongsToSubProject: string | undefined
    if (project.isMonoRepo && project.subProjects) {
      belongsToSubProject = this.findFileSubProject(filePath, project)
      if (belongsToSubProject && project.subProjectFileIndex) {
        project.subProjectFileIndex.get(belongsToSubProject)!.set(filePath, fileNode)
      }
    }

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

      // Add to main node index by name
      if (!project.nodeIndex.has(element.name)) {
        project.nodeIndex.set(element.name, [])
      }
      project.nodeIndex.get(element.name)!.push(elementNode)

      // Add to sub-project node index if applicable
      if (belongsToSubProject && project.subProjectNodeIndex) {
        const subProjectNodeIndex = project.subProjectNodeIndex.get(belongsToSubProject)!
        if (!subProjectNodeIndex.has(element.name)) {
          subProjectNodeIndex.set(element.name, [])
        }
        subProjectNodeIndex.get(element.name)!.push(elementNode)
      }

      // Add as child to file node
      fileNode.children.push(elementNode)
    }

    this.logger.debug(
      `Added file to tree: ${filePath} with ${parseResult.elements.length} elements`,
    )
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

  private getSubProjectName(subProjectPath: string, projectRoot: string): string {
    const relativePath = relative(projectRoot, subProjectPath)
    return relativePath.split('/')[0] || basename(subProjectPath)
  }

  private findFileSubProject(filePath: string, project: ProjectTree): string | undefined {
    if (!project.isMonoRepo || !project.subProjects) {
      return undefined
    }

    const absoluteFilePath = resolve(project.config.workingDir, filePath)

    for (const [subProjectName, subProjectInfo] of project.subProjects) {
      if (
        absoluteFilePath.startsWith(subProjectInfo.path + '/')
        || absoluteFilePath === subProjectInfo.path
      ) {
        return subProjectName
      }
    }

    return undefined
  }

  private getNodeIndexesToSearch(
    project: ProjectTree,
    scope?: SearchScope,
  ): Array<{
    nodeIndex: Map<string, TreeNode[]>
    subProjectName?: string
  }> {
    const indexesToSearch: Array<{
      nodeIndex: Map<string, TreeNode[]>
      subProjectName?: string
    }> = []

    if (!project.isMonoRepo || !scope) {
      indexesToSearch.push({ nodeIndex: project.nodeIndex })
      return indexesToSearch
    }

    if (scope.subProjects && scope.subProjects.length > 0) {
      for (const subProjectName of scope.subProjects) {
        const subProjectNodeIndex = project.subProjectNodeIndex?.get(subProjectName)
        if (subProjectNodeIndex) {
          indexesToSearch.push({
            nodeIndex: subProjectNodeIndex,
            subProjectName,
          })
        }
      }
      return indexesToSearch
    }

    if (scope.crossProjectSearch && project.subProjectNodeIndex) {
      for (const [subProjectName, nodeIndex] of project.subProjectNodeIndex) {
        if (scope.excludeSubProjects?.includes(subProjectName)) {
          continue
        }
        indexesToSearch.push({
          nodeIndex,
          subProjectName,
        })
      }
      return indexesToSearch
    }

    indexesToSearch.push({ nodeIndex: project.nodeIndex })
    return indexesToSearch
  }
}
