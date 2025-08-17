// This entire file is never imported - completely orphaned
export const orphanedFunction = () => "never used"
export const anotherOrphanedFunction = (x: number) => x + 1

export default class OrphanedClass {
  doSomething() {
    return "orphaned"
  }
}