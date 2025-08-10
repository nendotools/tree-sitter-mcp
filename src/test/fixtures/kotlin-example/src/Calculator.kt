package com.example.utils

interface Calculator {
    fun add(a: Double, b: Double): Double
    fun subtract(a: Double, b: Double): Double
    fun multiply(a: Double, b: Double): Double
    fun divide(a: Double, b: Double): Double
}

class BasicCalculator : Calculator {
    override fun add(a: Double, b: Double): Double = a + b
    
    override fun subtract(a: Double, b: Double): Double = a - b
    
    override fun multiply(a: Double, b: Double): Double = a * b
    
    override fun divide(a: Double, b: Double): Double {
        if (b == 0.0) {
            throw IllegalArgumentException("Division by zero")
        }
        return a / b
    }
}

object MathUtils {
    fun factorial(n: Int): Long {
        return if (n <= 1) 1 else n * factorial(n - 1)
    }
    
    fun isPrime(n: Int): Boolean {
        if (n < 2) return false
        for (i in 2..kotlin.math.sqrt(n.toDouble()).toInt()) {
            if (n % i == 0) return false
        }
        return true
    }
}

fun main() {
    val calc = BasicCalculator()
    println("5 + 3 = ${calc.add(5.0, 3.0)}")
    println("10! = ${MathUtils.factorial(10)}")
}