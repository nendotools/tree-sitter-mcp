<?php

declare(strict_types=1);

interface CalculatorInterface
{
    public function add(float $a, float $b): float;
    public function subtract(float $a, float $b): float;
    public function multiply(float $a, float $b): float;
    public function divide(float $a, float $b): float;
}

class Calculator implements CalculatorInterface
{
    public function add(float $a, float $b): float
    {
        return $a + $b;
    }

    public function subtract(float $a, float $b): float
    {
        return $a - $b;
    }

    public function multiply(float $a, float $b): float
    {
        return $a * $b;
    }

    public function divide(float $a, float $b): float
    {
        if ($b == 0.0) {
            throw new InvalidArgumentException("Division by zero");
        }
        return $a / $b;
    }
}

class MathUtils
{
    public static function factorial(int $n): int
    {
        if ($n < 0) {
            throw new InvalidArgumentException("Factorial is not defined for negative numbers");
        }
        if ($n <= 1) {
            return 1;
        }
        return $n * self::factorial($n - 1);
    }

    public static function isPrime(int $n): bool
    {
        if ($n < 2) {
            return false;
        }
        for ($i = 2; $i <= sqrt($n); $i++) {
            if ($n % $i === 0) {
                return false;
            }
        }
        return true;
    }

    public static function fibonacci(int $n): int
    {
        if ($n < 0) {
            throw new InvalidArgumentException("Fibonacci is not defined for negative numbers");
        }
        if ($n === 0) {
            return 0;
        }
        if ($n === 1) {
            return 1;
        }
        return self::fibonacci($n - 1) + self::fibonacci($n - 2);
    }

    public static function gcd(int $a, int $b): int
    {
        return $b === 0 ? abs($a) : self::gcd($b, $a % $b);
    }

    public static function lcm(int $a, int $b): int
    {
        return abs($a * $b) / self::gcd($a, $b);
    }

    /** @param mixed $a */
    /** @param mixed $b */
    /** @return mixed */
    public static function max($a, $b)
    {
        return $a >= $b ? $a : $b;
    }

    /** @param mixed $a */
    /** @param mixed $b */
    /** @return mixed */
    public static function min($a, $b)
    {
        return $a <= $b ? $a : $b;
    }
}

// Example usage
if (php_sapi_name() === 'cli') {
    $calc = new Calculator();
    echo "5 + 3 = " . $calc->add(5.0, 3.0) . PHP_EOL;
    echo "10! = " . MathUtils::factorial(10) . PHP_EOL;
    echo "Fibonacci 8 = " . MathUtils::fibonacci(8) . PHP_EOL;
    echo "Is 17 prime? " . (MathUtils::isPrime(17) ? 'true' : 'false') . PHP_EOL;
    echo "GCD(24, 16) = " . MathUtils::gcd(24, 16) . PHP_EOL;
}