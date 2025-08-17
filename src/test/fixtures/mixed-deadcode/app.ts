// Main entry point that only imports some things
import { usedHelper } from './utils'
// Note: doesn't import unusedHelper, anotherUnusedHelper, or anything from totally-orphaned.ts

export function main() {
  console.log("Result:", usedHelper(5))
}

main()