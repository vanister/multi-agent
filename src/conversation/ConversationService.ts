import type { Message } from "../llm/schemas.js";
import type { Conversation } from "./schemas.js";
import type { ConversationRepository } from "./ConversationRepository.js";
import {
  ConversationAlreadyExistsError,
  ConversationNotFoundError,
  ConversationDataCorruptedError
} from "./ConversationErrors.js";
import { conversationSchema } from "./schemas.js";
import { messageSchema } from "../llm/schemas.js";
import { now } from "../utilities/dateUtilities.js";

export interface ConversationService {
  create(): Promise<void>;
  add(message: Message): Promise<void>;
  getAll(): Promise<Message[]>;
  clear(): Promise<void>;
  estimateTokens(): Promise<number>;
}

export class InMemoryConversationService implements ConversationService {
  static readonly CHARS_PER_TOKEN = 4;

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

    const nowTimestamp = now();
    const conversation = {
      id: this.conversationId,
      messages: [],
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp
    };

    await this.repository.create(this.conversationId, conversation);
  }

  async add(message: Message): Promise<void> {
    messageSchema.parse(message);

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
    return Math.ceil(totalChars / InMemoryConversationService.CHARS_PER_TOKEN);
  }

  private validateConversation(conversation: Conversation): Conversation {
    try {
      return conversationSchema.parse(conversation);
    } catch (error) {
      throw new ConversationDataCorruptedError(
        this.conversationId,
        (error as Error)?.message || "Unknown validation error"
      );
    }
  }
}
