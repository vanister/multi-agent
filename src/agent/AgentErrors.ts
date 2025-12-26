export class AgentError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AgentError';
  }
}

export class MaxIterationsExceededError extends AgentError {
  constructor(maxIterations: number) {
    super(`Agent exceeded maximum iterations (${maxIterations})`);
    this.name = 'MaxIterationsExceededError';
  }
}

export class ContextLimitExceededError extends AgentError {
  constructor(estimatedTokens: number, maxTokens: number) {
    super(
      `Context limit exceeded: ${estimatedTokens} tokens (max: ${Math.floor(maxTokens * 0.8)})`
    );
    this.name = 'ContextLimitExceededError';
  }
}
