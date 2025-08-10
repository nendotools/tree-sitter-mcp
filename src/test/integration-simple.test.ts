/**
 * Simple integration test to verify TreeManager basic functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { TreeManager } from '../core/tree-manager.js';
import { getParserRegistry } from '../parsers/registry.js';
import type { Config } from '../types/index.js';
import { DEFAULT_IGNORE_DIRS } from '../constants/service-constants.js';
import { DIRECTORIES } from '../constants/service-constants.js';

describe('Simple Integration Test', () => {
  let treeManager: TreeManager;
  
  const fixturesDir = resolve(import.meta.dirname, 'fixtures');
  const simpleProjectDir = resolve(fixturesDir, 'simple-ts');

  beforeEach(() => {
    const parserRegistry = getParserRegistry();
    treeManager = new TreeManager(parserRegistry);
  });

  afterEach(async () => {
    const projects = treeManager.getAllProjects();
    for (const project of projects) {
      try {
        treeManager.destroyProject(project.projectId);
      } catch (error) {
        // Project may already be destroyed in some tests
      }
    }
  });

  it('should create a project successfully', () => {
    const projectId = 'test-create';
    const config: Config = {
      workingDir: simpleProjectDir,
      languages: ['typescript'],
      maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
      ignoreDirs: DEFAULT_IGNORE_DIRS,
    };

    const project = treeManager.createProject(projectId, config);
    expect(project).toBeDefined();
    expect(project.projectId).toBe(projectId);
    expect(project.config.workingDir).toBe(simpleProjectDir);
    expect(project.initialized).toBe(false);

    // Verify project is accessible
    const retrievedProject = treeManager.getProject(projectId);
    expect(retrievedProject).toBe(project);
  });

  it('should initialize project and find files', async () => {
    const projectId = 'test-initialize';
    const config: Config = {
      workingDir: simpleProjectDir,
      languages: ['typescript'],
      maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
      ignoreDirs: DEFAULT_IGNORE_DIRS,
    };

    const project = treeManager.createProject(projectId, config);
    await treeManager.initializeProject(projectId);
    
    expect(project.initialized).toBe(true);

    const stats = treeManager.getProjectStats(projectId);
    expect(stats.totalFiles).toBeGreaterThan(0);
    console.log('Project stats:', stats);
    
    // Check that files were found
    expect(stats.totalFiles).toBeGreaterThan(0);
  });

  it('should handle project lifecycle', async () => {
    const projectId = 'test-lifecycle';
    const config: Config = {
      workingDir: simpleProjectDir,
      languages: ['typescript'],
      maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
      ignoreDirs: DEFAULT_IGNORE_DIRS,
    };

    // Create project
    const project = treeManager.createProject(projectId, config);
    expect(treeManager.getProject(projectId)).toBeDefined();

    // Initialize project
    await treeManager.initializeProject(projectId);
    expect(project.initialized).toBe(true);

    // Get project info
    const allProjects = treeManager.getAllProjects();
    expect(allProjects.some(p => p.projectId === projectId)).toBe(true);

    // Destroy project
    treeManager.destroyProject(projectId);
    expect(treeManager.getProject(projectId)).toBeUndefined();
  });

  it('should perform basic search', async () => {
    const projectId = 'test-search';
    const config: Config = {
      workingDir: simpleProjectDir,
      languages: ['typescript'],
      maxDepth: DIRECTORIES.DEFAULT_MAX_DEPTH,
      ignoreDirs: DEFAULT_IGNORE_DIRS,
    };

    treeManager.createProject(projectId, config);
    await treeManager.initializeProject(projectId);

    // Perform a search - looking for any results
    const results = await treeManager.search(projectId, 'user', {
      maxResults: 10,
    });

    console.log('Search results for "user":', results);
    
    // The search should complete without error, even if no results
    expect(results).toBeInstanceOf(Array);
  });
});