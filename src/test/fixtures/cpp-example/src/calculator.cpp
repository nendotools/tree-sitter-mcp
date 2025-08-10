#include <iostream>
#include <stdexcept>
#include <cmath>

class Calculator {
public:
    double add(double a, double b) const {
        return a + b;
    }

    double subtract(double a, double b) const {
        return a - b;
    }

    double multiply(double a, double b) const {
        return a * b;
    }

    double divide(double a, double b) const {
        if (b == 0.0) {
            throw std::invalid_argument("Division by zero");
        }
        return a / b;
    }
};

namespace MathUtils {
    long factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    bool isPrime(int n) {
        if (n < 2) return false;
        for (int i = 2; i <= static_cast<int>(std::sqrt(n)); ++i) {
            if (n % i == 0) return false;
        }
        return true;
    }

    int fibonacci(int n) {
        if (n == 0) return 0;
        if (n == 1) return 1;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    template<typename T>
    T maximum(T a, T b) {
        return (a > b) ? a : b;
    }

    template<typename T>
    T minimum(T a, T b) {
        return (a < b) ? a : b;
    }
}

int main() {
    try {
        Calculator calc;
        std::cout << "5 + 3 = " << calc.add(5.0, 3.0) << std::endl;
        std::cout << "10! = " << MathUtils::factorial(10) << std::endl;
        std::cout << "Fibonacci 8 = " << MathUtils::fibonacci(8) << std::endl;
        std::cout << "Is 17 prime? " << (MathUtils::isPrime(17) ? "true" : "false") << std::endl;
        std::cout << "Max(42, 17) = " << MathUtils::maximum(42, 17) << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}