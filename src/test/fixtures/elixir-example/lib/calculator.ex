defmodule Example.Calculator do
  @moduledoc """
  Basic calculator operations
  """

  @spec add(number(), number()) :: number()
  def add(a, b) when is_number(a) and is_number(b), do: a + b

  @spec subtract(number(), number()) :: number()
  def subtract(a, b) when is_number(a) and is_number(b), do: a - b

  @spec multiply(number(), number()) :: number()
  def multiply(a, b) when is_number(a) and is_number(b), do: a * b

  @spec divide(number(), number()) :: {:ok, number()} | {:error, String.t()}
  def divide(_a, 0), do: {:error, "Division by zero"}
  def divide(a, b) when is_number(a) and is_number(b), do: {:ok, a / b}
end

defmodule Example.MathUtils do
  @moduledoc """
  Mathematical utility functions
  """

  @spec factorial(non_neg_integer()) :: pos_integer()
  def factorial(0), do: 1
  def factorial(n) when n > 0, do: n * factorial(n - 1)

  @spec is_prime?(integer()) :: boolean()
  def is_prime?(n) when n < 2, do: false
  def is_prime?(2), do: true
  def is_prime?(n) when rem(n, 2) == 0, do: false
  def is_prime?(n) do
    limit = :math.sqrt(n) |> trunc()
    not Enum.any?(3..limit//2, &(rem(n, &1) == 0))
  end

  @spec fibonacci(non_neg_integer()) :: non_neg_integer()
  def fibonacci(0), do: 0
  def fibonacci(1), do: 1
  def fibonacci(n) when n > 1, do: fibonacci(n - 1) + fibonacci(n - 2)
end