/**
 * Test fixture for circular dependency analysis - completes the circle
 */

import { CircularA } from './circular-deps'

export class CircularB {
    private a: CircularA

    constructor() {
        this.a = new CircularA()
    }

    public methodB(): string {
        return this.a.methodA()
    }
}