/**
 * Test fixture that imports some but not all exports to create unused exports
 */

import { UsedClass, usedFunction, USED_CONSTANT, UsedInterface, UsedType } from './unused-exports'

export class Consumer {
    private instance: UsedClass
    private constant: string = USED_CONSTANT

    constructor() {
        this.instance = new UsedClass()
    }

    public process(): UsedType {
        const result = usedFunction()
        return result as UsedType
    }

    public processInterface(data: UsedInterface): void {
        console.log(data.prop)
    }
}