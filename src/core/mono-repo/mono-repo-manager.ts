/**
 * Mono-Repo Manager - Handles mono-repository detection, sub-project management, and indexing
 *
 * Extracted from TreeManager to provide focused mono-repo functionality.
 * Manages sub-project detection, registration, file routing, and dual indexing.
 */

import { resolve, relative, basename } from 'path'
import { findProjectRootWithMonoRepo } from '../../utils/project-detection.js'
import type { ProjectTree, TreeNode, SubProject } from '../../types/index.js'
import type { Logger } from '../../types/cli-types.js'

export interface MonoRepoStats {
  isMonoRepo: boolean
  subProjectCount: number
  subProjects: string[]
  totalSubProjectFiles: number
  totalSubProjectNodes: number
}

export interface SubProjectRegistration {
  name: string
  path: string
  languages: string[]
  indicators: string[]
}

/**
 * Manages mono-repository structure, sub-project detection, and indexing
 */
export class MonoRepoManager {
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  /**
   * Sets up mono-repo structure for a project if applicable
   */
  async setupMonoRepoStructure(project: ProjectTree): Promise<void> {
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
   * Registers a sub-project within a mono-repo
   */
  registerSubProject(project: ProjectTree, subProject: SubProject): void {
    const subProjectName = this.getSubProjectName(subProject.path, project.config.workingDir)

    project.subProjects!.set(subProjectName, {
      name: subProjectName,
      path: subProject.path,
      languages: subProject.languages,
      indicators: subProject.indicators,
    })

    project.subProjectFileIndex!.set(subProjectName, new Map())
    project.subProjectNodeIndex!.set(subProjectName, new Map())

    this.logger.debug(
      `  • Registered sub-project: ${subProjectName} (${subProject.languages.join(', ')})`,
    )
  }

  /**
   * Gets a sub-project name from its path
   */
  getSubProjectName(subProjectPath: string, projectRoot: string): string {
    const relativePath = relative(projectRoot, subProjectPath)
    return relativePath.split('/')[0] || basename(subProjectPath)
  }

  /**
   * Finds which sub-project a file belongs to
   */
  findFileSubProject(filePath: string, project: ProjectTree): string | undefined {
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
   * Adds a file to the appropriate sub-project file index
   */
  addFileToSubProject(
    project: ProjectTree,
    filePath: string,
    fileNode: TreeNode,
    subProjectName: string,
  ): void {
    if (!project.subProjectFileIndex) {
      return
    }

    const subProjectFileIndex = project.subProjectFileIndex.get(subProjectName)
    if (subProjectFileIndex) {
      subProjectFileIndex.set(filePath, fileNode)
    }
  }

  /**
   * Adds a node to the appropriate sub-project node index
   */
  addNodeToSubProject(
    project: ProjectTree,
    elementName: string,
    elementNode: TreeNode,
    subProjectName: string,
  ): void {
    if (!project.subProjectNodeIndex) {
      return
    }

    const subProjectNodeIndex = project.subProjectNodeIndex.get(subProjectName)
    if (subProjectNodeIndex) {
      if (!subProjectNodeIndex.has(elementName)) {
        subProjectNodeIndex.set(elementName, [])
      }
      subProjectNodeIndex.get(elementName)!.push(elementNode)
    }
  }

  /**
   * Removes a node from all sub-project indexes where it exists
   */
  removeNodeFromSubProjects(project: ProjectTree, node: TreeNode): void {
    if (!project.isMonoRepo || !project.subProjectNodeIndex) {
      return
    }

    // Find which sub-project this node belongs to
    const subProjectName = this.findFileSubProject(node.path, project)
    if (!subProjectName) {
      return
    }

    const subProjectNodeIndex = project.subProjectNodeIndex.get(subProjectName)
    if (!subProjectNodeIndex) {
      return
    }

    // Remove from sub-project index
    const nodes = subProjectNodeIndex.get(node.name)
    if (nodes) {
      const index = nodes.findIndex(n => n.id === node.id)
      if (index !== -1) {
        nodes.splice(index, 1)
        if (nodes.length === 0) {
          subProjectNodeIndex.delete(node.name)
        }
      }
    }

    // Recursively remove children
    for (const child of node.children) {
      this.removeNodeFromSubProjects(project, child)
    }
  }

  /**
   * Gets statistics about mono-repo structure
   */
  getMonoRepoStats(project: ProjectTree): MonoRepoStats {
    const stats: MonoRepoStats = {
      isMonoRepo: project.isMonoRepo || false,
      subProjectCount: project.subProjects?.size || 0,
      subProjects: Array.from(project.subProjects?.keys() || []),
      totalSubProjectFiles: 0,
      totalSubProjectNodes: 0,
    }

    if (project.subProjectFileIndex) {
      for (const fileIndex of project.subProjectFileIndex.values()) {
        stats.totalSubProjectFiles += fileIndex.size
      }
    }

    if (project.subProjectNodeIndex) {
      for (const nodeIndex of project.subProjectNodeIndex.values()) {
        for (const nodes of nodeIndex.values()) {
          stats.totalSubProjectNodes += nodes.length
        }
      }
    }

    return stats
  }

  /**
   * Gets all sub-projects for a project
   */
  getSubProjects(project: ProjectTree): Map<string, SubProjectRegistration> {
    const result = new Map<string, SubProjectRegistration>()

    if (project.subProjects) {
      for (const [name, subProject] of project.subProjects) {
        result.set(name, {
          name: subProject.name,
          path: subProject.path,
          languages: subProject.languages,
          indicators: subProject.indicators,
        })
      }
    }

    return result
  }

  /**
   * Checks if a project has mono-repo structure
   */
  isMonoRepo(project: ProjectTree): boolean {
    return (project.isMonoRepo || false) && (project.subProjects?.size || 0) > 0
  }

  /**
   * Gets sub-project by name
   */
  getSubProject(project: ProjectTree, subProjectName: string): SubProjectRegistration | undefined {
    const subProject = project.subProjects?.get(subProjectName)
    if (!subProject) {
      return undefined
    }

    return {
      name: subProject.name,
      path: subProject.path,
      languages: subProject.languages,
      indicators: subProject.indicators,
    }
  }

  /**
   * Initializes mono-repo indexes for a project
   */
  initializeMonoRepoIndexes(project: ProjectTree): void {
    project.subProjects = new Map()
    project.subProjectFileIndex = new Map()
    project.subProjectNodeIndex = new Map()
    project.isMonoRepo = false
  }

  /**
   * Validates mono-repo structure consistency
   */
  validateMonoRepoStructure(project: ProjectTree): { isValid: boolean, issues: string[] } {
    const issues: string[] = []

    if (!project.isMonoRepo) {
      return { isValid: true, issues: [] }
    }

    // Check that all required indexes exist
    if (!project.subProjects) {
      issues.push('Missing subProjects map')
    }
    if (!project.subProjectFileIndex) {
      issues.push('Missing subProjectFileIndex map')
    }
    if (!project.subProjectNodeIndex) {
      issues.push('Missing subProjectNodeIndex map')
    }

    // Check index consistency
    if (project.subProjects && project.subProjectFileIndex && project.subProjectNodeIndex) {
      for (const subProjectName of project.subProjects.keys()) {
        if (!project.subProjectFileIndex.has(subProjectName)) {
          issues.push(`Missing file index for sub-project: ${subProjectName}`)
        }
        if (!project.subProjectNodeIndex.has(subProjectName)) {
          issues.push(`Missing node index for sub-project: ${subProjectName}`)
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }
}