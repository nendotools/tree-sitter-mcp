// File with intentional syntax errors for testing error handling

function brokenFunction( {
  console.log("missing closing parenthesis");

function anotherBrokenFunction() {
  const obj = {
    property: "value"
    // missing comma
    anotherProperty: "another value"
  };
}

class BrokenClass {
  constructor() {
    this.value = "incomplete
    // unterminated string
  }
}

// Unmatched brackets and braces
if (true {
  console.log("missing parenthesis");
]

// Invalid function declaration
function 123invalidName() {
  return;
}

// Missing semicolon and other issues
let variable = function() {
  return {
    key: value // undefined variable
  }
} // missing semicolon