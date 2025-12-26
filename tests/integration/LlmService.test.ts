import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaLlmService } from '../../src/llm/LlmService.js';
import { SIMPLE_CHAT_RESPONSE, TOOL_CALL_RESPONSE } from '../fixtures/llmResponses.js';
import { LlmError, OllamaApiError } from '../../src/llm/LlmErrors.js';
import type { Message } from '../../src/llm/schemas.js';
import type { HttpClient } from '../../src/utilities/HttpClient.js';

describe('LlmService Integration', () => {
  const mockHttpClient: HttpClient = {
    post: vi.fn()
  };

  const llmService = new OllamaLlmService(
    mockHttpClient,
    'http://localhost:11434',
    'qwen2.5-coder:3b',
    30000
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('chat with single message', () => {
    it('should format request correctly and extract content from response', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: SIMPLE_CHAT_RESPONSE
      });

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      const result = await llmService.chat(messages);

      expect(result.content).toBe('Hello! How can I help you today?');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        {
          model: 'qwen2.5-coder:3b',
          messages,
          stream: false
        },
        { timeoutMs: 30000 }
      );
    });
  });

  describe('chat with multiple messages', () => {
    it('should handle multi-turn conversation', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: SIMPLE_CHAT_RESPONSE
      });

      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '4' },
        { role: 'user', content: 'Thanks!' }
      ];

      const result = await llmService.chat(messages);

      expect(result.content).toBe('Hello! How can I help you today?');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        {
          model: 'qwen2.5-coder:3b',
          messages,
          stream: false
        },
        { timeoutMs: 30000 }
      );
    });
  });

  describe('chat with tool call response', () => {
    it('should extract markdown-wrapped JSON from response', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: TOOL_CALL_RESPONSE
      });

      const messages: Message[] = [{ role: 'user', content: 'Read the file test.txt' }];

      const result = await llmService.chat(messages);

      expect(result.content).toContain('file_read');
      expect(result.content).toContain('test.txt');
    });
  });

  describe('error handling', () => {
    it('should throw OllamaApiError on HTTP 404 response', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: false,
        status: 404,
        data: { error: 'Model not found' }
      });

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      await expect(llmService.chat(messages)).rejects.toThrow(OllamaApiError);
      await expect(llmService.chat(messages)).rejects.toThrow('404');
    });

    it('should throw OllamaApiError on HTTP 500 response', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: { error: 'Internal server error' }
      });

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      await expect(llmService.chat(messages)).rejects.toThrow(OllamaApiError);
      await expect(llmService.chat(messages)).rejects.toThrow('500');
    });

    it('should throw LlmError when response is missing message field', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {}
      });

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      await expect(llmService.chat(messages)).rejects.toThrow(LlmError);
      await expect(llmService.chat(messages)).rejects.toThrow('missing message');
    });

    it('should throw LlmError when message field is null', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: { message: null }
      });

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      await expect(llmService.chat(messages)).rejects.toThrow(LlmError);
      await expect(llmService.chat(messages)).rejects.toThrow('missing message');
    });

    it('should wrap network errors in LlmError', async () => {
      const networkError = new Error('ECONNREFUSED');
      vi.mocked(mockHttpClient.post).mockRejectedValue(networkError);

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      await expect(llmService.chat(messages)).rejects.toThrow(LlmError);
      await expect(llmService.chat(messages)).rejects.toThrow('LLM request failed');
      await expect(llmService.chat(messages)).rejects.toThrow('ECONNREFUSED');
    });
  });
});
