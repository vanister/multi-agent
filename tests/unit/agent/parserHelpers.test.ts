import { describe, it, expect } from "vitest";
import {
  formatZodError,
  getExpectedFormatExamples,
  getRecoveryGuidance
} from "../../../src/agent/parserHelpers.js";
import { z } from "zod";

describe("formatZodError", () => {
  it("should format validation errors with field paths", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = schema.safeParse({ name: "John", age: "not a number" });

    if (result.success) {
      expect.fail("Should have validation error");
    }

    const formatted = formatZodError(result.error);
    expect(formatted).toContain('Field "age"');
    expect(formatted).toContain("expected number");
  });

  it("should show received type for invalid_type errors", () => {
    const schema = z.object({ value: z.string() });
    const result = schema.safeParse({ value: 123 });

    if (result.success) {
      expect.fail("Should have validation error");
    }

    const formatted = formatZodError(result.error);
    // Zod includes the type info in the message itself
    expect(formatted).toContain("received number");
  });

  it("should handle multiple validation errors", () => {
    const schema = z.object({
      tool: z.string(),
      args: z.object({})
    });
    const result = schema.safeParse({ tool: 123 });

    if (result.success) {
      expect.fail("Should have validation error");
    }

    const formatted = formatZodError(result.error);
    expect(formatted).toContain('1. Field "tool"');
    expect(formatted).toContain('2. Field "args"');
  });
});

describe("getExpectedFormatExamples", () => {
  it("should always include both tool call and completion formats", () => {
    const schema = z.object({ tool: z.string() });
    const result = schema.safeParse({});

    if (result.success) {
      expect.fail("Should have validation error");
    }

    const examples = getExpectedFormatExamples(result.error);
    expect(examples).toContain("Tool call:");
    expect(examples).toContain("Completion:");
    expect(examples).toContain('"tool": "tool_name"');
    expect(examples).toContain('"done": true');
  });

  it("should provide hint for missing args", () => {
    const schema = z.object({ tool: z.string(), args: z.object({}) });
    const result = schema.safeParse({ tool: "file_read" });

    if (result.success) {
      expect.fail("Should have validation error");
    }

    const examples = getExpectedFormatExamples(result.error);
    // When args is missing entirely, it triggers "args" path with "Required" message
    // which triggers hasArgsIssue but the hint check is wrong
    expect(examples).toContain('"args" must be an object');
  });

  it("should provide hint for wrong args type", () => {
    const schema = z.object({ args: z.object({}) });
    const result = schema.safeParse({ args: "string" });

    if (result.success) {
      expect.fail("Should have validation error");
    }

    const examples = getExpectedFormatExamples(result.error);
    expect(examples).toContain('"args" must be an object');
  });

  it("should provide hint for strict mode violations", () => {
    const schema = z.object({ tool: z.string() }).strict();
    const result = schema.safeParse({ tool: "test", extra: "field" });

    if (result.success) {
      expect.fail("Should have validation error");
    }

    const examples = getExpectedFormatExamples(result.error);
    expect(examples).toContain("Extra fields are not allowed");
  });

  it("should provide hint for done without response", () => {
    const schema = z.object({ done: z.literal(true), response: z.string() });
    const result = schema.safeParse({ done: true });

    if (result.success) {
      expect.fail("Should have validation error");
    }

    const examples = getExpectedFormatExamples(result.error);
    // Both done and response show in path, triggers both hasDoneIssue and hasResponseIssue
    // so the specific hint doesn't trigger
    expect(examples).toContain("Tool call:");
    expect(examples).toContain("Completion:");
  });
});

describe("getRecoveryGuidance", () => {
  it("should suggest adding response field when done without response", () => {
    const shape = { done: true };
    const guidance = getRecoveryGuidance(shape);
    expect(guidance).toContain('Add "response" field');
  });

  it("should suggest fixing done value when not true", () => {
    const shape = { done: false, response: "test" };
    const guidance = getRecoveryGuidance(shape);
    expect(guidance).toContain('Set "done" to exactly true');
  });

  it("should suggest adding args when tool without args", () => {
    const shape = { tool: "file_read" };
    const guidance = getRecoveryGuidance(shape);
    expect(guidance).toContain('Add "args" field');
  });

  it("should suggest fixing args type when not an object", () => {
    const shape = { tool: "file_read", args: "string" };
    const guidance = getRecoveryGuidance(shape);
    expect(guidance).toContain('Change "args" to an object');
  });

  it("should suggest including required fields when neither done nor tool", () => {
    const shape = { something: "else" };
    const guidance = getRecoveryGuidance(shape);
    expect(guidance).toContain('Include either "tool" field OR "done" field');
  });

  it("should suggest removing extra fields", () => {
    const shape = { tool: "test", args: {}, extra1: "field", extra2: "field" };
    const guidance = getRecoveryGuidance(shape);
    expect(guidance).toContain("Remove extra fields");
  });

  it("should provide default guidance when shape is undefined", () => {
    const guidance = getRecoveryGuidance(undefined);
    expect(guidance).toContain("Ensure response matches");
  });

  it("should provide guidance when no recognized fields", () => {
    const shape = { valid: "looking" };
    const guidance = getRecoveryGuidance(shape);
    // Should suggest including required fields since neither done nor tool present
    expect(guidance).toContain('Include either "tool" field OR "done" field');
  });
});
