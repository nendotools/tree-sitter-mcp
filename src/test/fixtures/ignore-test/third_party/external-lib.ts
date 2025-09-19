// External third party library that should be ignored
export class ExternalLibrary {
  private data: any[] = []

  // Intentionally poor code that would trigger quality issues
  public processData(input: any): any {
    if (input) {
      if (input.length) {
        if (input.length > 0) {
          if (typeof input === 'object') {
            if (Array.isArray(input)) {
              return input.map((item: any) => {
                if (item) {
                  if (item.id) {
                    return { ...item, processed: true }
                  }
                }
                return item
              })
            }
          }
        }
      }
    }
    return null
  }
}

// Function with many parameters (quality issue)
export function complexFunction(a: any, b: any, c: any, d: any, e: any, f: any, g: any) {
  return a + b + c + d + e + f + g
}