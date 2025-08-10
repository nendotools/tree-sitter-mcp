//! Calculator operations in Rust

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fmt;

/// Represents the result of a mathematical operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculationResult {
    pub result: f64,
    pub operation: String,
    pub operands: Vec<f64>,
    pub timestamp: DateTime<Utc>,
}

/// Error types for calculator operations
#[derive(Debug)]
pub enum CalculatorError {
    DivisionByZero,
    InvalidOperation(String),
    NegativeSquareRoot,
}

impl fmt::Display for CalculatorError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            CalculatorError::DivisionByZero => write!(f, "Division by zero"),
            CalculatorError::InvalidOperation(op) => write!(f, "Invalid operation: {}", op),
            CalculatorError::NegativeSquareRoot => write!(f, "Cannot take square root of negative number"),
        }
    }
}

impl Error for CalculatorError {}

/// Calculator with operation history tracking
#[derive(Debug)]
pub struct Calculator {
    history: Vec<CalculationResult>,
}

impl Calculator {
    /// Creates a new Calculator instance
    pub fn new() -> Self {
        Self {
            history: Vec::new(),
        }
    }

    /// Performs addition of two numbers
    pub fn add(&mut self, a: f64, b: f64) -> f64 {
        let result = a + b;
        self.record_operation("add", vec![a, b], result);
        result
    }

    /// Performs subtraction of two numbers
    pub fn subtract(&mut self, a: f64, b: f64) -> f64 {
        let result = a - b;
        self.record_operation("subtract", vec![a, b], result);
        result
    }

    /// Performs multiplication of two numbers
    pub fn multiply(&mut self, a: f64, b: f64) -> f64 {
        let result = a * b;
        self.record_operation("multiply", vec![a, b], result);
        result
    }

    /// Performs division of two numbers
    pub fn divide(&mut self, a: f64, b: f64) -> Result<f64, CalculatorError> {
        if b == 0.0 {
            return Err(CalculatorError::DivisionByZero);
        }
        let result = a / b;
        self.record_operation("divide", vec![a, b], result);
        Ok(result)
    }

    /// Raises base to the power of exponent
    pub fn power(&mut self, base: f64, exponent: f64) -> f64 {
        let result = base.powf(exponent);
        self.record_operation("power", vec![base, exponent], result);
        result
    }

    /// Calculates square root
    pub fn sqrt(&mut self, x: f64) -> Result<f64, CalculatorError> {
        if x < 0.0 {
            return Err(CalculatorError::NegativeSquareRoot);
        }
        let result = x.sqrt();
        self.record_operation("sqrt", vec![x], result);
        Ok(result)
    }

    /// Returns a reference to the calculation history
    pub fn get_history(&self) -> &[CalculationResult] {
        &self.history
    }

    /// Clears the calculation history
    pub fn clear_history(&mut self) {
        self.history.clear();
    }

    /// Returns the number of operations in history
    pub fn history_count(&self) -> usize {
        self.history.len()
    }

    fn record_operation(&mut self, operation: &str, operands: Vec<f64>, result: f64) {
        let calc_result = CalculationResult {
            result,
            operation: operation.to_string(),
            operands,
            timestamp: Utc::now(),
        };
        self.history.push(calc_result);
    }
}

impl Default for Calculator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        let mut calc = Calculator::new();
        assert_eq!(calc.add(2.0, 3.0), 5.0);
    }

    #[test]
    fn test_divide_by_zero() {
        let mut calc = Calculator::new();
        assert!(matches!(calc.divide(1.0, 0.0), Err(CalculatorError::DivisionByZero)));
    }

    #[test]
    fn test_negative_sqrt() {
        let mut calc = Calculator::new();
        assert!(matches!(calc.sqrt(-1.0), Err(CalculatorError::NegativeSquareRoot)));
    }
}