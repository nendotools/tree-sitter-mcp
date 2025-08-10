class Calculator {
  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}

const MathUtils = {
  factorial(n) {
    if (n <= 1) return 1;
    return n * this.factorial(n - 1);
  },

  isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  },

  fibonacci(n) {
    if (n === 0) return 0;
    if (n === 1) return 1;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
};

function main() {
  const calc = new Calculator();
  console.log(`5 + 3 = ${calc.add(5, 3)}`);
  console.log(`10! = ${MathUtils.factorial(10)}`);
  console.log(`Fibonacci 8 = ${MathUtils.fibonacci(8)}`);
}

module.exports = { Calculator, MathUtils, main };