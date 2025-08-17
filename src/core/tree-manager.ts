/**
 * Tree Manager - Core engine for managing in-memory project trees and search indexes
 */

import { readFileSync } from 'fs'
import { minimatch } from 'minimatch'
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
    const project = this.validateAndGetProject(projectId)

    if (project.initialized) {
      this.logger.debug(`Project ${projectId} already initialized`)
      return
    }

    this.logger.info(`Initializing project: ${projectId}`)

    await this.setupMonoRepoStructure(project)
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

    const results = this.performSearch(project, query, options)
    return this.rankAndLimitResults(results, options.maxResults || 20)
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

    let belongsToSubProject: string | undefined
    if (project.isMonoRepo && project.subProjects) {
      belongsToSubProject = this.findFileSubProject(filePath, project)
      if (belongsToSubProject && project.subProjectFileIndex) {
        project.subProjectFileIndex.get(belongsToSubProject)!.set(filePath, fileNode)
      }
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

      if (belongsToSubProject && project.subProjectNodeIndex) {
        const subProjectNodeIndex = project.subProjectNodeIndex.get(belongsToSubProject)!
        if (!subProjectNodeIndex.has(element.name)) {
          subProjectNodeIndex.set(element.name, [])
        }
        subProjectNodeIndex.get(element.name)!.push(elementNode)
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
   * Splits identifier into words for fuzzy matching
   *
   * @param name - Identifier to split
   * @returns Array of words
   */
  private splitIntoWords(name: string): string[] {
    // Handle snake_case and ALL_CAPS first
    if (name.includes('_')) {
      return name.split('_').filter(Boolean)
    }

    // Handle camelCase and mixed patterns
    // Split on transitions: lowercase->uppercase, digit->letter, letter->digit
    return name
      .replace(/([a-z])([A-Z])/g, '$1|$2') // camelCase: user|Name
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1|$2') // XMLHttp: XML|Http
      .replace(/([a-zA-Z])(\d)/g, '$1|$2') // letter->digit: user|2
      .replace(/(\d)([a-zA-Z])/g, '$1|$2') // digit->letter: 2|Name
      .split('|')
      .filter(Boolean)
  }

  /**
   * Calculates fuzzy match score between query and name
   *
   * @param name - Node name to check
   * @param query - Search query (original case)
   * @param options - Search options
   * @returns Match score (0 = no match, higher = better match)
   */
  private calculateFuzzyScore(name: string, query: string, options: SearchOptions): number {
    const nameLower = name.toLowerCase()
    const queryLower = query.toLowerCase()

    // Handle empty query
    if (query.length === 0) {
      return 0
    }

    if (options.exactMatch) {
      return nameLower === queryLower ? 100 : 0
    }

    let baseScore = 0

    // 1. Exact match (case insensitive)
    if (nameLower === queryLower) {
      baseScore = name === query ? 100 : 90 // Exact case gets higher score
    }
    // 2. Exact prefix match
    else if (nameLower.startsWith(queryLower)) {
      baseScore = name.startsWith(query) ? 85 : 75 // Exact case gets higher score
    }
    // 3. Cross-format word matching (e.g., accessToken <-> access_token)
    else {
      const nameWords = this.splitIntoWords(name)
      const queryWords = this.splitIntoWords(query)

      // Check word-level matching with similarity tolerance
      const nameWordsLower = nameWords.map(w => w.toLowerCase())
      const queryWordsLower = queryWords.map(w => w.toLowerCase())

      // Exact word matches
      const exactMatches = queryWordsLower.filter(qWord =>
        nameWordsLower.some(nWord => nWord === qWord),
      )

      // Prefix word matches (e.g., "acc" matches "account")
      const prefixMatches = queryWordsLower.filter(qWord =>
        !exactMatches.includes(qWord)
        && nameWordsLower.some(nWord => nWord.startsWith(qWord) && qWord.length >= 3),
      )

      // Suffix word matches (e.g., "count" matches "account")
      const suffixMatches = queryWordsLower.filter(qWord =>
        !exactMatches.includes(qWord) && !prefixMatches.includes(qWord)
        && nameWordsLower.some(nWord => nWord.endsWith(qWord) && qWord.length >= 3),
      )

      const totalMatches = exactMatches.length + prefixMatches.length + suffixMatches.length
      const totalQueryWords = queryWordsLower.length

      if (exactMatches.length === totalQueryWords && totalQueryWords > 0) {
        // All query words exactly match name words - highest score
        baseScore = Math.max(baseScore, 85)
      }
      else if (totalMatches === totalQueryWords && totalQueryWords > 0) {
        // All query words match (exact + prefix + suffix) - high score
        baseScore = Math.max(baseScore, 80)
      }
      else if (totalMatches > 0) {
        // Partial word matches - score based on match ratio and quality
        const exactRatio = exactMatches.length / totalQueryWords
        const totalRatio = totalMatches / totalQueryWords
        const qualityScore = (exactRatio * 0.8) + (totalRatio * 0.6)
        baseScore = Math.max(baseScore, Math.floor(75 * qualityScore))
      }

      // 4. Word boundary prefix match (existing logic)
      for (const nameWord of nameWords) {
        if (nameWord.toLowerCase().startsWith(queryLower)) {
          baseScore = Math.max(baseScore, nameWord.startsWith(query) ? 70 : 60)
        }
        // Check if query is exact match for a word
        else if (nameWord.toLowerCase() === queryLower) {
          baseScore = Math.max(baseScore, nameWord === query ? 75 : 65)
        }
      }
    }

    // 5. Substring match (current behavior)
    if (baseScore === 0 && nameLower.includes(queryLower)) {
      baseScore = name.includes(query) ? 55 : 50 // Exact case gets higher score
    }

    // 6. Character sequence match (fuzzy)
    if (baseScore === 0) {
      const sequenceScore = this.calculateSequenceMatch(nameLower, queryLower)
      if (sequenceScore > 0) {
        baseScore = Math.min(40, sequenceScore)
      }
    }

    // Apply bonuses
    if (baseScore > 0) {
      // Position bonus
      const queryPos = nameLower.indexOf(queryLower)
      if (queryPos === 0) {
        baseScore += 5 // Starts at beginning
      }
      else if (queryPos <= 2) {
        baseScore += 2 // Within first few characters
      }

      // Length ratio bonus
      const lengthRatio = query.length / name.length
      if (lengthRatio >= 0.5 && lengthRatio <= 1.0) {
        baseScore += 5
      }
    }

    return baseScore
  }

  /**
   * Calculates character sequence matching score
   *
   * @param name - Name to check (lowercase)
   * @param query - Query to match (lowercase)
   * @returns Sequence match score
   */
  private calculateSequenceMatch(name: string, query: string): number {
    if (query.length === 0) return 0
    if (query.length > name.length) return 0

    let nameIndex = 0
    let queryIndex = 0
    let matches = 0

    while (nameIndex < name.length && queryIndex < query.length) {
      if (name[nameIndex] === query[queryIndex]) {
        matches++
        queryIndex++
      }
      nameIndex++
    }

    if (queryIndex < query.length) {
      return 0 // Didn't match all query characters
    }

    // Score based on percentage of characters matched and compactness
    const matchPercentage = matches / query.length
    const compactness = query.length / (nameIndex - queryIndex + query.length)

    return Math.floor(matchPercentage * compactness * 40)
  }

  /**
   * Checks if a name matches the search query with fuzzy scoring
   *
   * @param name - Element name to check
   * @param query - Lowercase search query
   * @param options - Search options including exact match flag
   * @returns Match score (0 = no match, higher = better match)
   */
  private matchesQuery(name: string, query: string, options: SearchOptions): number {
    // If query is empty, return a default score for path-pattern-only searches
    if (!query || query.trim().length === 0) {
      return 50 // Default score for path-pattern matches
    }
    return this.calculateFuzzyScore(name, query, options)
  }

  /**
   * Applies search filters to determine if a node should be included in results
   *
   * @param node - Tree node to filter
   * @param options - Search options containing filter criteria
   * @returns True if node passes all filters
   */
  private matchesFilters(node: TreeNode, options: SearchOptions): boolean {
    if (options.types && options.types.length > 0) {
      if (!options.types.includes(node.type)) {
        return false
      }
    }

    if (options.languages && options.languages.length > 0) {
      if (!node.language || !options.languages.includes(node.language)) {
        return false
      }
    }

    if (options.pathPattern) {
      // Use glob pattern matching for path patterns
      if (!minimatch(node.path, options.pathPattern)) {
        return false
      }
    }

    return true
  }

  /**
   * Creates a search result object from a tree node
   *
   * @param node - Tree node to create result from
   * @param fuzzyScore - Fuzzy matching score for the name match
   * @param options - Search options for priority type bonus
   * @returns Search result with node, score, and context
   */
  private createSearchResult(
    node: TreeNode,
    fuzzyScore: number,
    options: SearchOptions,
  ): SearchResult {
    return {
      node,
      filePath: node.path,
      score: this.calculateScore(node, fuzzyScore, options),
      context: {
        parentName: node.parent?.name,
        parentType: node.parent?.type,
      },
    }
  }

  /**
   * Calculates relevance score for a search result
   *
   * @param node - Tree node to calculate score for
   * @param fuzzyScore - Base fuzzy matching score
   * @param options - Search options for priority type bonus
   * @returns Numeric score for result ranking
   */
  private calculateScore(node: TreeNode, fuzzyScore: number, options: SearchOptions): number {
    let score = fuzzyScore

    // Node type bonuses (as before)
    if (node.type === NODE_TYPES.CLASS || node.type === NODE_TYPES.INTERFACE) {
      score += 10
    }
    else if (node.type === NODE_TYPES.FUNCTION || node.type === NODE_TYPES.METHOD) {
      score += 5
    }

    // Priority type bonus
    if (options.priorityType && node.type === options.priorityType) {
      score += 15
    }

    return score
  }

  /**
   * Estimates memory usage for a project in bytes
   *
   * @param project - Project to estimate memory for
   * @returns Estimated memory usage in bytes
   */
  private estimateProjectMemory(project: ProjectTree): number {
    const nodeCount = project.nodeIndex.size
    const fileCount = project.fileIndex.size

    return (
      nodeCount * MEMORY.DEFAULT_NODE_SIZE_BYTES
      + fileCount * 1024
      + project.nodeIndex.size * MEMORY.DEFAULT_INDEX_ENTRY_BYTES
    )
  }

  /**
   * Evicts the least recently used project to free memory
   */
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

  /**
   * Checks memory limits and evicts projects if necessary
   */
  private checkMemoryLimits(): void {
    if (this.currentMemoryMB > this.maxMemoryMB) {
      this.logger.warn('Memory limit exceeded, evicting projects...')
      while (this.currentMemoryMB > this.maxMemoryMB && this.projects.size > 1) {
        this.evictLRUProject()
      }
    }
  }

  /**
   * Validates project exists and returns it, throwing if not found
   *
   * @param projectId - Project identifier to validate
   * @returns The project tree
   * @throws TreeSitterMCPError if project doesn't exist
   */
  private validateAndGetProject(projectId: string): ProjectTree {
    const project = this.getProject(projectId)
    if (!project) {
      throw new TreeSitterMCPError(ERRORS.PROJECT_NOT_FOUND, 'PROJECT_NOT_FOUND', { projectId })
    }
    return project
  }

  /**
   * Detects and sets up mono-repo structure for a project
   *
   * @param project - Project to setup mono-repo structure for
   */
  private async setupMonoRepoStructure(project: ProjectTree): Promise<void> {
    const monoRepoInfo = await findProjectRootWithMonoRepo(project.config.workingDir)

    if (!monoRepoInfo.isMonoRepo || monoRepoInfo.subProjects.length === 0) {
      return
    }

    project.isMonoRepo = true
    this.logger.info(`Detected mono-repo with ${monoRepoInfo.subProjects.length} sub-projects`)

    for (const subProject of monoRepoInfo.subProjects) {
      this.registerSubProject(project, subProject)
    }
  }

  /**
   * Registers a sub-project within a mono-repo structure
   *
   * @param project - Parent project tree
   * @param subProject - Sub-project information containing path, languages, and indicators
   */
  private registerSubProject(project: ProjectTree, subProject: any): void {
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

  /**
   * Walks directory structure and builds file/node indexes
   *
   * @param project - Project to build indexes for
   */
  private async buildProjectIndexes(project: ProjectTree): Promise<void> {
    // Debug TreeManager configuration
    this.logger.debug(`🔧 TreeManager Configuration for ${project.projectId}:`)
    this.logger.debug(`  - workingDir: ${project.config.workingDir}`)
    this.logger.debug(`  - maxDepth: ${project.config.maxDepth}`)
    this.logger.debug(`  - languages: ${JSON.stringify(project.config.languages)}`)
    this.logger.debug(`  - ignoreDirs: ${JSON.stringify(Array.from(project.config.ignoreDirs || []))}`)

    const walker = new FileWalker(this.parserRegistry, project.config)
    const files = await walker.walk()

    this.logger.info(`FileWalker returned ${files.length} files for project ${project.projectId}`)

    // Debug file type breakdown
    const fileTypes: Record<string, number> = {}
    for (const file of files) {
      const extension = file.file.path.split('.').pop() || 'no-ext'
      fileTypes[extension] = (fileTypes[extension] || 0) + 1
    }
    this.logger.debug(`📁 File type breakdown: ${JSON.stringify(fileTypes, null, 2)}`)

    let processedCount = 0
    for (const file of files) {
      this.logger.debug(`📝 Processing file ${processedCount + 1}/${files.length}: ${file.file.path}`)
      await this.addFileToTree(project, file)
      processedCount++
    }

    this.logger.info(`✅ TreeManager processed ${processedCount} files, indexed ${project.fileIndex.size} files`)
  }

  /**
   * Finalizes project initialization with memory management
   *
   * @param project - Project to finalize
   */
  private finalizeProjectInitialization(project: ProjectTree): void {
    project.initialized = true
    project.lastUpdate = new Date()
    project.memoryUsage = this.estimateProjectMemory(project)

    this.currentMemoryMB += project.memoryUsage / (1024 * 1024)
    this.checkMemoryLimits()
  }

  /**
   * Derives a sub-project name from its path relative to project root
   *
   * @param subProjectPath - Absolute path to sub-project
   * @param projectRoot - Project root directory path
   * @returns Sub-project name for indexing
   */
  private getSubProjectName(subProjectPath: string, projectRoot: string): string {
    const relativePath = relative(projectRoot, subProjectPath)
    return relativePath.split('/')[0] || basename(subProjectPath)
  }

  /**
   * Determines which sub-project a file belongs to in a mono-repo
   *
   * @param filePath - File path to classify
   * @param project - Project containing sub-projects
   * @returns Sub-project name or undefined if not in any sub-project
   */
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

  /**
   * Performs the actual search across node indexes
   *
   * @param project - Project to search in
   * @param query - Search query
   * @param options - Search options
   * @returns Array of matching search results
   */
  private performSearch(
    project: ProjectTree,
    query: string,
    options: SearchOptions,
  ): SearchResult[] {
    const results: SearchResult[] = []
    const nodeIndexesToSearch = this.getNodeIndexesToSearch(project, options.scope)

    // Search in node indexes (code elements)
    for (const { nodeIndex, subProjectName } of nodeIndexesToSearch) {
      this.searchInNodeIndex(nodeIndex, query, options, results, subProjectName)
    }

    // Search in file indexes if 'file' type is requested
    if (!options.types || options.types.includes('file')) {
      this.searchInFileIndex(project, query, options, results)
    }

    return results
  }

  /**
   * Searches within a specific node index
   *
   * @param nodeIndex - Node index to search in
   * @param lowerQuery - Lowercase query string
   * @param options - Search options
   * @param results - Results array to populate
   * @param subProjectName - Sub-project name if applicable
   */
  private searchInNodeIndex(
    nodeIndex: Map<string, TreeNode[]>,
    query: string,
    options: SearchOptions,
    results: SearchResult[],
    subProjectName?: string,
  ): void {
    const threshold = options.fuzzyThreshold || 30

    for (const [name, nodes] of nodeIndex) {
      const fuzzyScore = this.matchesQuery(name, query, options)

      if (fuzzyScore >= threshold) {
        for (const node of nodes) {
          if (this.matchesFilters(node, options)) {
            const result = this.createSearchResult(node, fuzzyScore, options)
            result.subProject = subProjectName
            results.push(result)
          }
        }
      }
    }
  }

  /**
   * Searches within file indexes for file-type results
   *
   * @param project - Project to search in
   * @param query - Search query
   * @param options - Search options
   * @param results - Results array to populate
   */
  private searchInFileIndex(
    project: ProjectTree,
    query: string,
    options: SearchOptions,
    results: SearchResult[],
  ): void {
    const threshold = options.fuzzyThreshold || 30

    // Search main project file index
    this.searchFileIndexMap(project.fileIndex, query, options, results, threshold)

    // Search sub-project file indexes if mono-repo
    if (project.isMonoRepo && project.subProjectFileIndex) {
      for (const [subProjectName, fileIndex] of project.subProjectFileIndex) {
        // Check if this sub-project should be included based on scope options
        if (this.shouldIncludeSubProject(subProjectName, options.scope)) {
          this.searchFileIndexMap(fileIndex, query, options, results, threshold, subProjectName)
        }
      }
    }
  }

  /**
   * Searches within a specific file index map
   *
   * @param fileIndex - File index to search in
   * @param query - Search query
   * @param options - Search options
   * @param results - Results array to populate
   * @param threshold - Fuzzy matching threshold
   * @param subProjectName - Sub-project name if applicable
   */
  private searchFileIndexMap(
    fileIndex: Map<string, TreeNode>,
    query: string,
    options: SearchOptions,
    results: SearchResult[],
    threshold: number,
    subProjectName?: string,
  ): void {
    for (const [, fileNode] of fileIndex) {
      // Fast path: check filters first (especially path pattern) before expensive fuzzy matching
      if (!this.matchesFilters(fileNode, options)) {
        continue
      }

      // Match against filename (basename) and full path
      const filename = fileNode.name
      const fullPath = fileNode.path

      const filenameScore = this.matchesQuery(filename, query, options)
      const pathScore = this.matchesQuery(fullPath, query, options)
      const bestScore = Math.max(filenameScore, pathScore)

      if (bestScore >= threshold) {
        const result = this.createSearchResult(fileNode, bestScore, options)
        result.subProject = subProjectName
        results.push(result)
      }
    }
  }

  /**
   * Checks if a sub-project should be included based on scope options
   *
   * @param subProjectName - Name of the sub-project
   * @param scope - Search scope options
   * @returns True if sub-project should be included
   */
  private shouldIncludeSubProject(
    subProjectName: string,
    scope?: { subProjects?: string[], excludeSubProjects?: string[] },
  ): boolean {
    if (!scope) return true

    if (scope.subProjects && scope.subProjects.length > 0) {
      return scope.subProjects.includes(subProjectName)
    }

    if (scope.excludeSubProjects && scope.excludeSubProjects.length > 0) {
      return !scope.excludeSubProjects.includes(subProjectName)
    }

    return true
  }

  /**
   * Ranks results by score and limits to specified maximum
   *
   * @param results - Search results to rank
   * @param maxResults - Maximum number of results to return
   * @returns Ranked and limited results
   */
  private rankAndLimitResults(results: SearchResult[], maxResults: number): SearchResult[] {
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, maxResults)
  }

  /**
   * Determines which node indexes to search based on scope options
   *
   * @param project - Project containing node indexes
   * @param scope - Search scope configuration
   * @returns Array of node indexes to search with optional sub-project names
   */
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
