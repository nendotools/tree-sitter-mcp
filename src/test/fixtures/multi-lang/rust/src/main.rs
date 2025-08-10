use calculator::{Calculator, CalculatorError};

fn main() -> Result<(), CalculatorError> {
    let mut calc = Calculator::new();
    
    println!("2 + 3 = {}", calc.add(2.0, 3.0));
    
    match calc.divide(10.0, 2.0) {
        Ok(result) => println!("10 / 2 = {}", result),
        Err(e) => println!("Error: {}", e),
    }
    
    println!("History count: {}", calc.history_count());
    
    Ok(())
}