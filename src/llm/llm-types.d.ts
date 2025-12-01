import type { z } from "zod";
import type {
  MessageRoleSchema,
  MessageSchema,
  LlmResultSchema,
  OllamaChatResponseSchema
} from "./schemas.js";

export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type LlmResult = z.infer<typeof LlmResultSchema>;
export type OllamaChatResponse = z.infer<typeof OllamaChatResponseSchema>;
