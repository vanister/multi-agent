import { randomUUID } from 'node:crypto';
import { runAgent } from '../agent/core.js';
import { buildSystemPrompt } from '../context/prompts.js';
import { createServices } from './serviceFactory.js';
import { formatResult, formatError } from './formatters.js';
import type { AgentConfig } from '../agent/agent-types.js';
import {
  MAX_AGENT_ITERATIONS,
  AGENT_CONTEXT_LIMIT_THRESHOLD,
  AGENT_MAX_TOKENS
} from '../config.js';
import type { AskCommandOptions } from './cli-types.js';

export async function askAgent(prompt: string, options: AskCommandOptions): Promise<void> {
  try {
    const conversationId = randomUUID();
    const services = createServices({
      conversationId,
      model: options.model
    });

    const tools = services.tools.list();
    const systemPrompt = buildSystemPrompt(tools);

    const config: AgentConfig = {
      maxIterations: options.maxIterations || MAX_AGENT_ITERATIONS,
      contextLimitThreshold: AGENT_CONTEXT_LIMIT_THRESHOLD,
      maxTokens: AGENT_MAX_TOKENS
    };

    const result = await runAgent(prompt, systemPrompt, services, config);
    const formattedResult = formatResult(result, options.showMetrics || false);

    // todo - take in a logger to avoid using console directly
    console.log(formattedResult);

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    const formattedError = formatError(error, options.verbose || false);

    // todo - take in a logger to avoid using console directly
    console.error(formattedError);
    process.exit(1);
  }
}
