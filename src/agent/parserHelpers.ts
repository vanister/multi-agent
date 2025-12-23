import type { ZodError } from "zod";

/**
 * Builds enhanced error message for JSON parse failures.
 */
export function buildJsonParseErrorMessage(rawText: string, parseError: Error): string {
  const position = extractPosition(parseError.message);
  const excerpt = getExcerpt(rawText, position);
  const commonFixes = getCommonFixes(parseError.message);

  return (
    `Failed to parse JSON response: ${parseError.message}\n\n` +
    `${excerpt}\n\n` +
    `Common fixes:\n${commonFixes}\n\n` +
    `Expected format:\n${VALID_FORMAT_EXAMPLES}`
  );
}

/**
 * Builds enhanced error message for validation failures.
 */
export function buildValidationErrorMessage(
  error: ZodError,
  receivedShape?: Record<string, unknown>
): string {
  const formatted = formatZodError(error);
  const examples = getExpectedFormatExamples(error);
  const guidance = getRecoveryGuidance(receivedShape);

  const receivedDisplay = receivedShape
    ? `\nYou provided: ${JSON.stringify(receivedShape, null, 2)}\n`
    : "";

  return (
    `Response validation failed\n\n` +
    `Problems found:\n${formatted}\n` +
    `${receivedDisplay}\n` +
    `${examples}\n\n` +
    `${guidance}`
  );
}

function extractPosition(errorMsg: string): number | undefined {
  const match = errorMsg.match(/position (\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function getExcerpt(text: string, position?: number): string {
  if (!position || text.length < 50) {
    return `Received: ${text.length > 100 ? text.slice(0, 100) + "..." : text}`;
  }

  const start = Math.max(0, position - 20);
  const end = Math.min(text.length, position + 20);
  const excerpt = text.slice(start, end);
  const pointer = " ".repeat(Math.min(20, position - start)) + "^";

  return `Problem near:\n${excerpt}\n${pointer}`;
}

function getCommonFixes(errorMsg: string): string {
  const fixes = [];

  if (errorMsg.includes("Unexpected token") || errorMsg.includes("Expected")) {
    fixes.push("- Check for missing quotes around strings");
    fixes.push("- Check for trailing commas");
    fixes.push('- Ensure all strings use double quotes "');
  }
  if (errorMsg.includes("Unexpected end") || errorMsg.includes("end of data")) {
    fixes.push("- Check for missing closing braces }");
    fixes.push("- Check for missing closing brackets ]");
  }

  return fixes.length > 0 ? fixes.join("\n") : "- Verify JSON syntax is correct";
}

const VALID_FORMAT_EXAMPLES =
  'Tool call: { "tool": "file_read", "args": { "path": "test.txt" } }\n' +
  'Completion: { "done": true, "response": "Task complete" }';

/**
 * Formats Zod validation errors into a human-readable field-by-field breakdown.
 */
export function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue, idx) => {
    const path = issue.path.length > 0 ? `"${issue.path.join(".")}"` : "root";
    const location = `  ${idx + 1}. Field ${path}:`;
    const problem = `     Problem: ${issue.message}`;

    // Extract received type for invalid_type errors
    let received = "";
    if (issue.code === "invalid_type") {
      const invalidTypeIssue = issue as { received?: string };
      if (invalidTypeIssue.received) {
        received = `     Received: ${invalidTypeIssue.received}`;
      }
    }

    return [location, problem, received].filter(Boolean).join("\n");
  });

  return issues.join("\n\n");
}

/**
 * Generates valid format examples based on validation errors.
 * Provides specific hints for common mistakes.
 */
export function getExpectedFormatExamples(error: ZodError): string {
  const issues = error.issues;
  const hasDoneIssue = issues.some((i) => i.path.includes("done"));
  const hasToolIssue = issues.some((i) => i.path.includes("tool"));
  const hasResponseIssue = issues.some((i) => i.path.includes("response"));
  const hasArgsIssue = issues.some((i) => i.path.includes("args"));
  const hasUnknownKeys = issues.some((i) => i.code === "unrecognized_keys");

  const examples = ["Expected format (choose one):"];

  // Always show both valid formats
  examples.push(
    "\n1. Tool call:",
    "   {",
    '     "tool": "tool_name",',
    '     "args": { "param": "value" }',
    "   }"
  );

  examples.push(
    "\n2. Completion:",
    "   {",
    '     "done": true,',
    '     "response": "Your final answer"',
    "   }"
  );

  // Add specific hints based on error
  if (hasUnknownKeys) {
    examples.push("\nNote: Extra fields are not allowed (strict mode)");
  }
  if (hasDoneIssue && !hasResponseIssue) {
    examples.push('\nHint: "done" must be exactly true (not false)');
    examples.push('Hint: When done=true, you must include "response"');
  }
  if (hasToolIssue && !hasArgsIssue) {
    examples.push('\nHint: Tool calls must include "args" (can be empty: {})');
  }
  if (hasArgsIssue) {
    examples.push('\nHint: "args" must be an object, not a string or array');
  }

  return examples.join("\n");
}

/**
 * Provides specific recovery guidance based on what the LLM attempted.
 */
export function getRecoveryGuidance(shape?: Record<string, unknown>): string {
  if (!shape) {
    return "Recovery: Ensure response matches one of the expected formats above";
  }

  const guidance = ["Recovery suggestions:"];
  const keys = Object.keys(shape);

  // Check what they tried to do
  const hasDone = "done" in shape;
  const hasResponse = "response" in shape;
  const hasTool = "tool" in shape;
  const hasArgs = "args" in shape;

  if (hasDone && !hasResponse) {
    guidance.push('- Add "response" field with your final answer');
  }
  if (hasDone && shape.done !== true) {
    guidance.push('- Set "done" to exactly true (not false or other value)');
  }
  if (hasTool && !hasArgs) {
    guidance.push('- Add "args" field (use {} if tool needs no arguments)');
  }
  if (hasArgs && typeof shape.args !== "object") {
    guidance.push('- Change "args" to an object: { "key": "value" }');
  }
  if (!hasDone && !hasTool) {
    guidance.push('- Include either "tool" field OR "done" field (not both)');
  }
  if (hasDone && hasTool) {
    guidance.push('- Remove either "tool" or "done" - cannot have both');
  }
  if (keys.length > 2) {
    guidance.push("- Remove extra fields - only include required fields");
  }

  // Only provide generic guidance if no specific issues were found
  if (guidance.length === 1 && hasDone && hasTool) {
    // Skip generic guidance if we already suggested removing conflicting fields
  } else if (guidance.length === 1) {
    guidance.push("- Double-check field names and types match examples");
  }

  return guidance.join("\n");
}
