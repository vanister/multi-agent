import type { z } from 'zod';

export type { ToolResult } from './schemas.js';

// Non-Zod types (complex generics and interfaces)
// Zod-inferred types (ToolCall, ToolResult) are exported from schemas.ts

export type ToolMetadata = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type Tool = ToolMetadata & {
  argsSchema: z.ZodSchema<Record<string, unknown>>;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
};
