import type { Message } from "../llm/llm-types.js";
import type { ConversationRepository } from "./ConversationRepository.js";

export interface ConversationHistoryService {
  add(message: Message): Promise<void>;
  getAll(): Promise<Message[]>;
  clear(): Promise<void>;
  estimateTokens(): Promise<number>;
}

export class InMemoryConversationHistoryService implements ConversationHistoryService {
  constructor(
    private readonly conversationId: string,
    private readonly repository: ConversationRepository
  ) {}

  async add(message: Message): Promise<void> {
    await this.repository.add(this.conversationId, message);
  }

  async getAll(): Promise<Message[]> {
    const conversation = await this.repository.get(this.conversationId);
    return conversation ? conversation.messages : [];
  }

  async clear(): Promise<void> {
    await this.repository.update(this.conversationId, []);
  }

  async estimateTokens(): Promise<number> {
    const messages = await this.getAll();
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
}
