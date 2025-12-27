import { parseJson } from './parser.js';
import { validateResponse } from './validator.js';
import type { AgentConfig, AgentServices, AgentResult, AgentMetrics } from './agent-types.js';
import { buildParseErrorMessage, buildValidationErrorMessage } from './agentHelpers.js';
import {
  MAX_AGENT_ITERATIONS,
  AGENT_CONTEXT_LIMIT_THRESHOLD,
  AGENT_MAX_TOKENS
} from '../config.js';

const DEFAULT_AGENT_CONFIG: Partial<AgentConfig> = {
  maxIterations: MAX_AGENT_ITERATIONS,
  contextLimitThreshold: AGENT_CONTEXT_LIMIT_THRESHOLD,
  maxTokens: AGENT_MAX_TOKENS
};

// todo - abstract this out into private and helper functions
export async function runAgent(
  userInput: string,
  services: AgentServices,
  config: AgentConfig
): Promise<AgentResult> {
  const mergedConfig = {
    ...DEFAULT_AGENT_CONFIG,
    ...config
  } as Required<AgentConfig>;

  const { systemPrompt, maxIterations, contextLimitThreshold, maxTokens } = mergedConfig;

  const metrics: AgentMetrics = {
    iterations: 0,
    toolCalls: 0,
    parseErrors: 0,
    toolFailures: 0,
    contextLimitReached: false
  };

  if (!userInput.trim()) {
    return {
      success: false,
      error: 'User input cannot be empty',
      metrics
    };
  }

  if (!systemPrompt.trim()) {
    return {
      success: false,
      error: 'System prompt cannot be empty',
      metrics
    };
  }

  try {
    const messages = await services.conversation.getAllMessages();

    if (messages.length === 0) {
      await services.conversation.create([{ role: 'system', content: systemPrompt }]);
    }

    await services.conversation.add({ role: 'user', content: userInput });

    for (let i = 0; i < maxIterations; i++) {
      metrics.iterations++;

      const estimatedTokens = await services.conversation.estimateTokens();
      if (estimatedTokens > maxTokens * contextLimitThreshold) {
        metrics.contextLimitReached = true;
        return {
          success: false,
          error: `Context limit reached (${estimatedTokens} tokens). Tool calls: ${metrics.toolCalls}, Parse errors: ${metrics.parseErrors}`,
          metrics
        };
      }

      const currentMessages = await services.conversation.getAllMessages();
      const llmResult = await services.llm.chat(currentMessages);

      let parsed: unknown;
      try {
        parsed = parseJson(llmResult.content);
      } catch (error) {
        metrics.parseErrors++;
        const errorMessage = buildParseErrorMessage(error, services.tools);
        await services.conversation.add(errorMessage);
        continue;
      }

      const validated = validateResponse(parsed);

      if (!validated.success) {
        metrics.parseErrors++;
        const errorMessage = buildValidationErrorMessage(validated);
        await services.conversation.add(errorMessage);
        continue;
      }

      if ('tool' in validated.data) {
        metrics.toolCalls++;

        const toolResult = await services.tools.execute({
          name: validated.data.tool,
          args: validated.data.args
        });

        if (!toolResult.success) {
          metrics.toolFailures++;
        }

        await services.conversation.add({
          role: 'assistant',
          content: JSON.stringify({ tool_result: toolResult })
        });

        continue;
      }

      if ('done' in validated.data) {
        await services.conversation.add({
          role: 'assistant',
          content: llmResult.content
        });

        return {
          success: true,
          response: validated.data.response,
          metrics
        };
      }
    }

    return {
      success: false,
      error: `Max iterations (${maxIterations}) exceeded. Tool calls: ${metrics.toolCalls}, Parse errors: ${metrics.parseErrors}`,
      metrics
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Agent error: ${errorMessage}`,
      metrics
    };
  }
}
