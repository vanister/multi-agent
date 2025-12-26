import type { LlmService } from '../llm/LlmService.js';
import type { ConversationService } from '../conversation/ConversationService.js';
import type { ToolRegistry } from '../tools/ToolRegistry.js';

export type AgentConfig = {
  maxIterations?: number;
  contextLimitThreshold?: number;
  maxTokens?: number;
};

export type AgentServices = {
  llm: LlmService;
  conversation: ConversationService;
  tools: ToolRegistry;
};

export type AgentMetrics = {
  iterations: number;
  toolCalls: number;
  parseErrors: number;
  toolFailures: number;
  contextLimitReached: boolean;
};

export type AgentResult = {
  success: boolean;
  response?: string;
  error?: string;
  metrics: AgentMetrics;
};
