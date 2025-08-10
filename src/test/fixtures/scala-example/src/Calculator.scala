package com.example.utils

trait Calculator {
  def add(a: Double, b: Double): Double
  def subtract(a: Double, b: Double): Double
  def multiply(a: Double, b: Double): Double
  def divide(a: Double, b: Double): Double
}

class BasicCalculator extends Calculator {
  override def add(a: Double, b: Double): Double = a + b
  override def subtract(a: Double, b: Double): Double = a - b
  override def multiply(a: Double, b: Double): Double = a * b
  
  override def divide(a: Double, b: Double): Double = {
    require(b != 0.0, "Division by zero")
    a / b
  }
}

object MathUtils {
  def factorial(n: Int): Long = {
    @scala.annotation.tailrec
    def factorialHelper(n: Int, acc: Long): Long = 
      if (n <= 1) acc else factorialHelper(n - 1, n * acc)
    
    factorialHelper(n, 1L)
  }

  def isPrime(n: Int): Boolean = {
    if (n < 2) false
    else (2 to math.sqrt(n).toInt).forall(n % _ != 0)
  }

  def fibonacci(n: Int): Int = n match {
    case 0 => 0
    case 1 => 1
    case _ => fibonacci(n - 1) + fibonacci(n - 2)
  }
}

object Main extends App {
  val calc = new BasicCalculator
  println(s"5 + 3 = ${calc.add(5.0, 3.0)}")
  println(s"10! = ${MathUtils.factorial(10)}")
  println(s"Fibonacci 8 = ${MathUtils.fibonacci(8)}")
}