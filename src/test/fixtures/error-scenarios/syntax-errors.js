// JavaScript file with intentional syntax errors for testing

function missingBrace() {
  if (true) {
    console.log('test')
  // Missing closing brace

export class MissingBrace {
  method() {
    return 'test'
  // Missing closing brace for class

function missingParen(
  // Missing closing parenthesis and function body

const unfinishedString = "this string is never closed

const obj = {
  prop: 'value'
  // Missing comma and closing brace

if (condition {
  // Missing closing parenthesis
  doSomething()
}

for (let i = 0 i < 10; i++) {
  // Missing semicolon in for loop
  console.log(i)
}