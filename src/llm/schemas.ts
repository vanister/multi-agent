import { z } from "zod";

export const MessageRoleSchema = z.enum(["system", "user", "assistant"]);

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string()
});

export const LlmResultSchema = z.object({
  content: z.string()
});

export const OllamaChatResponseSchema = z.object({
  message: z.object({
    content: z.string()
  })
});
