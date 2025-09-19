// Utility functions
export function calculateSum(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0)
}

export function formatMessage(message: string): string {
  return `[INFO] ${message}`
}

// Function with high complexity for testing
export function complexFunction(input: string, options: any): string {
  if (!input) {
    return ""
  }

  if (typeof input !== 'string') {
    throw new Error("Input must be string")
  }

  if (input.length > 100) {
    return input.substring(0, 100)
  }

  if (options.uppercase) {
    input = input.toUpperCase()
  }

  if (options.prefix) {
    input = options.prefix + input
  }

  if (options.suffix) {
    input = input + options.suffix
  }

  return input
}