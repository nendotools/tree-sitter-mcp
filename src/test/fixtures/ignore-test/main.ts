// Main application file
export function main() {
  console.log("Hello world")
  processData()
}

function processData() {
  const data = [1, 2, 3, 4, 5]
  return data.map(x => x * 2)
}

export { processData }