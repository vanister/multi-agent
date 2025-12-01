import { z } from "zod";
import { MessageSchema } from "../llm/schemas.js";

export const ConversationSchema = z.object({
  id: z.string(),
  messages: z.array(MessageSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});
