import { z } from 'zod';
import { messageSchema } from '../llm/schemas.js';

export const conversationSchema = z.object({
  id: z.string(),
  messages: z.array(messageSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export type Conversation = z.infer<typeof conversationSchema>;
