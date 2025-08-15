/**
 * Test fixture for dead code analysis - unused exports
 */

export class UsedClass {
    public usedMethod(): string {
        return 'used'
    }
}

export class UnusedClass {
    public unusedMethod(): string {
        return 'unused'
    }
}

export function usedFunction(): string {
    return 'used'
}

export function unusedFunction(): string {
    return 'unused'
}

export const USED_CONSTANT = 'used'
export const UNUSED_CONSTANT = 'unused'

export interface UsedInterface {
    prop: string
}

export interface UnusedInterface {
    prop: string
}

export type UsedType = string
export type UnusedType = number