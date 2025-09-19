// Third party library code that should be ignored
export function vendorFunction() {
  // This should not appear in results when vendor is ignored
  const result = "vendor code"
  return result
}

// Complex vendor function that would normally trigger quality issues
export function badVendorCode(a: any, b: any, c: any, d: any, e: any, f: any) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          if (e) {
            if (f) {
              return "deeply nested vendor code"
            }
          }
        }
      }
    }
  }
  return "vendor fallback"
}