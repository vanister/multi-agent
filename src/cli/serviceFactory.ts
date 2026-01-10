import { FetchHttpClient } from '../utilities/HttpClient.js';
import { InMemoryConversationRepository } from '../conversation/ConversationRepository.js';
import { InMemoryConversationService } from '../conversation/ConversationService.js';
import { InMemoryToolRegistry } from '../tools/ToolRegistry.js';
import { OllamaLlmService } from '../llm/LlmService.js';
import { fileReadTool } from '../tools/file-ops.js';
import { calculateTool } from '../tools/calculator.js';
import type { AgentServices } from '../agent/agent-types.js';
import type { Tool } from '../tools/tool-types.js';
import { OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT_MS } from '../config.js';

export type ServiceFactoryOptions = {
  conversationId: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  tools?: Tool[];
};

export function createServices({
  conversationId,
  model = OLLAMA_MODEL,
  baseUrl = OLLAMA_BASE_URL,
  timeoutMs = OLLAMA_TIMEOUT_MS,
  tools
}: ServiceFactoryOptions): AgentServices {
  const httpClient = new FetchHttpClient();
  const repository = new InMemoryConversationRepository();
  const conversationService = new InMemoryConversationService(conversationId, repository);
  const llmService = new OllamaLlmService(httpClient, baseUrl, model, timeoutMs);
  const toolRegistry = new InMemoryToolRegistry();

  // Register tools - use provided tools or default built-in tools
  const toolsToRegister = tools || [fileReadTool, calculateTool];
  toolsToRegister.forEach((tool) => toolRegistry.register(tool));

  return {
    llm: llmService,
    conversation: conversationService,
    tools: toolRegistry
  };
}
