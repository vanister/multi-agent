import type { AgentResult } from '../agent/agent-types.js';

export function formatError(error: unknown, verbose: boolean): string {
  if (verbose && error instanceof Error) {
    return error.stack || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function formatResult(result: AgentResult, showMetrics: boolean): string {
  const output: string[] = [];

  if (result.success && result.response) {
    output.push(result.response);
  } else if (result.error) {
    output.push(`Error: ${result.error}`);
  }

  if (showMetrics) {
    output.push('\n--- Metrics ---');
    output.push(`Iterations: ${result.metrics.iterations}`);
    output.push(`Tool Calls: ${result.metrics.toolCalls}`);
    output.push(`Parse Errors: ${result.metrics.parseErrors}`);
    output.push(`Tool Failures: ${result.metrics.toolFailures}`);
    output.push(`Context Limit Reached: ${result.metrics.contextLimitReached}`);
  }

  return output.join('\n');
}
