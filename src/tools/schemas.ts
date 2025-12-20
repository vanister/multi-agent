import { z } from "zod";

export const ToolCallSchema = z.object({
  name: z.string(),
  args: z.record(z.string(), z.unknown())
});

export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional()
});

export const FileReadArgsSchema = z.object({
  path: z.string().min(1, "Path cannot be empty")
});
