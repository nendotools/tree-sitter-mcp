/**
 * Framework manager that coordinates multiple framework analyzers
 */

import type { TreeNode } from '../../../../../types/index.js'
import type { BaseFrameworkAnalyzer } from './base-framework-analyzer.js'
import { NextJsAnalyzer } from './nextjs-analyzer.js'
import { ReactAnalyzer } from './react-analyzer.js'
import { VueAnalyzer } from './vue-analyzer.js'
import { NuxtAnalyzer } from './nuxt-analyzer.js'
import { SvelteAnalyzer } from './svelte-analyzer.js'

interface EntryPoint {
  path: string
  type: 'package_script' | 'package_main' | 'package_bin' | 'framework_page' | 'framework_api' | 'test_file' | 'config_file'
  source: string
}

export class FrameworkManager {
  private analyzers: Map<string, BaseFrameworkAnalyzer> = new Map()
  private detectedFrameworks: string[] = []

  constructor(fileNodes: TreeNode[], detectedFrameworks: string[]) {
    this.detectedFrameworks = detectedFrameworks
    this.initializeAnalyzers(fileNodes)
  }

  /**
   * Initialize framework analyzers based on detected frameworks
   */
  private initializeAnalyzers(fileNodes: TreeNode[]): void {
    // Initialize analyzers for detected frameworks
    for (const framework of this.detectedFrameworks) {
      switch (framework) {
        case 'nextjs':
          this.analyzers.set('nextjs', new NextJsAnalyzer())
          break
        case 'react':
          // Only add React analyzer if Next.js is not detected
          if (!this.detectedFrameworks.includes('nextjs')) {
            this.analyzers.set('react', new ReactAnalyzer(fileNodes))
          }
          break
        case 'vue':
          // Only add Vue analyzer if Nuxt is not detected
          if (!this.detectedFrameworks.includes('nuxt')) {
            this.analyzers.set('vue', new VueAnalyzer())
          }
          break
        case 'nuxt':
          this.analyzers.set('nuxt', new NuxtAnalyzer())
          break
        case 'svelte':
          this.analyzers.set('svelte', new SvelteAnalyzer())
          break
      }
    }
  }

  /**
   * Detect all framework entry points using appropriate analyzers
   */
  detectFrameworkEntryPoints(fileNodes: TreeNode[], frameworkConfigs?: Record<string, any>): EntryPoint[] {
    const entryPoints: EntryPoint[] = []

    for (const [framework, analyzer] of this.analyzers) {
      try {
        let frameworkEntryPoints: EntryPoint[]

        // Special handling for Nuxt which needs config
        if (framework === 'nuxt' && 'detectEntryPoints' in analyzer) {
          frameworkEntryPoints = (analyzer as any).detectEntryPoints(fileNodes, frameworkConfigs)
        }
        else if ('detectEntryPoints' in analyzer) {
          frameworkEntryPoints = (analyzer as any).detectEntryPoints(fileNodes)
        }
        else {
          // Fallback to base framework analyzer method
          const paths = analyzer.detectFrameworkEntryPoints(fileNodes)
          frameworkEntryPoints = Array.from(paths).map(path => ({
            path,
            type: 'framework_page',
            source: `${framework} framework`,
          }))
        }

        entryPoints.push(...frameworkEntryPoints)
      }
      catch (error) {
        console.warn(`Error detecting entry points for ${framework}:`, error)
      }
    }

    return entryPoints
  }

  /**
   * Get the list of detected frameworks
   */
  getDetectedFrameworks(): string[] {
    return this.detectedFrameworks
  }

  /**
   * Check if a specific framework is detected
   */
  hasFramework(framework: string): boolean {
    return this.detectedFrameworks.includes(framework)
  }
}