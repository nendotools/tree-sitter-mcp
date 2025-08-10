#include <stdio.h>
#include <stdbool.h>
#include <math.h>

double add(double a, double b) {
    return a + b;
}

double subtract(double a, double b) {
    return a - b;
}

double multiply(double a, double b) {
    return a * b;
}

double divide(double a, double b) {
    if (b == 0.0) {
        printf("Error: Division by zero\n");
        return 0.0;
    }
    return a / b;
}

long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

bool is_prime(int n) {
    if (n < 2) return false;
    for (int i = 2; i <= (int)sqrt(n); i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int fibonacci(int n) {
    if (n == 0) return 0;
    if (n == 1) return 1;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    printf("5 + 3 = %.2f\n", add(5.0, 3.0));
    printf("10! = %ld\n", factorial(10));
    printf("Fibonacci 8 = %d\n", fibonacci(8));
    printf("Is 17 prime? %s\n", is_prime(17) ? "true" : "false");
    return 0;
}