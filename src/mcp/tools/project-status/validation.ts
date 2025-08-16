/**
 * Project status validation utilities
 */

import type { TextContent } from '@modelcontextprotocol/sdk/types.js'
import type { ProjectStatusContext } from './types.js'

/**
 * Validate that specific project exists
 */
export function validateProjectExists(context: ProjectStatusContext): { isValid: boolean, response?: TextContent } {
  if (!context.args.projectId) {
    return { isValid: true }
  }

  const project = context.treeManager.getProject(context.args.projectId)
  if (!project) {
    return {
      isValid: false,
      response: {
        type: 'text',
        text: `Project "${context.args.projectId}" not found.`,
      },
    }
  }

  return { isValid: true }
}

/**
 * Check if any projects exist for all-projects status
 */
export function validateProjectsExist(context: ProjectStatusContext): { isValid: boolean, response?: TextContent } {
  if (context.args.projectId) {
    return { isValid: true }
  }

  const projects = context.treeManager.getAllProjects()
  if (projects.length === 0) {
    return {
      isValid: false,
      response: {
        type: 'text',
        text: 'No projects initialized.\n\nUse initialize_project or search_code to get started.',
      },
    }
  }

  return { isValid: true }
}