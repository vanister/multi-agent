import { JsonParseError } from './ParserErrors.js';
import { buildJsonParseErrorMessage } from './parserHelpers.js';

export type ParseResult =
  | { success: true; data: unknown }
  | { success: false; error: JsonParseError };

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
 * Safely parses raw text into JavaScript object.
 *
 * Strips markdown fences and attempts JSON.parse.
 *
 * @param rawText - Raw string response from LLM
 * @returns ParseResult with either success and data or failure with error
 */
export function safeParseJson(rawText: string): ParseResult {
  const stripped = stripMarkdown(rawText);

  try {
    const data = JSON.parse(stripped);
    return { success: true, data };
  } catch (error) {
    const parseError = error as Error;
    const message = buildJsonParseErrorMessage(stripped, parseError);
    return { success: false, error: new JsonParseError(message, stripped, parseError) };
  }
}

/**
 * @deprecated Use `safeParseJson` instead. This function throws and will be removed.
 * Parses raw text into JavaScript object.
 *
 * Strips markdown fences and attempts JSON.parse.
 *
 * @param rawText - Raw string response from LLM
 * @returns Parsed JavaScript object
 * @throws {JsonParseError} If JSON parsing fails (malformed JSON)
 */
export function parseJson(rawText: string): unknown {
  const result = safeParseJson(rawText);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
