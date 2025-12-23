import type { ZodError } from 'zod';
import {
  toolCallResponseSchema,
  completionResponseSchema,
  type ParsedResponse
} from './schemas.js';
import { JsonParseError, ResponseValidationError } from './ParserErrors.js';
import { buildJsonParseErrorMessage, buildValidationErrorMessage } from './parserHelpers.js';

/**
 * Removes markdown code fences from LLM responses.
 *
 * LLMs often wrap JSON responses in markdown fences like:
 * ```json
 * { "tool": "file_read", "args": {...} }
 * ```
 *
 * This function strips those fences to get clean JSON for parsing.
 */
export function stripMarkdown(text: string): string {
  if (!text) {
    return '';
  }

  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

/**
 * Parses and validates LLM response into structured format.
 *
 * Handles two valid response types:
 * 1. Tool call: { "tool": "tool_name", "args": {...} }
 * 2. Completion: { "done": true, "response": "..." }
 *
 * @param rawResponse - Raw string response from LLM
 * @returns Parsed and validated response object
 * @throws {JsonParseError} If JSON parsing fails
 * @throws {ResponseValidationError} If validation against schemas fails
 */
export function parseResponse(rawResponse: string): ParsedResponse {
  const stripped = stripMarkdown(rawResponse);

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (error) {
    const parseError = error as Error;
    const message = buildJsonParseErrorMessage(stripped, parseError);
    throw new JsonParseError(message, stripped, parseError);
  }

  // Try completion schema first
  const completionResult = completionResponseSchema.safeParse(parsed);
  if (completionResult.success) {
    return completionResult.data;
  }

  // Try tool call schema
  const toolCallResult = toolCallResponseSchema.safeParse(parsed);
  if (toolCallResult.success) {
    return toolCallResult.data;
  }

  // Neither schema matched - throw validation error with parsed object for better debugging
  const receivedShape =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : undefined;

  const message = buildValidationErrorMessage(toolCallResult.error, receivedShape);
  throw new ResponseValidationError(message, stripped, toolCallResult.error);
}
