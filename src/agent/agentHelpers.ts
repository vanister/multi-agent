import type { Message } from '../llm/schemas.js';
import type { ToolRegistry } from '../tools/ToolRegistry.js';
import type { ValidationResult } from './schemas.js';
import type { ToolMetadata } from '../tools/tool-types.js';

export function buildParseErrorMessage(
  error: unknown,
  tools: ToolRegistry
): Message {
  const errorMsg = error instanceof Error ? error.message : String(error);

  const toolList = tools
    .list()
    .map(
      (t: ToolMetadata) =>
        `- ${t.name}: ${t.description}\n  Args: ${JSON.stringify(t.parameters)}`
    )
    .join('\n');

  return {
    role: 'system',
    content: `${errorMsg}\n\nAvailable tools:\n${toolList}\n\nUse JSON format: { "tool": "name", "args": {...} }\nOr complete with: { "done": true, "response": "..." }`
  };
}

export function buildValidationErrorMessage(
  validated: Extract<ValidationResult, { success: false }>
): Message {
  const errorSummary = validated.errors.join('\n');

  return {
    role: 'system',
    content: `Response validation failed:\n${errorSummary}\n\nExpected format:\nTool call: { "tool": "name", "args": {...} }\nCompletion: { "done": true, "response": "..." }`
  };
}
