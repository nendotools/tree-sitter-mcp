/**
 * Standalone mode for testing and debugging
 */

import { writeFileSync } from 'fs';
import type { Config } from '../types/index.js';
import { getLogger } from '../utils/logger.js';
import { TreeManager } from '../core/tree-manager.js';
import { getParserRegistry } from '../parsers/registry.js';
import { DEFAULT_IGNORE_DIRS } from '../constants/index.js';

interface StandaloneOptions extends Config {
  output?: string;
  pretty?: boolean;
}

export async function runStandaloneMode(options: StandaloneOptions): Promise<void> {
  const logger = getLogger();

  logger.info('Running in standalone mode...');
  logger.info(`Analyzing directory: ${options.workingDir}`);

  try {
    const parserRegistry = getParserRegistry();
    const treeManager = new TreeManager(parserRegistry);
    const projectId = 'standalone';
    const config: Config = {
      workingDir: options.workingDir,
      languages: options.languages,
      maxDepth: options.maxDepth,
      ignoreDirs: options.ignoreDirs || DEFAULT_IGNORE_DIRS,
    };

    await treeManager.createProject(projectId, config);
    await treeManager.initializeProject(projectId);

    const stats = treeManager.getProjectStats(projectId);
    const tree = treeManager.getProjectTree(projectId);

    const output = {
      project: {
        id: projectId,
        workingDir: options.workingDir,
        initialized: true,
      },
      stats: {
        totalFiles: stats.totalFiles,
        totalNodes: stats.totalNodes,
        languages: stats.languages,
        nodeTypes: stats.nodeTypes,
      },
      tree: tree ? treeManager.serializeTree(tree) : null,
    };

    const jsonOutput = options.pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
    if (options.output) {
      writeFileSync(options.output, jsonOutput);
      logger.info(`Output written to: ${options.output}`);
    } else {
      process.stdout.write(jsonOutput + '\n');
    }

    logger.info('Analysis complete!');
  } catch (error) {
    logger.error('Analysis failed:', error);
    process.exit(1);
  }
}
