/**
 * Calculator operations in TypeScript
 */

export interface CalculationResult {
  result: number
  operation: string
  operands: number[]
  timestamp: Date
}

export class Calculator {
  private history: CalculationResult[] = []

  add(a: number, b: number): number {
    const result = a + b
    this.recordOperation('add', [a, b], result)
    return result
  }

  subtract(a: number, b: number): number {
    const result = a - b
    this.recordOperation('subtract', [a, b], result)
    return result
  }

  multiply(a: number, b: number): number {
    const result = a * b
    this.recordOperation('multiply', [a, b], result)
    return result
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero')
    }
    const result = a / b
    this.recordOperation('divide', [a, b], result)
    return result
  }

  power(base: number, exponent: number): number {
    const result = Math.pow(base, exponent)
    this.recordOperation('power', [base, exponent], result)
    return result
  }

  getHistory(): CalculationResult[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }

  private recordOperation(operation: string, operands: number[], result: number): void {
    this.history.push({
      result,
      operation,
      operands: [...operands],
      timestamp: new Date(),
    })
  }
}

export function createCalculator(): Calculator {
  return new Calculator()
}