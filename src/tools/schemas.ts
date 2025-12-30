import { z } from 'zod';

export const toolCallSchema = z.object({
  name: z.string(),
  args: z.record(z.string(), z.unknown())
});

export const toolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional()
});

export const fileReadArgsSchema = z.object({
  path: z.string().min(1, 'Path cannot be empty')
});

export const calculatorArgsSchema = z.object({
  expression: z.string().min(1, 'Expression cannot be empty')
});

export type ToolCall = z.infer<typeof toolCallSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;
export type FileReadArgs = z.infer<typeof fileReadArgsSchema>;
export type CalculatorArgs = z.infer<typeof calculatorArgsSchema>;
