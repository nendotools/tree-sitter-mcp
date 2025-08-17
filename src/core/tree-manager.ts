/**
 * Tree Manager - Core engine for managing in-memory project trees and search indexes
 */

import { readFileSync } from 'fs'
import { MEMORY } from '../constants/service-constants.js'
import { NODE_TYPES } from '../constants/analysis-constants.js'
import { ERROR_MESSAGES as ERRORS } from '../constants/app-constants.js'
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
import { SearchEngine } from './search/search-engine.js'
import { ProjectMemoryManager } from './memory/project-memory-manager.js'
import { MonoRepoManager } from './mono-repo/mono-repo-manager.js'
import { resolve, basename } from 'path'

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
  private parserRegistry: ParserRegistry
  private searchEngine: SearchEngine = new SearchEngine()
  private memoryManager: ProjectMemoryManager
  private monoRepoManager: MonoRepoManager
  private logger = getLogger()

  /**
   * Creates a new TreeManager instance
   *
   * @param parserRegistry - Registry containing language parsers for code analysis
   */
  constructor(parserRegistry: ParserRegistry) {
    this.parserRegistry = parserRegistry
    this.memoryManager = new ProjectMemoryManager(this.logger)
    this.monoRepoManager = new MonoRepoManager(this.logger)
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
      const lruProject = this.memoryManager.findLRUProject(this.projects)
      if (lruProject) {
        this.destroyProject(lruProject.projectId)
        this.logger.info(`Evicted LRU project: ${lruProject.projectId}`)
      }
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
    const project = this.validateAndGetProject(projectId)

    if (project.initialized) {
      this.logger.debug(`Project ${projectId} already initialized`)
      return
    }

    this.logger.info(`Initializing project: ${projectId}`)

    await this.monoRepoManager.setupMonoRepoStructure(project)
    await this.buildProjectIndexes(project)
    this.finalizeProjectInitialization(project)

    this.logger.info(
      `Project ${project.projectId} initialized with ${project.fileIndex.size} files`,
    )
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
        await this.addFileToTree(project, parseResult, content)
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
    const project = this.validateAndGetProject(projectId)
    project.accessedAt = new Date()

    return this.searchEngine.search(project, query, options)
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

    this.memoryManager.trackProjectRemoved(project)
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

    for (const nodes of project.nodeIndex.values()) {
      for (const node of nodes) {
        stats.totalNodes++

        if (node.language) {
          stats.languages[node.language] = (stats.languages[node.language] || 0) + 1
        }

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
  private addFileToTree(project: ProjectTree, parseResult: ParseResult, content?: string): void {
    const filePath = parseResult.file.path

    // If content is not provided, try to read it for analysis purposes
    if (!content) {
      try {
        const fullPath = resolve(project.config.workingDir, filePath)
        content = readFileSync(fullPath, 'utf-8')
      }
      catch (error) {
        this.logger.debug(`Could not read content for ${filePath}:`, error)
      }
    }

    const fileNode: TreeNode = {
      id: generateId(),
      path: filePath,
      name: basename(filePath),
      type: NODE_TYPES.FILE,
      language: parseResult.file.language,
      children: [],
      lastModified: new Date(),
      content: content,
      imports: parseResult.imports,
      exports: parseResult.exports,
    }

    project.fileIndex.set(filePath, fileNode)

    // Add to sub-project file index if applicable
    const belongsToSubProject = this.monoRepoManager.findFileSubProject(filePath, project)
    if (belongsToSubProject) {
      this.monoRepoManager.addFileToSubProject(project, filePath, fileNode, belongsToSubProject)
    }
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

      if (!project.nodeIndex.has(element.name)) {
        project.nodeIndex.set(element.name, [])
      }
      project.nodeIndex.get(element.name)!.push(elementNode)

      // Add to sub-project node index if applicable
      if (belongsToSubProject) {
        this.monoRepoManager.addNodeToSubProject(project, element.name, elementNode, belongsToSubProject)
      }

      fileNode.children.push(elementNode)
    }

    this.logger.debug(
      `Added file to tree: ${filePath} with ${parseResult.elements.length} elements`,
    )
  }

  /**
   * Removes a node and its children from all project indexes
   *
   * @param project - Project containing the node
   * @param node - Node to remove from indexes
   */
  private removeNodeFromIndex(project: ProjectTree, node: TreeNode): void {
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

    if (node.type === NODE_TYPES.FILE) {
      project.fileIndex.delete(node.path)
    }

    for (const child of node.children) {
      this.removeNodeFromIndex(project, child)
    }
  }

  /**
   * Validates that a project exists and returns it
   */
  private validateAndGetProject(projectId: string): ProjectTree {
    const project = this.getProject(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }
    return project
  }

  /**
   * Builds the project's file and node indexes
   */
  private async buildProjectIndexes(project: ProjectTree): Promise<void> {
    this.logger.debug(`🔧 TreeManager Configuration for ${project.projectId}:`)
    this.logger.debug(`  - workingDir: ${project.config.workingDir}`)
    this.logger.debug(`  - maxDepth: ${project.config.maxDepth}`)
    this.logger.debug(`  - languages: ${JSON.stringify(project.config.languages)}`)
    this.logger.debug(`  - ignoreDirs: ${JSON.stringify(Array.from(project.config.ignoreDirs || []))}`)

    const walker = new FileWalker(this.parserRegistry, project.config)
    const files = await walker.walk()

    this.logger.info(`FileWalker returned ${files.length} files for project ${project.projectId}`)

    const fileTypes: Record<string, number> = {}
    let processedCount = 0
    for (const file of files) {
      const extension = file.file.path.split('.').pop() || 'no-ext'
      fileTypes[extension] = (fileTypes[extension] || 0) + 1
    }
    this.logger.debug(`📁 File type breakdown: ${JSON.stringify(fileTypes, null, 2)}`)

    for (const file of files) {
      this.logger.debug(`📝 Processing file ${processedCount + 1}/${files.length}: ${file.file.path}`)
      await this.addFileToTree(project, file)
      processedCount++
    }

    this.logger.info(`✅ TreeManager processed ${processedCount} files, indexed ${project.fileIndex.size} files`)
  }

  /**
   * Finalizes project initialization
   */
  private finalizeProjectInitialization(project: ProjectTree): void {
    project.initialized = true
    project.lastUpdate = new Date()

    this.memoryManager.trackProjectAdded(project)
    this.memoryManager.enforceMemoryLimits(this.projects, projectId => this.destroyProject(projectId))

    this.logger.info(`Project ${project.projectId} initialized with ${project.fileIndex.size} files`)
  }
}
