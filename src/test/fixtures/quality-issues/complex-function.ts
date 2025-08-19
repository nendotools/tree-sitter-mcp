/**
 * This file contains intentional quality issues for testing
 */

export class ComplexClass {
    // Function with high complexity (many branching paths)
    public processComplexLogic(
        input: string,
        options: any,
        config: any,
        metadata: any,
        settings: any,
        flags: any,
        parameters: any,
        context: any,
        extraParam1: any
    ): string {
        if (!input) {
            if (options && options.strict) {
                if (config.mode === 'strict') {
                    if (metadata.version > 2) {
                        if (settings.enabled) {
                            if (flags.debug) {
                                if (parameters.verbose) {
                                    if (context.production) {
                                        return 'strict-debug-verbose-production'
                                    } else {
                                        return 'strict-debug-verbose-development'
                                    }
                                } else {
                                    return 'strict-debug-quiet'
                                }
                            } else {
                                return 'strict-no-debug'
                            }
                        } else {
                            return 'strict-disabled'
                        }
                    } else {
                        return 'strict-old-version'
                    }
                } else {
                    return 'non-strict'
                }
            } else {
                return 'no-options'
            }
        }

        switch (input.toLowerCase()) {
            case 'a':
                if (options.mode === 'strict') {
                    return this.handleA(options, config)
                } else {
                    return 'a-default'
                }
            case 'b':
                if (config.enabled && options.debug) {
                    return this.handleB(options, config)
                } else {
                    return 'b-default'
                }
            case 'c':
                if (metadata.version > 1 || settings.legacy) {
                    return this.handleC(options, config)
                } else {
                    return 'c-default'
                }
            case 'd':
                if (flags.experimental && parameters.beta) {
                    return this.handleD(options, config)
                } else {
                    return 'd-default'
                }
            case 'e':
                if (context.production || extraParam1.force) {
                    return this.handleE(options, config)
                } else {
                    return 'e-default'
                }
            case 'f':
                if (input.length > 5 && options.validate) {
                    return 'f-validated'
                } else if (config.fallback) {
                    return 'f-fallback'
                } else {
                    return 'f-default'
                }
            default:
                if (options.strict && config.throwOnUnknown) {
                    throw new Error('Unknown input')
                } else if (metadata.fallbackEnabled) {
                    return 'fallback-value'
                } else {
                    return 'unknown'
                }
        }
    }

    // Very long method (over 50 lines)
    public processLongOperation(): void {
        const data = this.getData()
        const processed = this.processData(data)
        const validated = this.validateData(processed)
        const transformed = this.transformData(validated)
        const enriched = this.enrichData(transformed)
        const formatted = this.formatData(enriched)
        const compressed = this.compressData(formatted)
        const encrypted = this.encryptData(compressed)
        const signed = this.signData(encrypted)
        const serialized = this.serializeData(signed)
        
        // Many more lines of processing...
        console.log('Step 1')
        console.log('Step 2')
        console.log('Step 3')
        console.log('Step 4')
        console.log('Step 5')
        console.log('Step 6')
        console.log('Step 7')
        console.log('Step 8')
        console.log('Step 9')
        console.log('Step 10')
        console.log('Step 11')
        console.log('Step 12')
        console.log('Step 13')
        console.log('Step 14')
        console.log('Step 15')
        console.log('Step 16')
        console.log('Step 17')
        console.log('Step 18')
        console.log('Step 19')
        console.log('Step 20')
        console.log('Step 21')
        console.log('Step 22')
        console.log('Step 23')
        console.log('Step 24')
        console.log('Step 25')
        console.log('Step 26')
        console.log('Step 27')
        console.log('Step 28')
        console.log('Step 29')
        console.log('Step 30')
        console.log('Step 31')
        console.log('Step 32')
        console.log('Step 33')
        console.log('Step 34')
        console.log('Step 35')
        console.log('Step 36')
        console.log('Step 37')
        console.log('Step 38')
        console.log('Step 39')
        console.log('Step 40')
        console.log('Step 41')
        console.log('Step 42')
        console.log('Step 43')
        console.log('Step 44')
        console.log('Step 45')
        console.log('Step 46')
        console.log('Step 47')
        console.log('Step 48')
        console.log('Step 49')
        console.log('Step 50')
        console.log('Step 51')
        console.log('Step 52')
        console.log('Step 53')
        console.log('Step 54')
        console.log('Step 55')
        console.log('Step 56')
        console.log('Step 57')
        console.log('Step 58')
        console.log('Step 59')
        console.log('Step 60')
        console.log('Step 61')
        console.log('Step 62')
        console.log('Step 63')
        console.log('Step 64')
        console.log('Step 65')
        console.log('Step 66')
        console.log('Step 67')
        console.log('Step 68')
        console.log('Step 69')
        console.log('Step 70')
        console.log('Step 71')
        console.log('Step 72')
        console.log('Step 73')
        console.log('Step 74')
        console.log('Step 75')
        console.log('Step 76')
        console.log('Step 77')
        console.log('Step 78')
        console.log('Step 79')
        console.log('Step 80')
        console.log('Step 81')
        console.log('Step 82')
        console.log('Step 83')
        console.log('Step 84')
        console.log('Step 85')
        console.log('Step 86')
        console.log('Step 87')
        console.log('Step 88')
        console.log('Step 89')
        console.log('Step 90')
        console.log('Step 91')
        console.log('Step 92')
        console.log('Step 93')
        console.log('Step 94')
        console.log('Step 95')
        console.log('Step 96')
        console.log('Step 97')
        console.log('Step 98')
        console.log('Step 99')
        console.log('Step 100')
        console.log('Final step')
        
        this.finalizeOperation(serialized)
    }

    private handleA(options: any, config: any): string {
        return 'handled A'
    }

    private handleB(options: any, config: any): string {
        return 'handled B'
    }

    private handleC(options: any, config: any): string {
        return 'handled C'
    }

    private handleD(options: any, config: any): string {
        return 'handled D'
    }

    private handleE(options: any, config: any): string {
        return 'handled E'
    }

    private getData(): any {
        return {}
    }

    private processData(data: any): any {
        return data
    }

    private validateData(data: any): any {
        return data
    }

    private transformData(data: any): any {
        return data
    }

    private enrichData(data: any): any {
        return data
    }

    private formatData(data: any): any {
        return data
    }

    private compressData(data: any): any {
        return data
    }

    private encryptData(data: any): any {
        return data
    }

    private signData(data: any): any {
        return data
    }

    private serializeData(data: any): any {
        return data
    }

    private finalizeOperation(data: any): void {
        // finalize
    }
}