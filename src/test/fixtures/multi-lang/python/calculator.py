"""
Calculator operations in Python
"""

from datetime import datetime
from typing import List, Dict, Any
import math

class CalculationResult:
    def __init__(self, result: float, operation: str, operands: List[float]):
        self.result = result
        self.operation = operation
        self.operands = operands
        self.timestamp = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            'result': self.result,
            'operation': self.operation,
            'operands': self.operands,
            'timestamp': self.timestamp.isoformat(),
        }

class Calculator:
    def __init__(self):
        self.history: List[CalculationResult] = []

    def add(self, a: float, b: float) -> float:
        result = a + b
        self._record_operation('add', [a, b], result)
        return result

    def subtract(self, a: float, b: float) -> float:
        result = a - b
        self._record_operation('subtract', [a, b], result)
        return result

    def multiply(self, a: float, b: float) -> float:
        result = a * b
        self._record_operation('multiply', [a, b], result)
        return result

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError('Division by zero')
        result = a / b
        self._record_operation('divide', [a, b], result)
        return result

    def power(self, base: float, exponent: float) -> float:
        result = math.pow(base, exponent)
        self._record_operation('power', [base, exponent], result)
        return result

    def sqrt(self, x: float) -> float:
        if x < 0:
            raise ValueError('Cannot take square root of negative number')
        result = math.sqrt(x)
        self._record_operation('sqrt', [x], result)
        return result

    def get_history(self) -> List[Dict[str, Any]]:
        return [calc.to_dict() for calc in self.history]

    def clear_history(self) -> None:
        self.history.clear()

    def _record_operation(self, operation: str, operands: List[float], result: float) -> None:
        calc_result = CalculationResult(result, operation, operands)
        self.history.append(calc_result)

def create_calculator() -> Calculator:
    return Calculator()

if __name__ == '__main__':
    calc = create_calculator()
    print(f"2 + 3 = {calc.add(2, 3)}")
    print(f"10 / 2 = {calc.divide(10, 2)}")
    print(f"History: {calc.get_history()}")