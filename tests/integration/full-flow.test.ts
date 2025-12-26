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
  const conversationService = new InMemoryConversationService(conversationId, mockRepository);

  const llmService = new OllamaLlmService(
    mockHttpClient,
    'http://localhost:11434',
    'qwen2.5-coder:3b',
    30000
  );

  let toolRegistry: InMemoryToolRegistry;

  beforeEach(() => {
    conversationStore.clear();
    toolRegistry = createMockToolRegistry([echoTool]);
    vi.clearAllMocks();
  });

  describe('complete agent loop', () => {
    it('should handle full agent turn: user input → tool call → tool result → completion', async () => {
      // Setup conversation with system prompt
      await conversationService.create();

      const systemPrompt = buildSystemPrompt(toolRegistry.list());
      const systemMessage: Message = { role: 'system', content: systemPrompt };
      await conversationService.add(systemMessage);

      // Step 1: Add user message
      const userInput = 'Echo "test message"';
      const userMessage: Message = { role: 'user', content: userInput };
      await conversationService.add(userMessage);

      // Get all messages for LLM (includes system prompt)
      const messages = await conversationService.getAllMessages();
      expect(messages).toHaveLength(2); // system + user

      // Step 2: Mock LLM responds with tool call
      vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"tool": "echo", "args": {"message": "test message"}}'
          }
        }
      });

      const toolCallResult = await llmService.chat(messages);
      const parsedToolCall = parseJson(toolCallResult.content);
      const toolCallValidation = validateResponse(parsedToolCall);

      expect(toolCallValidation.success).toBe(true);
      if (!toolCallValidation.success || !('tool' in toolCallValidation.data)) {
        expect.fail('Expected tool call response');
      }

      expect(toolCallValidation.data.tool).toBe('echo');

      // Step 3: Execute tool
      const toolResult = await toolRegistry.execute({
        name: toolCallValidation.data.tool,
        args: toolCallValidation.data.args
      });

      expect(toolResult.success).toBe(true);
      expect(toolResult.data).toBe('test message');

      // Add tool result to conversation
      const toolResultMessage: Message = {
        role: 'assistant',
        content: JSON.stringify({ tool_result: toolResult })
      };
      await conversationService.add(toolResultMessage);

      // Step 4: Get updated conversation for second LLM call
      const messagesWithToolResult = await conversationService.getAllMessages();
      expect(messagesWithToolResult).toHaveLength(3); // system + user + tool result

      // Step 5: Mock LLM responds with completion
      vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"done": true, "response": "I echoed your message: test message"}'
          }
        }
      });

      const completionResult = await llmService.chat(messagesWithToolResult);
      const parsedCompletion = parseJson(completionResult.content);
      const completionValidation = validateResponse(parsedCompletion);

      expect(completionValidation.success).toBe(true);
      if (!completionValidation.success || !('done' in completionValidation.data)) {
        expect.fail('Expected completion response');
      }

      expect(completionValidation.data.done).toBe(true);
      expect(completionValidation.data.response).toContain('echoed your message');

      // Add final response to conversation
      await conversationService.add({
        role: 'assistant',
        content: completionValidation.data.response
      });

      // Verify final conversation state (includes system message)
      const finalMessages = await conversationService.getAllMessages();
      expect(finalMessages).toHaveLength(4); // system + user + tool result + final response
      expect(finalMessages[0].role).toBe('system');
      expect(finalMessages[1].role).toBe('user');
      expect(finalMessages[2].role).toBe('assistant');
      expect(finalMessages[3].role).toBe('assistant');
    });
  });

  describe('tool call flow', () => {
    it('should process complete tool call flow end-to-end', async () => {
      // Setup conversation with system prompt
      await conversationService.create();

      const systemPrompt = buildSystemPrompt(toolRegistry.list());
      const systemMessage: Message = { role: 'system', content: systemPrompt };
      await conversationService.add(systemMessage);

      // Add user message
      const userInput = 'Please echo "hello world"';
      const userMessage: Message = { role: 'user', content: userInput };
      await conversationService.add(userMessage);

      // Get messages for LLM
      const messages = await conversationService.getAllMessages();
      expect(messages).toHaveLength(2);

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
      if (!validated.success || !('tool' in validated.data)) {
        expect.fail('Expected tool call response');
      }

      expect(validated.data.tool).toBe('echo');

      // Step 4: Execute tool
      const toolResult = await toolRegistry.execute({
        name: validated.data.tool,
        args: validated.data.args
      });

      expect(toolResult.success).toBe(true);
      expect(toolResult.data).toBe('hello world');

      // Step 5: Add tool result to conversation
      await conversationService.add({
        role: 'assistant',
        content: JSON.stringify(toolResult)
      });

      const conversationMessages = await conversationService.getAllMessages();
      expect(conversationMessages).toHaveLength(3); // system + user + assistant
    });
  });

  describe('completion flow', () => {
    it('should process complete completion flow end-to-end', async () => {
      // Setup conversation with system prompt
      await conversationService.create();

      const systemPrompt = buildSystemPrompt(toolRegistry.list());
      const systemMessage: Message = { role: 'system', content: systemPrompt };
      await conversationService.add(systemMessage);

      // Add user message
      const userInput = 'What is 2+2?';
      const userMessage: Message = { role: 'user', content: userInput };
      await conversationService.add(userMessage);

      // Get messages for LLM
      const messages = await conversationService.getAllMessages();

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
      if (!validated.success || !('done' in validated.data)) {
        expect.fail('Expected completion response');
      }

      expect(validated.data.done).toBe(true);
      expect(validated.data.response).toBe('The answer is 4');

      // Step 4: Add completion to conversation
      await conversationService.add({
        role: 'assistant',
        content: validated.data.response
      });

      const conversationMessages = await conversationService.getAllMessages();
      expect(conversationMessages).toHaveLength(3); // system + user + assistant
      expect(conversationMessages[2].content).toBe('The answer is 4');
    });
  });

  describe('multi-turn conversation with tool', () => {
    it('should handle multi-turn conversation flow', async () => {
      // Setup conversation with system prompt and existing history
      await conversationService.create();

      const systemPrompt = buildSystemPrompt(toolRegistry.list());
      const systemMessage: Message = { role: 'system', content: systemPrompt };
      await conversationService.add(systemMessage);
      await conversationService.add({ role: 'user', content: 'Hello' });
      await conversationService.add({ role: 'assistant', content: 'Hi there!' });

      // Get existing history
      const existingHistory = await conversationService.getAllMessages();
      expect(existingHistory).toHaveLength(3); // system + 2 messages

      // Add new user input
      const newInput = 'Echo my greeting';
      await conversationService.add({ role: 'user', content: newInput });

      // Get all messages for LLM
      const messages = await conversationService.getAllMessages();
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

      expect(validated.success).toBe(true);
      if (!validated.success || !('tool' in validated.data)) {
        expect.fail('Expected tool call response');
      }

      const toolResult = await toolRegistry.execute({
        name: validated.data.tool,
        args: validated.data.args
      });

      expect(toolResult.success).toBe(true);
      expect(toolResult.data).toBe('Hi there!');

      // Add tool result to conversation
      await conversationService.add({
        role: 'assistant',
        content: JSON.stringify(toolResult)
      });

      const finalMessages = await conversationService.getAllMessages();
      expect(finalMessages).toHaveLength(5); // system + 2 history + new user + assistant
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

      const systemPrompt = buildSystemPrompt(toolRegistry.list());
      await conversationService.add({ role: 'system', content: systemPrompt });
      await conversationService.add({ role: 'user', content: 'Test fail tool' });

      toolRegistry.register(failTool);

      const messages = await conversationService.getAllMessages();

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

      expect(validated.success).toBe(true);
      if (!validated.success || !('tool' in validated.data)) {
        expect.fail('Expected tool call response');
      }

      const toolResult = await toolRegistry.execute({
        name: validated.data.tool,
        args: validated.data.args
      });

      expect(toolResult.success).toBe(false);
      expect(toolResult.error).toBe('Tool failed');
    });
  });
});
