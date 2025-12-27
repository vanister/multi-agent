import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runAgent } from '../../src/agent/core.js';
import { OllamaLlmService } from '../../src/llm/LlmService.js';
import { InMemoryConversationService } from '../../src/conversation/ConversationService.js';
import { buildSystemPrompt } from '../../src/context/prompts.js';
import type { Conversation } from '../../src/conversation/schemas.js';
import type { AgentServices, AgentConfig } from '../../src/agent/agent-types.js';
import { createMockHttpClient } from '../mocks/httpClient.js';
import { createMockConversationRepository } from '../mocks/conversationRepository.js';
import { createMockToolRegistry } from '../mocks/toolRegistry.js';
import { echoTool, calculateTool, failTool } from '../fixtures/tools.js';

describe('runAgent Integration Tests', () => {
  const conversationId = 'test-agent';
  const conversationStore = new Map<string, Conversation>();
  const mockHttpClient = createMockHttpClient();
  const mockRepository = createMockConversationRepository(conversationStore);

  const toolRegistry = createMockToolRegistry([echoTool, calculateTool, failTool]);
  const systemPrompt = buildSystemPrompt(toolRegistry.list());

  const services: AgentServices = {
    llm: new OllamaLlmService(mockHttpClient, 'http://localhost:11434', 'qwen2.5-coder:3b', 30000),
    conversation: new InMemoryConversationService(conversationId, mockRepository),
    tools: toolRegistry
  };

  const config: Partial<AgentConfig> = {
    maxIterations: 10,
    contextLimitThreshold: 0.8,
    maxTokens: 32768
  };

  beforeEach(() => {
    conversationStore.clear();
    vi.clearAllMocks();
  });

  describe('successful completions', () => {
    it('should complete with single LLM response without tool calls', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"done": true, "response": "Hello, I can help you!"}'
          }
        }
      });

      const result = await runAgent('Say hello', systemPrompt, services, config);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Hello, I can help you!');
      expect(result.metrics.iterations).toBe(1);
      expect(result.metrics.toolCalls).toBe(0);
      expect(result.metrics.parseErrors).toBe(0);
    });

    it('should complete with single tool call', async () => {
      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "echo", "args": {"message": "test"}}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"done": true, "response": "Echoed: test"}'
            }
          }
        });

      const result = await runAgent('Echo test', systemPrompt, services, config);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Echoed: test');
      expect(result.metrics.iterations).toBe(2);
      expect(result.metrics.toolCalls).toBe(1);
      expect(result.metrics.parseErrors).toBe(0);
      expect(result.metrics.toolFailures).toBe(0);
    });

    it('should complete with multiple tool calls', async () => {
      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "calculate", "args": {"a": 5, "b": 3, "operation": "add"}}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "echo", "args": {"message": "result is 8"}}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"done": true, "response": "Calculation complete"}'
            }
          }
        });

      const result = await runAgent(
        'Calculate 5 + 3 and echo result',
        systemPrompt,
        services,
        config
      );

      expect(result.success).toBe(true);
      expect(result.response).toBe('Calculation complete');
      expect(result.metrics.iterations).toBe(3);
      expect(result.metrics.toolCalls).toBe(2);
      expect(result.metrics.parseErrors).toBe(0);
    });
  });

  describe('error recovery', () => {
    it('should recover from parse error with retry', async () => {
      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: 'invalid json response'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"done": true, "response": "Fixed the format"}'
            }
          }
        });

      const result = await runAgent('Test parse error', systemPrompt, services, config);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Fixed the format');
      expect(result.metrics.iterations).toBe(2);
      expect(result.metrics.parseErrors).toBe(1);
    });

    it('should recover from validation error with retry', async () => {
      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "echo"}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "echo", "args": {"message": "corrected"}}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"done": true, "response": "Completed"}'
            }
          }
        });

      const result = await runAgent('Test validation error', systemPrompt, services, config);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Completed');
      expect(result.metrics.iterations).toBe(3);
      expect(result.metrics.parseErrors).toBe(1);
    });

    it('should continue after tool execution failure', async () => {
      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "fail_tool", "args": {}}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"done": true, "response": "Handled tool failure"}'
            }
          }
        });

      const result = await runAgent('Test tool failure', systemPrompt, services, config);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Handled tool failure');
      expect(result.metrics.iterations).toBe(2);
      expect(result.metrics.toolCalls).toBe(1);
      expect(result.metrics.toolFailures).toBe(1);
    });
  });

  describe('iteration limits', () => {
    it('should fail when max iterations exceeded', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"tool": "echo", "args": {"message": "looping"}}'
          }
        }
      });

      const result = await runAgent('Loop forever', systemPrompt, services, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Max iterations');
      expect(result.error).toContain('10');
      expect(result.metrics.iterations).toBe(10);
      expect(result.metrics.toolCalls).toBe(10);
    });

    it('should fail when context limit reached', async () => {
      // Set very low max tokens to trigger limit
      const limitedConfig = { ...config, maxTokens: 100 };

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"tool": "echo", "args": {"message": "adding tokens"}}'
          }
        }
      });

      const result = await runAgent('Fill up context', systemPrompt, services, limitedConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context limit reached');
      expect(result.metrics.contextLimitReached).toBe(true);
      expect(result.metrics.iterations).toBeGreaterThan(0);
      expect(result.metrics.iterations).toBeLessThan(10);
    });
  });

  describe('metrics tracking', () => {
    it('should accurately track all metrics throughout execution', async () => {
      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: 'invalid json'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "invalid_tool_name"}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "fail_tool", "args": {}}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"tool": "echo", "args": {"message": "success"}}'
            }
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            message: {
              content: '{"done": true, "response": "All done"}'
            }
          }
        });

      const result = await runAgent('Complex flow with errors', systemPrompt, services, config);

      expect(result.success).toBe(true);
      expect(result.metrics.iterations).toBe(5);
      expect(result.metrics.parseErrors).toBe(2);
      expect(result.metrics.toolCalls).toBe(2);
      expect(result.metrics.toolFailures).toBe(1);
      expect(result.metrics.contextLimitReached).toBe(false);
    });
  });

  describe('input validation', () => {
    it('should fail with empty user input', async () => {
      const result = await runAgent('', systemPrompt, services, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User input cannot be empty');
      expect(result.metrics.iterations).toBe(0);
    });

    it('should fail with whitespace-only user input', async () => {
      const result = await runAgent('   \n  \t  ', systemPrompt, services, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User input cannot be empty');
      expect(result.metrics.iterations).toBe(0);
    });

    it('should fail with empty system prompt', async () => {
      const result = await runAgent('Test', '', services, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('System prompt cannot be empty');
      expect(result.metrics.iterations).toBe(0);
    });

    it('should fail with whitespace-only system prompt', async () => {
      const result = await runAgent('Test', '   \n  \t  ', services, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('System prompt cannot be empty');
      expect(result.metrics.iterations).toBe(0);
    });
  });

  describe('conversation management', () => {
    it('should initialize conversation with system prompt on first run', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"done": true, "response": "First run"}'
          }
        }
      });

      await runAgent('First message', systemPrompt, services, config);

      const messages = await services.conversation.getAllMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('You are a coding assistant');
    });

    it('should reuse existing conversation on subsequent runs', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          message: {
            content: '{"done": true, "response": "Done"}'
          }
        }
      });

      await runAgent('First', systemPrompt, services, config);
      const messagesAfterFirst = await services.conversation.getAllMessages();
      const firstCount = messagesAfterFirst.length;

      await runAgent('Second', systemPrompt, services, config);
      const messagesAfterSecond = await services.conversation.getAllMessages();

      expect(messagesAfterSecond.length).toBeGreaterThan(firstCount);
      expect(messagesAfterSecond[0]).toBe(messagesAfterFirst[0]);
    });
  });

  describe('edge cases', () => {
    it('should handle LLM service throwing error', async () => {
      vi.mocked(mockHttpClient.post).mockRejectedValueOnce(new Error('Network error'));

      const result = await runAgent('Test error', systemPrompt, services, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent error');
      expect(result.error).toContain('Network error');
    });

    it('should handle conversation service throwing error', async () => {
      // Create a service that throws on getAllMessages
      const throwingConversation = {
        create: vi.fn().mockResolvedValue(undefined),
        getAllMessages: vi.fn().mockRejectedValueOnce(new Error('Storage error')),
        add: vi.fn().mockResolvedValue(undefined),
        estimateTokens: vi.fn().mockResolvedValue(100)
      };

      const errorServices = { ...services, conversation: throwingConversation as any };

      const result = await runAgent('Test', systemPrompt, errorServices, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent error');
      expect(result.error).toContain('Storage error');
    });
  });
});
