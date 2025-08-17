// File with mixed usage - some exports used, some unused
export const usedHelper = (x: number) => x * 2
export const unusedHelper = (x: string) => x.toUpperCase()  // Never imported
export const anotherUnusedHelper = () => "unused"  // Never imported

export default function defaultHelper() {
  return "default helper"
}