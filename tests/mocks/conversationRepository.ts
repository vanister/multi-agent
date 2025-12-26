import { vi } from 'vitest';
import type { ConversationRepository } from '../../src/conversation/ConversationRepository.js';
import type { Conversation } from '../../src/conversation/schemas.js';
import type { Message } from '../../src/llm/schemas.js';
import { ConversationNotFoundError } from '../../src/conversation/ConversationErrors.js';

/**
 * Creates a mocked ConversationRepository backed by a Map for testing
 */
export function createMockConversationRepository(
  conversationStore: Map<string, Conversation>
): ConversationRepository {
  return {
    create: vi.fn(async (id: string, conversation: Conversation) => {
      conversationStore.set(id, conversation);
    }),
    get: vi.fn(async (id: string) => {
      return conversationStore.get(id) ?? null;
    }),
    add: vi.fn(async (id: string, message: Message) => {
      const conversation = conversationStore.get(id);
      if (!conversation) {
        throw new ConversationNotFoundError(id);
      }
      conversation.messages.push(message);
      conversation.updatedAt = new Date();
    }),
    update: vi.fn(async (id: string, messages: Message[]) => {
      const conversation = conversationStore.get(id);
      if (!conversation) {
        throw new ConversationNotFoundError(id);
      }
      conversation.messages = messages;
      conversation.updatedAt = new Date();
    }),
    delete: vi.fn(async (id: string) => {
      conversationStore.delete(id);
    })
  };
}
