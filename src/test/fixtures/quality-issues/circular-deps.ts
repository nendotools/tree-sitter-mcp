/**
 * Test fixture for circular dependency analysis
 */

import { CircularB } from './circular-b'

export class CircularA {
    private b: CircularB

    constructor() {
        this.b = new CircularB()
    }

    public methodA(): string {
        return this.b.methodB()
    }
}