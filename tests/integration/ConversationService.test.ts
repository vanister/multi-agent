import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryConversationService } from '../../src/conversation/ConversationService.js';
import {
  ConversationAlreadyExistsError,
  ConversationNotFoundError,
  ConversationDataCorruptedError
} from '../../src/conversation/ConversationErrors.js';
import type { ConversationRepository } from '../../src/conversation/ConversationRepository.js';
import type { Message } from '../../src/llm/schemas.js';
import type { Conversation } from '../../src/conversation/schemas.js';

describe('ConversationService Integration', () => {
  const conversationId = 'test-conversation-id';
  const conversationStore = new Map<string, Conversation>();

  const mockRepository: ConversationRepository = {
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

  const conversationService = new InMemoryConversationService(conversationId, mockRepository);

  beforeEach(() => {
    conversationStore.clear();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create new conversation with empty messages array', async () => {
      await conversationService.create();

      expect(mockRepository.create).toHaveBeenCalledOnce();
      const conversation = conversationStore.get(conversationId);
      expect(conversation).toBeDefined();
      expect(conversation?.id).toBe(conversationId);
      expect(conversation?.messages).toEqual([]);
      expect(conversation?.createdAt).toBeInstanceOf(Date);
      expect(conversation?.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw ConversationAlreadyExistsError if conversation exists', async () => {
      await conversationService.create();

      await expect(conversationService.create()).rejects.toThrow(ConversationAlreadyExistsError);
      await expect(conversationService.create()).rejects.toThrow(conversationId);
    });
  });

  describe('add', () => {
    it('should add message to existing conversation', async () => {
      await conversationService.create();

      const message: Message = { role: 'user', content: 'Hello' };
      await conversationService.add(message);

      expect(mockRepository.add).toHaveBeenCalledWith(conversationId, message);
      const conversation = conversationStore.get(conversationId);
      expect(conversation?.messages).toHaveLength(1);
      expect(conversation?.messages[0]).toEqual(message);
    });

    it('should throw ConversationNotFoundError when conversation does not exist', async () => {
      const message: Message = { role: 'user', content: 'Hello' };

      await expect(conversationService.add(message)).rejects.toThrow(ConversationNotFoundError);
      await expect(conversationService.add(message)).rejects.toThrow(conversationId);
    });

    it('should validate message schema before adding', async () => {
      await conversationService.create();

      const invalidMessage = { role: 'invalid', content: 'test' } as any;

      await expect(conversationService.add(invalidMessage)).rejects.toThrow();
    });
  });

  describe('getAll', () => {
    it('should retrieve messages from existing conversation', async () => {
      await conversationService.create();

      const message1: Message = { role: 'user', content: 'Hello' };
      const message2: Message = { role: 'assistant', content: 'Hi there' };

      await conversationService.add(message1);
      await conversationService.add(message2);

      const messages = await conversationService.getAll();

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(message1);
      expect(messages[1]).toEqual(message2);
    });

    it('should return empty array when conversation does not exist', async () => {
      const messages = await conversationService.getAll();

      expect(messages).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all messages from conversation', async () => {
      await conversationService.create();

      const message1: Message = { role: 'user', content: 'Hello' };
      const message2: Message = { role: 'assistant', content: 'Hi there' };

      await conversationService.add(message1);
      await conversationService.add(message2);
      await conversationService.clear();

      expect(mockRepository.update).toHaveBeenCalledWith(conversationId, []);
      const conversation = conversationStore.get(conversationId);
      expect(conversation?.messages).toEqual([]);
      expect(conversation?.id).toBe(conversationId);
    });

    it('should throw ConversationNotFoundError when conversation does not exist', async () => {
      await expect(conversationService.clear()).rejects.toThrow(ConversationNotFoundError);
      await expect(conversationService.clear()).rejects.toThrow(conversationId);
    });
  });

  describe('estimateTokens', () => {
    it('should calculate tokens using chars/4 heuristic', async () => {
      await conversationService.create();

      const message1: Message = { role: 'user', content: 'Hello' }; // 5 chars
      const message2: Message = { role: 'assistant', content: 'Hi there!' }; // 9 chars

      await conversationService.add(message1);
      await conversationService.add(message2);

      const tokens = await conversationService.estimateTokens();

      // Total: 14 chars / 4 = 3.5 → Math.ceil = 4
      expect(tokens).toBe(4);
    });

    it('should return 0 tokens for empty conversation', async () => {
      await conversationService.create();

      const tokens = await conversationService.estimateTokens();

      expect(tokens).toBe(0);
    });

    it('should sum all message content lengths', async () => {
      await conversationService.create();

      const message1: Message = { role: 'user', content: 'x'.repeat(100) };
      const message2: Message = { role: 'assistant', content: 'y'.repeat(200) };

      await conversationService.add(message1);
      await conversationService.add(message2);

      const tokens = await conversationService.estimateTokens();

      // Total: 300 chars / 4 = 75
      expect(tokens).toBe(75);
    });
  });

  describe('full lifecycle flow', () => {
    it('should handle complete conversation lifecycle', async () => {
      // Create
      await conversationService.create();
      let messages = await conversationService.getAll();
      expect(messages).toEqual([]);

      // Add messages
      const message1: Message = { role: 'user', content: 'Hello' };
      const message2: Message = { role: 'assistant', content: 'Hi' };
      await conversationService.add(message1);
      await conversationService.add(message2);

      messages = await conversationService.getAll();
      expect(messages).toHaveLength(2);

      // Estimate tokens
      const tokens = await conversationService.estimateTokens();
      expect(tokens).toBeGreaterThan(0);

      // Clear
      await conversationService.clear();
      messages = await conversationService.getAll();
      expect(messages).toEqual([]);

      // Verify conversation still exists
      const conversation = conversationStore.get(conversationId);
      expect(conversation).toBeDefined();
    });
  });

  describe('corrupted data handling', () => {
    it('should throw ConversationDataCorruptedError for invalid conversation structure', async () => {
      // Manually insert corrupted data
      conversationStore.set(conversationId, {
        id: conversationId,
        messages: 'not-an-array' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const message: Message = { role: 'user', content: 'test' };

      await expect(conversationService.add(message)).rejects.toThrow(
        ConversationDataCorruptedError
      );
    });

    it('should throw ConversationDataCorruptedError when getting corrupted data', async () => {
      conversationStore.set(conversationId, {
        id: 123 as any,
        messages: [],
        createdAt: 'invalid-date' as any,
        updatedAt: new Date()
      });

      await expect(conversationService.getAll()).rejects.toThrow(ConversationDataCorruptedError);
    });
  });
});
