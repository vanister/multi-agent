import type { Message } from "../llm/llm-types.js";
import type { Conversation } from "./conversation-types.js";
import { ConversationNotFoundError, ConversationAlreadyExistsError } from "./ConversationError.js";

export interface ConversationRepository {
  create(id: string): Promise<Conversation>;
  get(id: string): Promise<Conversation | null>;
  add(id: string, message: Message): Promise<void>;
  update(id: string, messages: Message[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export class InMemoryConversationRepository implements ConversationRepository {
  private conversations: Map<string, Conversation> = new Map();

  async create(id: string): Promise<Conversation> {
    if (this.conversations.has(id)) {
      throw new ConversationAlreadyExistsError(id);
    }

    const now = new Date();
    const conversation: Conversation = {
      id,
      messages: [],
      createdAt: now,
      updatedAt: now
    };

    this.conversations.set(id, conversation);
    return { ...conversation };
  }

  async get(id: string): Promise<Conversation | null> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      return null;
    }
    return {
      ...conversation,
      messages: [...conversation.messages]
    };
  }

  async add(id: string, message: Message): Promise<void> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }

    conversation.messages.push(message);
    conversation.updatedAt = new Date();
  }

  async update(id: string, messages: Message[]): Promise<void> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }

    conversation.messages = [...messages];
    conversation.updatedAt = new Date();
  }

  async delete(id: string): Promise<void> {
    if (!this.conversations.has(id)) {
      throw new ConversationNotFoundError(id);
    }
    this.conversations.delete(id);
  }
}
