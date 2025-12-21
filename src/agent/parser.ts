import {
  toolCallResponseSchema,
  completionResponseSchema,
  type ParsedResponse
} from "./schemas.js";
import { JsonParseError, ResponseValidationError } from "./ParserErrors.js";

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
    return "";
  }

  return text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
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
    throw new JsonParseError(stripped, error as Error);
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

  // Neither schema matched - throw validation error
  // Use the tool call error as it's more informative for debugging
  throw new ResponseValidationError(stripped, toolCallResult.error);
}
