using System;

namespace Example.Utils
{
    public interface ICalculator
    {
        double Add(double a, double b);
        double Subtract(double a, double b);
        double Multiply(double a, double b);
        double Divide(double a, double b);
    }

    public class BasicCalculator : ICalculator
    {
        public double Add(double a, double b)
        {
            return a + b;
        }

        public double Subtract(double a, double b)
        {
            return a - b;
        }

        public double Multiply(double a, double b)
        {
            return a * b;
        }

        public double Divide(double a, double b)
        {
            if (Math.Abs(b) < double.Epsilon)
                throw new DivideByZeroException("Division by zero");
            return a / b;
        }
    }

    public static class MathUtils
    {
        public static long Factorial(int n)
        {
            if (n < 0) throw new ArgumentException("Factorial is not defined for negative numbers");
            if (n <= 1) return 1;
            return n * Factorial(n - 1);
        }

        public static bool IsPrime(int n)
        {
            if (n < 2) return false;
            for (int i = 2; i <= Math.Sqrt(n); i++)
            {
                if (n % i == 0) return false;
            }
            return true;
        }

        public static int Fibonacci(int n)
        {
            if (n < 0) throw new ArgumentException("Fibonacci is not defined for negative numbers");
            if (n == 0) return 0;
            if (n == 1) return 1;
            return Fibonacci(n - 1) + Fibonacci(n - 2);
        }

        public static T Max<T>(T a, T b) where T : IComparable<T>
        {
            return a.CompareTo(b) >= 0 ? a : b;
        }

        public static T Min<T>(T a, T b) where T : IComparable<T>
        {
            return a.CompareTo(b) <= 0 ? a : b;
        }

        public static int Gcd(int a, int b)
        {
            return b == 0 ? Math.Abs(a) : Gcd(b, a % b);
        }

        public static int Lcm(int a, int b)
        {
            return Math.Abs(a * b) / Gcd(a, b);
        }
    }

    public class Program
    {
        public static void Main(string[] args)
        {
            var calc = new BasicCalculator();
            Console.WriteLine($"5 + 3 = {calc.Add(5.0, 3.0)}");
            Console.WriteLine($"10! = {MathUtils.Factorial(10)}");
            Console.WriteLine($"Fibonacci 8 = {MathUtils.Fibonacci(8)}");
            Console.WriteLine($"Is 17 prime? {MathUtils.IsPrime(17)}");
            Console.WriteLine($"GCD(24, 16) = {MathUtils.Gcd(24, 16)}");
        }
    }
}