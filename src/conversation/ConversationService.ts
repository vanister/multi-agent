import type { Message } from "../llm/llm-types.js";
import type { Conversation } from "./conversation-types.js";
import type { ConversationRepository } from "./ConversationRepository.js";
import {
  ConversationAlreadyExistsError,
  ConversationNotFoundError,
  ConversationDataCorruptedError
} from "./ConversationErrors.js";
import { ConversationSchema } from "./schemas.js";
import { MessageSchema } from "../llm/schemas.js";

export interface ConversationService {
  create(): Promise<void>;
  add(message: Message): Promise<void>;
  getAll(): Promise<Message[]>;
  clear(): Promise<void>;
  estimateTokens(): Promise<number>;
}

export class InMemoryConversationService implements ConversationService {
  constructor(
    private readonly conversationId: string,
    private readonly repository: ConversationRepository
  ) {}

  async create(): Promise<void> {
    const existing = await this.repository.get(this.conversationId);

    if (existing) {
      this.validateConversation(existing);
      throw new ConversationAlreadyExistsError(this.conversationId);
    }

    const now = new Date();
    const conversation = {
      id: this.conversationId,
      messages: [],
      createdAt: now,
      updatedAt: now
    };

    await this.repository.create(this.conversationId, conversation);
  }

  async add(message: Message): Promise<void> {
    MessageSchema.parse(message);

    const conversation = await this.repository.get(this.conversationId);

    if (!conversation) {
      throw new ConversationNotFoundError(this.conversationId);
    }

    this.validateConversation(conversation);
    await this.repository.add(this.conversationId, message);
  }

  async getAll(): Promise<Message[]> {
    const conversation = await this.repository.get(this.conversationId);

    if (!conversation) {
      return [];
    }

    this.validateConversation(conversation);
    return conversation.messages;
  }

  async clear(): Promise<void> {
    const conversation = await this.repository.get(this.conversationId);

    if (!conversation) {
      throw new ConversationNotFoundError(this.conversationId);
    }

    this.validateConversation(conversation);
    await this.repository.update(this.conversationId, []);
  }

  async estimateTokens(): Promise<number> {
    const messages = await this.getAll();
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);

    // Heuristic: ~4 chars per token is a common approximation for English text
    // This is intentionally simple for MVP; can be refined with actual tokenizer later
    return Math.ceil(totalChars / 4);
  }

  private validateConversation(conversation: Conversation): Conversation {
    try {
      return ConversationSchema.parse(conversation);
    } catch (error) {
      throw new ConversationDataCorruptedError(
        this.conversationId,
        error instanceof Error ? error.message : "Unknown validation error"
      );
    }
  }
}
