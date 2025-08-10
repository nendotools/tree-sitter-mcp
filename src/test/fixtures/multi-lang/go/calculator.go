// Calculator operations in Go
package main

import (
	"fmt"
	"math"
	"time"
)

// CalculationResult represents the result of a mathematical operation
type CalculationResult struct {
	Result    float64   `json:"result"`
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
	Timestamp time.Time `json:"timestamp"`
}

// Calculator provides mathematical operations with history tracking
type Calculator struct {
	history []CalculationResult
}

// NewCalculator creates a new Calculator instance
func NewCalculator() *Calculator {
	return &Calculator{
		history: make([]CalculationResult, 0),
	}
}

// Add performs addition of two numbers
func (c *Calculator) Add(a, b float64) float64 {
	result := a + b
	c.recordOperation("add", []float64{a, b}, result)
	return result
}

// Subtract performs subtraction of two numbers
func (c *Calculator) Subtract(a, b float64) float64 {
	result := a - b
	c.recordOperation("subtract", []float64{a, b}, result)
	return result
}

// Multiply performs multiplication of two numbers
func (c *Calculator) Multiply(a, b float64) float64 {
	result := a * b
	c.recordOperation("multiply", []float64{a, b}, result)
	return result
}

// Divide performs division of two numbers
func (c *Calculator) Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, fmt.Errorf("division by zero")
	}
	result := a / b
	c.recordOperation("divide", []float64{a, b}, result)
	return result, nil
}

// Power raises base to the power of exponent
func (c *Calculator) Power(base, exponent float64) float64 {
	result := math.Pow(base, exponent)
	c.recordOperation("power", []float64{base, exponent}, result)
	return result
}

// Sqrt calculates square root
func (c *Calculator) Sqrt(x float64) (float64, error) {
	if x < 0 {
		return 0, fmt.Errorf("cannot take square root of negative number")
	}
	result := math.Sqrt(x)
	c.recordOperation("sqrt", []float64{x}, result)
	return result, nil
}

// GetHistory returns a copy of the calculation history
func (c *Calculator) GetHistory() []CalculationResult {
	history := make([]CalculationResult, len(c.history))
	copy(history, c.history)
	return history
}

// ClearHistory removes all entries from calculation history
func (c *Calculator) ClearHistory() {
	c.history = c.history[:0]
}

// GetHistoryCount returns the number of operations in history
func (c *Calculator) GetHistoryCount() int {
	return len(c.history)
}

func (c *Calculator) recordOperation(operation string, operands []float64, result float64) {
	calcResult := CalculationResult{
		Result:    result,
		Operation: operation,
		Operands:  make([]float64, len(operands)),
		Timestamp: time.Now(),
	}
	copy(calcResult.Operands, operands)
	c.history = append(c.history, calcResult)
}

func main() {
	calc := NewCalculator()
	
	fmt.Printf("2 + 3 = %.2f\n", calc.Add(2, 3))
	
	result, err := calc.Divide(10, 2)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("10 / 2 = %.2f\n", result)
	}
	
	fmt.Printf("History count: %d\n", calc.GetHistoryCount())
}