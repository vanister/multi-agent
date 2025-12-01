import type { z } from "zod";
import type { ConversationSchema } from "./schemas.js";

export type Conversation = z.infer<typeof ConversationSchema>;
