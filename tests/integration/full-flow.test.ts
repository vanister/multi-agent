import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildContext } from '../../src/context/builder.js';
import { buildSystemPrompt } from '../../src/context/prompts.js';
import { OllamaLlmService } from '../../src/llm/LlmService.js';
import { parseJson } from '../../src/agent/parser.js';
import { validateResponse } from '../../src/agent/validator.js';
import { InMemoryToolRegistry } from '../../src/tools/ToolRegistry.js';
import { InMemoryConversationService } from '../../src/conversation/ConversationService.js';
import type { Conversation } from '../../src/conversation/schemas.js';
import type { Message } from '../../src/llm/schemas.js';
import { createMockHttpClient } from '../mocks/httpClient.js';
import { createMockConversationRepository } from '../mocks/conversationRepository.js';
import { createMockToolRegistry } from '../mocks/toolRegistry.js';
import { echoTool, failTool } from '../fixtures/tools.js';

describe('Full Message Flow Integration', () => {
  const conversationId = 'test-flow';
  const conversationStore = new Map<string, Conversation>();
  const mockHttpClient = createMockHttpClient();
  const mockRepository = createMockConversationRepository(conversationStore);

  const llmService = new OllamaLlmService(
    mockHttpClient,
    'http://localhost:11434',
    'qwen2.5-coder:3b',
    30000
  );

  let toolRegistry: InMemoryToolRegistry;
  const conversationService = new InMemoryConversationService(conversationId, mockRepository);

  beforeEach(() => {
    conversationStore.clear();
    toolRegistry = createMockToolRegistry([echoTool]);
    vi.clearAllMocks();
  });

  describe('tool call flow', () => {
    it('should process complete tool call flow end-to-end', async () => {
      // Setup conversation
      await conversationService.create();

      // Step 1: Build context with system prompt and user input
      const systemPrompt = buildSystemPrompt(toolRegistry.list());
      const systemMessage: Message = { role: 'system', content: systemPrompt };
      const history = [systemMessage];
      const userInput = 'Please echo "hello world"';
      const messages = buildContext(userInput, history);

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(systemMessage);
      expect(messages[1]).toEqual({ role: 'user', content: userInput });

      // Step 2: Mock LLM returns tool call
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '```json\n{"tool": "echo", "args": {"message": "hello world"}}\n```'
          }
        }
      });

      const llmResult = await llmService.chat(messages);

      // Step 3: Parse and validate response
      const parsed = parseJson(llmResult.content);
      const validated = validateResponse(parsed);

      expect(validated.success).toBe(true);
      if (validated.success && 'tool' in validated.data) {
        expect(validated.data.tool).toBe('echo');

        // Step 4: Execute tool
        const toolResult = await toolRegistry.execute({
          name: validated.data.tool,
          args: validated.data.args
        });

        expect(toolResult.success).toBe(true);
        expect(toolResult.data).toBe('hello world');

        // Step 5: Add messages to conversation
        await conversationService.add(messages[1]); // User message
        await conversationService.add({
          role: 'assistant',
          content: JSON.stringify(toolResult)
        });

        const conversationMessages = await conversationService.getAll();
        expect(conversationMessages).toHaveLength(2);
        expect(conversationMessages[0]).toEqual(messages[1]);
      }
    });
  });

  describe('completion flow', () => {
    it('should process complete completion flow end-to-end', async () => {
      // Setup conversation
      await conversationService.create();

      // Step 1: Build context
      const systemPrompt = buildSystemPrompt(toolRegistry.list());
      const history = [{ role: 'system' as const, content: systemPrompt }];
      const userInput = 'What is 2+2?';
      const messages = buildContext(userInput, history);

      // Step 2: Mock LLM returns completion
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '```json\n{"done": true, "response": "The answer is 4"}\n```'
          }
        }
      });

      const llmResult = await llmService.chat(messages);

      // Step 3: Parse and validate response
      const parsed = parseJson(llmResult.content);
      const validated = validateResponse(parsed);

      expect(validated.success).toBe(true);
      if (validated.success && 'done' in validated.data) {
        expect(validated.data.done).toBe(true);
        expect(validated.data.response).toBe('The answer is 4');

        // Step 4: Add messages to conversation
        await conversationService.add(messages[1]);
        await conversationService.add({
          role: 'assistant',
          content: validated.data.response
        });

        const conversationMessages = await conversationService.getAll();
        expect(conversationMessages).toHaveLength(2);
        expect(conversationMessages[1].content).toBe('The answer is 4');
      }
    });
  });

  describe('multi-turn conversation with tool', () => {
    it('should handle multi-turn conversation flow', async () => {
      // Setup conversation with existing history
      await conversationService.create();
      await conversationService.add({ role: 'user', content: 'Hello' });
      await conversationService.add({ role: 'assistant', content: 'Hi there!' });

      // Get existing history
      const existingHistory = await conversationService.getAll();
      expect(existingHistory).toHaveLength(2);

      // New user input
      const systemPrompt = buildSystemPrompt(toolRegistry.list());
      const fullHistory = [{ role: 'system' as const, content: systemPrompt }, ...existingHistory];
      const newInput = 'Echo my greeting';
      const messages = buildContext(newInput, fullHistory);

      expect(messages).toHaveLength(4); // system + 2 history + new user

      // Mock LLM tool call
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"tool": "echo", "args": {"message": "Hi there!"}}'
          }
        }
      });

      const llmResult = await llmService.chat(messages);
      const parsed = parseJson(llmResult.content);
      const validated = validateResponse(parsed);

      if (validated.success && 'tool' in validated.data) {
        const toolResult = await toolRegistry.execute({
          name: validated.data.tool,
          args: validated.data.args
        });

        expect(toolResult.success).toBe(true);
        expect(toolResult.data).toBe('Hi there!');

        // Add to conversation
        await conversationService.add(messages[messages.length - 1]); // New user message
        await conversationService.add({
          role: 'assistant',
          content: JSON.stringify(toolResult)
        });

        const finalMessages = await conversationService.getAll();
        expect(finalMessages).toHaveLength(4); // Original 2 + new user + assistant
      }
    });
  });

  describe('error handling in flow', () => {
    it('should handle invalid LLM response gracefully', async () => {
      await conversationService.create();

      const messages = buildContext('Test', []);

      // Mock LLM returns invalid JSON
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          message: {
            content: 'This is not JSON'
          }
        }
      });

      const llmResult = await llmService.chat(messages);

      expect(() => parseJson(llmResult.content)).toThrow();
    });

    it('should handle tool execution failure', async () => {
      await conversationService.create();

      toolRegistry.register(failTool);

      const messages = buildContext('Test fail tool', []);

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"tool": "fail_tool", "args": {}}'
          }
        }
      });

      const llmResult = await llmService.chat(messages);
      const parsed = parseJson(llmResult.content);
      const validated = validateResponse(parsed);

      if (validated.success && 'tool' in validated.data) {
        const toolResult = await toolRegistry.execute({
          name: validated.data.tool,
          args: validated.data.args
        });

        expect(toolResult.success).toBe(false);
        expect(toolResult.error).toBe('Tool failed');
      }
    });
  });
});
