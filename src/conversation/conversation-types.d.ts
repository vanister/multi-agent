import type { Message } from "../llm/llm-types.js";

export type Conversation = {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};
