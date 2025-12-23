import type { z } from 'zod';

export type { ToolResult } from './schemas.js';

// Non-Zod types (complex generics and interfaces)
// Zod-inferred types (ToolCall, ToolResult) are exported from schemas.ts

export type ToolMetadata = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type Tool<TArgs = Record<string, unknown>> = ToolMetadata & {
  argsSchema: z.ZodSchema<TArgs>;
  execute: (args: TArgs) => Promise<ToolResult>;
};
