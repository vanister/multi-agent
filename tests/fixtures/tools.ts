import { vi } from 'vitest';
import { z } from 'zod';
import type { Tool } from '../../src/tools/tool-types.js';

/**
 * Mock echo tool for testing
 */
export const echoTool: Tool = {
  name: 'echo',
  description: 'Echoes the input message',
  parameters: { message: 'string - Message to echo' },
  argsSchema: z.object({ message: z.string() }),
  execute: vi.fn(async (args: any) => ({
    success: true,
    data: args.message
  }))
};

/**
 * Mock tool that throws error for testing error handling
 */
export const errorTool: Tool = {
  name: 'error_tool',
  description: 'Always throws an error',
  parameters: {},
  argsSchema: z.object({}),
  execute: vi.fn(async () => {
    throw new Error('Tool execution failed');
  })
};

/**
 * Mock calculate tool for testing
 */
export const calculateTool: Tool = {
  name: 'calculate',
  description: 'Performs arithmetic operations',
  parameters: {
    a: 'number - First operand',
    b: 'number - Second operand',
    operation: "string - Operation: 'add' or 'subtract'"
  },
  argsSchema: z.object({
    a: z.number(),
    b: z.number(),
    operation: z.enum(['add', 'subtract'])
  }),
  execute: vi.fn(async (args: any) => {
    const result = args.operation === 'add' ? args.a + args.b : args.a - args.b;
    return { success: true, data: result };
  })
};

/**
 * Mock tool that always fails for testing error handling
 */
export const failTool: Tool = {
  name: 'fail_tool',
  description: 'Always fails',
  parameters: {},
  argsSchema: z.object({}),
  execute: vi.fn(async () => ({
    success: false,
    error: 'Tool failed'
  }))
};
