class Calculator
  def add(a, b)
    a + b
  end

  def subtract(a, b)
    a - b
  end

  def multiply(a, b)
    a * b
  end

  def divide(a, b)
    raise ZeroDivisionError, "Division by zero" if b == 0
    a / b
  end
end

module MathUtils
  def self.factorial(n)
    raise ArgumentError, "Factorial is not defined for negative numbers" if n < 0
    return 1 if n <= 1
    n * factorial(n - 1)
  end

  def self.prime?(n)
    return false if n < 2
    (2..Math.sqrt(n)).none? { |i| n % i == 0 }
  end

  def self.fibonacci(n)
    raise ArgumentError, "Fibonacci is not defined for negative numbers" if n < 0
    return 0 if n == 0
    return 1 if n == 1
    fibonacci(n - 1) + fibonacci(n - 2)
  end

  def self.gcd(a, b)
    b == 0 ? a : gcd(b, a % b)
  end

  def self.lcm(a, b)
    (a * b) / gcd(a, b)
  end
end

# Example usage
if __FILE__ == $0
  calc = Calculator.new
  puts "5 + 3 = #{calc.add(5, 3)}"
  puts "10! = #{MathUtils.factorial(10)}"
  puts "Fibonacci 8 = #{MathUtils.fibonacci(8)}"
  puts "Is 17 prime? #{MathUtils.prime?(17)}"
  puts "GCD(24, 16) = #{MathUtils.gcd(24, 16)}"
  puts "LCM(12, 8) = #{MathUtils.lcm(12, 8)}"
end