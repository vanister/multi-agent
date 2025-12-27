import { safeParseJson } from './parser.js';
import { validateResponse } from './validator.js';
import type { AgentConfig, AgentServices, AgentResult, AgentMetrics } from './agent-types.js';
import type { ConversationService } from '../conversation/ConversationService.js';
import type { ToolCallResponse, CompletionResponse } from './schemas.js';
import { buildParseErrorMessage, buildValidationErrorMessage } from './agentHelpers.js';
import {
  MAX_AGENT_ITERATIONS,
  AGENT_CONTEXT_LIMIT_THRESHOLD,
  AGENT_MAX_TOKENS
} from '../config.js';

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxIterations: MAX_AGENT_ITERATIONS,
  contextLimitThreshold: AGENT_CONTEXT_LIMIT_THRESHOLD,
  maxTokens: AGENT_MAX_TOKENS
};

export async function runAgent(
  userInput: string,
  systemPrompt: string,
  services: AgentServices,
  config?: Partial<AgentConfig>
): Promise<AgentResult> {
  const mergedConfig: AgentConfig = {
    ...DEFAULT_AGENT_CONFIG,
    ...config
  };

  const { maxIterations, contextLimitThreshold, maxTokens } = mergedConfig;

  const metrics: AgentMetrics = {
    iterations: 0,
    toolCalls: 0,
    parseErrors: 0,
    toolFailures: 0,
    contextLimitReached: false
  };

  const validationError = validateInputs(userInput, systemPrompt);

  if (validationError) {
    return createResult(validationError, metrics, true);
  }

  try {
    await ensureConversationInitialized(services.conversation, systemPrompt);
    await services.conversation.add({ role: 'user', content: userInput });

    for (let i = 0; i < maxIterations; i++) {
      metrics.iterations++;

      const estimatedTokens = await services.conversation.estimateTokens();
      const contextLimitReached = checkContextLimit(
        estimatedTokens,
        maxTokens,
        contextLimitThreshold
      );

      if (contextLimitReached) {
        metrics.contextLimitReached = true;

        return createResult(`Context limit reached (${estimatedTokens} tokens).`, metrics, true);
      }

      const currentMessages = await services.conversation.getAllMessages();
      const llmResult = await services.llm.chat(currentMessages);
      const parseResult = safeParseJson(llmResult.content);

      if (!parseResult.success) {
        metrics.parseErrors++;

        const errorMessage = buildParseErrorMessage(parseResult.error, services.tools);
        await services.conversation.add(errorMessage);

        continue;
      }

      const validated = validateResponse(parseResult.data);

      if (!validated.success) {
        metrics.parseErrors++;

        const errorMessage = buildValidationErrorMessage(validated);
        await services.conversation.add(errorMessage);

        continue;
      }

      if ('tool' in validated.data) {
        await executeToolAndUpdateConversation(validated.data, services, metrics);

        continue;
      }

      if ('done' in validated.data) {
        const response = await handleCompletion(
          validated.data,
          llmResult.content,
          services.conversation
        );

        return createResult(response, metrics);
      }
    }

    return createResult(`Max iterations (${maxIterations}) exceeded.`, metrics, true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return createResult(`Agent error: ${errorMessage}`, metrics, true);
  }
}

function validateInputs(userInput: string, systemPrompt: string): string | null {
  if (!userInput.trim()) {
    return 'User input cannot be empty';
  }

  if (!systemPrompt.trim()) {
    return 'System prompt cannot be empty';
  }

  return null;
}

async function ensureConversationInitialized(
  conversationService: ConversationService,
  systemPrompt: string
): Promise<void> {
  const messages = await conversationService.getAllMessages();

  if (messages.length === 0) {
    await conversationService.create([{ role: 'system', content: systemPrompt }]);
  }
}

function checkContextLimit(estimatedTokens: number, maxTokens: number, threshold: number): boolean {
  return estimatedTokens > maxTokens * threshold;
}

async function executeToolAndUpdateConversation(
  toolCall: ToolCallResponse,
  services: AgentServices,
  metrics: AgentMetrics
): Promise<void> {
  metrics.toolCalls++;

  const toolResult = await services.tools.execute({
    name: toolCall.tool,
    args: toolCall.args
  });

  if (!toolResult.success) {
    metrics.toolFailures++;
  }

  await services.conversation.add({
    role: 'assistant',
    content: JSON.stringify({ tool_result: toolResult })
  });
}

async function handleCompletion(
  completion: CompletionResponse,
  llmContent: string,
  conversationService: ConversationService
): Promise<string> {
  await conversationService.add({
    role: 'assistant',
    content: llmContent
  });

  return completion.response;
}

function createResult(message: string, metrics: AgentMetrics, isError = false): AgentResult {
  if (isError) {
    return { success: false, error: message, metrics };
  }

  return { success: true, response: message, metrics };
}
