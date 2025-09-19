// Bad code with quality issues that should be found
export function terribleFunction(a: any, b: any, c: any, d: any, e: any, f: any, g: any) {
  // Function with too many parameters and deep nesting
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          if (e) {
            if (f) {
              if (g) {
                return "deeply nested nightmare"
              }
            }
          }
        }
      }
    }
  }
  return null
}

// Function with high complexity
export function complexCalculation(input: any): any {
  if (!input) return null
  if (typeof input !== 'object') return input
  if (Array.isArray(input)) {
    if (input.length === 0) return []
    if (input.length === 1) return input[0]
    if (input.length === 2) return input
    if (input.length > 10) {
      if (input.every(x => typeof x === 'number')) {
        if (input.some(x => x < 0)) {
          if (input.filter(x => x > 100).length > 0) {
            return input.map(x => x * 2).filter(x => x > 0)
          }
        }
      }
    }
  }
  return input
}

// Long function that exceeds recommended length
export function veryLongFunction(data: any) {
  let result = ""
  let counter = 0
  let flag = false
  let temp = null
  let index = 0
  let max = 1000
  let min = 0

  while (counter < max) {
    if (data && data.items) {
      if (data.items.length > index) {
        temp = data.items[index]
        if (temp && temp.value) {
          if (typeof temp.value === 'string') {
            if (temp.value.length > 0) {
              if (!flag) {
                result += temp.value
                flag = true
              } else {
                result += `, ${temp.value}`
              }
            }
          } else if (typeof temp.value === 'number') {
            if (temp.value > min) {
              result += temp.value.toString()
            }
          }
        }
        index++
      } else {
        break
      }
    }
    counter++
  }

  if (result.length > 500) {
    result = result.substring(0, 500) + "..."
  }

  return result
}