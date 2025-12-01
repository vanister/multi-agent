import type { Message } from "../llm/llm-types.js";
import type { Conversation } from "./conversation-types.js";

export interface ConversationRepository {
  create(id: string, conversation: Conversation): Promise<void>;
  get(id: string): Promise<Conversation | null>;
  add(id: string, message: Message): Promise<void>;
  update(id: string, messages: Message[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export class InMemoryConversationRepository implements ConversationRepository {
  private conversations: Map<string, Conversation> = new Map();

  async create(id: string, conversation: Conversation): Promise<void> {
    this.conversations.set(id, conversation);
  }

  async get(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) ?? null;
  }

  async add(id: string, message: Message): Promise<void> {
    const conversation = this.conversations.get(id)!;
    conversation.messages.push(message);
    conversation.updatedAt = new Date();
  }

  async update(id: string, messages: Message[]): Promise<void> {
    const conversation = this.conversations.get(id)!;
    conversation.messages = messages;
    conversation.updatedAt = new Date();
  }

  async delete(id: string): Promise<void> {
    this.conversations.delete(id);
  }
}
