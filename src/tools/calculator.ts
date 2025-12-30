import { calculatorArgsSchema } from './schemas.js';
import type { Tool } from './tool-types.js';
import type { ToolResult } from './schemas.js';
import { createToolSuccess, createToolError } from './toolHelpers.js';

export const calculateTool: Tool = {
  name: 'calculate',
  description:
    'Evaluate a simple arithmetic expression with +, -, *, / operators (left-to-right evaluation, no precedence)',
  parameters: {
    expression:
      "string - Arithmetic expression with positive numbers and operators (e.g., '2 + 3 * 4' evaluates to 20)"
  },
  argsSchema: calculatorArgsSchema,
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const validatedArgs = calculatorArgsSchema.parse(args);

    try {
      const result = evaluateExpression(validatedArgs.expression);

      return createToolSuccess(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return createToolError(errorMessage);
    }
  }
};

// todo - revisit this
function evaluateExpression(expression: string): number {
  // Strip all whitespace
  const cleaned = expression.replace(/\s+/g, '');

  // Tokenize: split into numbers and operators
  const tokens: string[] = [];
  let currentNumber = '';

  for (const char of cleaned) {
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      if (currentNumber === '') {
        throw new Error('Invalid syntax: operator without preceding number');
      }

      tokens.push(currentNumber);
      tokens.push(char);
      currentNumber = '';
    } else if ((char >= '0' && char <= '9') || char === '.') {
      currentNumber += char;
    } else {
      throw new Error(`Invalid character: '${char}'`);
    }
  }

  if (currentNumber === '') {
    throw new Error('Invalid syntax: expression ends with operator');
  }

  tokens.push(currentNumber);

  // Validate tokens: must alternate number, operator, number, ...
  if (tokens.length % 2 === 0) {
    throw new Error('Invalid syntax: incorrect number of tokens');
  }

  // Parse numbers and validate
  const numbers: number[] = [];
  const operators: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) {
      // Should be a number
      const num = parseFloat(tokens[i]);

      if (isNaN(num)) {
        throw new Error(`Invalid number: '${tokens[i]}'`);
      }

      if (num < 0) {
        throw new Error('Negative numbers are not supported');
      }

      numbers.push(num);
    } else {
      // Should be an operator
      operators.push(tokens[i]);
    }
  }

  // Evaluate left-to-right
  let result = numbers[0];

  for (let i = 0; i < operators.length; i++) {
    const operator = operators[i];
    const nextNumber = numbers[i + 1];

    switch (operator) {
      case '+':
        result = result + nextNumber;
        break;
      case '-':
        result = result - nextNumber;
        break;
      case '*':
        result = result * nextNumber;
        break;
      case '/':
        if (nextNumber === 0) {
          throw new Error('Division by zero');
        }

        result = result / nextNumber;
        break;
      default:
        throw new Error(`Unsupported operator: '${operator}'`);
    }
  }

  return result;
}
