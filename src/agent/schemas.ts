import { z } from 'zod';

/**
 * Schema for tool call responses from the LLM.
 * Example: { "tool": "file_read", "args": { "path": "test.ts" } }
 */
export const toolCallResponseSchema = z
  .object({
    tool: z.string(),
    args: z.record(z.string(), z.unknown())
  })
  .strict();

/**
 * Schema for completion responses from the LLM.
 * Example: { "done": true, "response": "Task completed successfully" }
 */
export const completionResponseSchema = z
  .object({
    done: z.literal(true),
    response: z.string()
  })
  .strict();

export type ToolCallResponse = z.infer<typeof toolCallResponseSchema>;
export type CompletionResponse = z.infer<typeof completionResponseSchema>;
export type ParsedResponse = ToolCallResponse | CompletionResponse;
