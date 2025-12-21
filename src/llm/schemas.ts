import { z } from "zod";

export const messageRoleSchema = z.enum(["system", "user", "assistant"]);

export const messageSchema = z.object({
  role: messageRoleSchema,
  content: z.string()
});

export const llmResultSchema = z.object({
  content: z.string()
});

export const ollamaChatResponseSchema = z.object({
  message: z.object({
    content: z.string()
  })
});

export type MessageRole = z.infer<typeof messageRoleSchema>;
export type Message = z.infer<typeof messageSchema>;
export type LlmResult = z.infer<typeof llmResultSchema>;
export type OllamaChatResponse = z.infer<typeof ollamaChatResponseSchema>;
