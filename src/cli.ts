#!/usr/bin/env node

/**
 * CLI executable entry point
 */

import { createCLI } from './cli/index.js'

async function main() {
  try {
    const program = createCLI()
    await program.parseAsync(process.argv)
  }
  catch (error) {
    console.error('CLI Error:', error)
    process.exit(1)
  }
}

main()