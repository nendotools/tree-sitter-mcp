/**
 * Type-safe package.json analysis for dead code detection
 */

import type { TreeNode } from '../../../../../types/index.js'
import type {
  PackageJsonBin,
  PackageJsonScripts,
  PackageJsonExports,
  PackageJsonDependencies,
} from '../types.js'

export class PackageAnalyzer {
  /**
   * Extracts entry points from package.json
   */
  getEntryPoints(packageJson: unknown): string[] {
    if (!this.isValidPackageJson(packageJson)) return []

    const pkg = packageJson as {
      main?: string
      module?: string
      browser?: string | { [key: string]: string }
      bin?: string | PackageJsonBin
      scripts?: PackageJsonScripts
      exports?: string | PackageJsonExports
    }

    const entryPoints: string[] = []

    // Main fields
    if (pkg.main) entryPoints.push(pkg.main)
    if (pkg.module) entryPoints.push(pkg.module)

    // Browser field
    if (typeof pkg.browser === 'string') {
      entryPoints.push(pkg.browser)
    }

    // Bin entries
    if (pkg.bin) {
      if (typeof pkg.bin === 'string') {
        entryPoints.push(pkg.bin)
      }
      else {
        entryPoints.push(...Object.values(pkg.bin))
      }
    }

    // Extract file references from scripts
    if (pkg.scripts) {
      for (const script of Object.values(pkg.scripts)) {
        const fileRefs = this.extractFileReferences(script)
        entryPoints.push(...fileRefs)
      }
    }

    // Modern exports field
    if (pkg.exports) {
      const exportPaths = this.extractExportPaths(pkg.exports)
      entryPoints.push(...exportPaths)
    }

    return entryPoints.filter(Boolean)
  }

  /**
   * Detects frameworks and tools from package.json dependencies
   */
  getFrameworkHints(packageJson: unknown): Record<string, boolean> {
    if (!this.isValidPackageJson(packageJson)) return {}

    const pkg = packageJson as {
      dependencies?: PackageJsonDependencies
      devDependencies?: PackageJsonDependencies
    }

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }

    return {
      // React ecosystem
      react: 'react' in allDeps,
      nextjs: 'next' in allDeps,
      remix: '@remix-run/react' in allDeps,
      gatsby: 'gatsby' in allDeps,

      // Vue ecosystem
      vue: 'vue' in allDeps,
      nuxt: 'nuxt' in allDeps || '@nuxt/kit' in allDeps,

      // Angular ecosystem
      angular: '@angular/core' in allDeps,

      // Modern frameworks
      astro: 'astro' in allDeps,
      sveltekit: '@sveltejs/kit' in allDeps,
      svelte: 'svelte' in allDeps,
      solid: 'solid-js' in allDeps,

      // Build tools
      vite: 'vite' in allDeps,
      webpack: 'webpack' in allDeps,
      rollup: 'rollup' in allDeps,
      parcel: 'parcel' in allDeps,

      // Backend frameworks
      express: 'express' in allDeps,
      fastify: 'fastify' in allDeps,
      nestjs: '@nestjs/core' in allDeps,
      koa: 'koa' in allDeps,
      hapi: '@hapi/hapi' in allDeps,

      // Testing frameworks
      vitest: 'vitest' in allDeps,
      jest: 'jest' in allDeps,
      mocha: 'mocha' in allDeps,
      cypress: 'cypress' in allDeps,
      playwright: '@playwright/test' in allDeps,

      // Monorepo tools
      nx: 'nx' in allDeps || '@nx/workspace' in allDeps,
      lerna: 'lerna' in allDeps,
      turborepo: 'turbo' in allDeps,
      rush: '@microsoft/rush' in allDeps,

      // TypeScript
      typescript: 'typescript' in allDeps,

      // CSS frameworks
      tailwind: 'tailwindcss' in allDeps,

      // State management
      redux: 'redux' in allDeps || '@reduxjs/toolkit' in allDeps,
      zustand: 'zustand' in allDeps,
      pinia: 'pinia' in allDeps,

      // Database ORMs
      prisma: 'prisma' in allDeps,
      typeorm: 'typeorm' in allDeps,
      sequelize: 'sequelize' in allDeps,
    }
  }

  /**
   * Checks if a file is referenced as a bin entry in package.json
   */
  isPackageJsonBinEntry(filePath: string, fileNodes: TreeNode[]): boolean {
    const packageJsonFile = fileNodes.find(node =>
      node.path.endsWith('package.json') && !node.path.includes('node_modules'),
    )

    if (!packageJsonFile?.content) return false

    try {
      const packageJson = JSON.parse(packageJsonFile.content) as unknown
      if (!this.isValidPackageJson(packageJson)) return false

      const pkg = packageJson as { bin?: string | PackageJsonBin }

      if (pkg.bin) {
        if (typeof pkg.bin === 'string') {
          return filePath.endsWith(pkg.bin) || filePath.includes(pkg.bin)
        }
        if (typeof pkg.bin === 'object') {
          return Object.values(pkg.bin).some((binPath: string) =>
            filePath.endsWith(binPath) || filePath.includes(binPath),
          )
        }
      }
    }
    catch {
      // Ignore JSON parse errors
    }

    return false
  }

  /**
   * Type guard to check if an unknown value is a valid package.json object
   */
  private isValidPackageJson(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null
  }

  /**
   * Extracts file references from npm scripts
   */
  private extractFileReferences(script: string): string[] {
    const filePatterns = [
      // Node.js files: node script.js
      /(?:^|\s)node\s+([^\s]+\.(?:js|ts|mjs|cjs))(?:\s|$)/g,
      // TypeScript: tsx script.ts
      /(?:^|\s)tsx?\s+([^\s]+\.(?:ts|tsx))(?:\s|$)/g,
      // Direct file execution: ./script.js
      /(?:^|\s)\.\/([^\s]+\.(?:js|ts|jsx|tsx|mjs|cjs))(?:\s|$)/g,
      // Entry flag: --entry=file.js
      /--entry[=\s]+([^\s]+)/g,
      // Webpack entry: webpack --entry ./src/index.js
      /webpack.*--entry\s+([^\s]+)/g,
      // Vite build: vite build src/main.ts
      /vite\s+build\s+([^\s]+\.(?:js|ts|jsx|tsx))(?:\s|$)/g,
    ]

    const files: string[] = []
    for (const pattern of filePatterns) {
      const matches = script.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          files.push(match[1])
        }
      }
    }
    return files
  }

  /**
   * Extracts file paths from package.json exports field
   */
  private extractExportPaths(exports: string | PackageJsonExports): string[] {
    if (typeof exports === 'string') return [exports]

    const paths: string[] = []
    for (const value of Object.values(exports)) {
      if (typeof value === 'string') {
        paths.push(value)
      }
      else if (typeof value === 'object' && value !== null) {
        // Handle conditional exports like { "import": "./dist/index.js", "require": "./dist/index.cjs" }
        for (const conditionalValue of Object.values(value)) {
          if (typeof conditionalValue === 'string') {
            paths.push(conditionalValue)
          }
        }
      }
    }
    return paths
  }
}