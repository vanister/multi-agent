import { randomUUID } from 'node:crypto';
import { buildSystemPrompt } from '../context/prompts.js';
import { createServices } from './serviceFactory.js';
import type { AgentConfig } from '../agent/agent-types.js';
import {
  MAX_AGENT_ITERATIONS,
  AGENT_CONTEXT_LIMIT_THRESHOLD,
  AGENT_MAX_TOKENS,
  AGENT_SYSTEM_ROLE
} from '../config.js';
import type { InitializeOptions, InitializedServices } from './cli-types.js';

export function initializeAgentServices(options: InitializeOptions): InitializedServices {
  const conversationId = options.conversationId || randomUUID();
  const services = createServices({
    conversationId,
    model: options.model
  });

  const tools = services.tools.list();
  const agentRole = options.agentRole || AGENT_SYSTEM_ROLE;
  const systemPrompt = buildSystemPrompt(tools, agentRole);

  const config: AgentConfig = {
    maxIterations: options.maxIterations || MAX_AGENT_ITERATIONS,
    contextLimitThreshold: AGENT_CONTEXT_LIMIT_THRESHOLD,
    maxTokens: AGENT_MAX_TOKENS
  };

  return { conversationId, services, systemPrompt, config };
}
