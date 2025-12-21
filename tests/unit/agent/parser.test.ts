import { describe, it, expect } from "vitest";
import { stripMarkdown, parseResponse } from "../../../src/agent/parser.js";
import { JsonParseError, ResponseValidationError } from "../../../src/agent/ParserErrors.js";

describe("stripMarkdown", () => {
  it("should pass through raw JSON unchanged", () => {
    const input = '{ "tool": "file_read", "args": { "path": "test.txt" } }';
    const result = stripMarkdown(input);
    expect(result).toBe(input);
  });

  it("should remove markdown fences with json language specifier", () => {
    const input = '```json\n{ "tool": "file_read", "args": { "path": "test.txt" } }\n```';
    const expected = '{ "tool": "file_read", "args": { "path": "test.txt" } }';
    const result = stripMarkdown(input);
    expect(result).toBe(expected);
  });

  it("should remove markdown fences without language specifier", () => {
    const input = '```\n{ "tool": "file_read", "args": { "path": "test.txt" } }\n```';
    const expected = '{ "tool": "file_read", "args": { "path": "test.txt" } }';
    const result = stripMarkdown(input);
    expect(result).toBe(expected);
  });

  it("should handle fences without trailing newlines", () => {
    const input = '```json{ "done": true, "response": "Complete" }```';
    const expected = '{ "done": true, "response": "Complete" }';
    const result = stripMarkdown(input);
    expect(result).toBe(expected);
  });

  it("should trim leading and trailing whitespace", () => {
    const input = '  \n```json\n{ "tool": "file_read" }\n```\n  ';
    const expected = '{ "tool": "file_read" }';
    const result = stripMarkdown(input);
    expect(result).toBe(expected);
  });

  it("should handle multiple fence patterns in sequence", () => {
    const input = '```json\n```\n{ "tool": "file_read" }\n```';
    const expected = '{ "tool": "file_read" }';
    const result = stripMarkdown(input);
    expect(result).toBe(expected);
  });

  it("should handle json fence with newline after opening", () => {
    const input = '```json\n{ "done": true }\n```\n';
    const expected = '{ "done": true }';
    const result = stripMarkdown(input);
    expect(result).toBe(expected);
  });

  it("should handle empty content between fences", () => {
    const input = "```json\n\n```";
    const expected = "";
    const result = stripMarkdown(input);
    expect(result).toBe(expected);
  });
  it("should handle empty string input", () => {
    const input = "";
    const expected = "";
    const result = stripMarkdown(input);
    expect(result).toBe(expected);
  });
});

describe("parseResponse", () => {
  describe("successful parsing", () => {
    it("should parse tool call response", () => {
      const input = '{ "tool": "file_read", "args": { "path": "test.txt" } }';
      const result = parseResponse(input);
      expect(result).toEqual({
        tool: "file_read",
        args: { path: "test.txt" }
      });
    });

    it("should parse tool call with empty args", () => {
      const input = '{ "tool": "list_tools", "args": {} }';
      const result = parseResponse(input);
      expect(result).toEqual({
        tool: "list_tools",
        args: {}
      });
    });

    it("should parse completion response", () => {
      const input = '{ "done": true, "response": "Task completed successfully" }';
      const result = parseResponse(input);
      expect(result).toEqual({
        done: true,
        response: "Task completed successfully"
      });
    });

    it("should parse response with markdown fences", () => {
      const input = '```json\n{ "tool": "file_read", "args": { "path": "test.txt" } }\n```';
      const result = parseResponse(input);
      expect(result).toEqual({
        tool: "file_read",
        args: { path: "test.txt" }
      });
    });
  });

  describe("JSON parse errors", () => {
    it("should throw JsonParseError for malformed JSON", () => {
      const input = '{ "tool": "file_read", "args": { "path": "test.txt" }';
      expect(() => parseResponse(input)).toThrow(JsonParseError);
    });

    it("should throw JsonParseError for invalid JSON syntax", () => {
      const input = '{ tool: file_read }';
      expect(() => parseResponse(input)).toThrow(JsonParseError);
    });

    it("should include raw text in JsonParseError", () => {
      const input = 'not json at all';
      try {
        parseResponse(input);
        expect.fail("Should have thrown JsonParseError");
      } catch (error) {
        expect(error).toBeInstanceOf(JsonParseError);
        expect((error as JsonParseError).rawText).toBe(input);
      }
    });
  });

  describe("validation errors", () => {
    it("should throw ResponseValidationError for missing tool field", () => {
      const input = '{ "args": { "path": "test.txt" } }';
      expect(() => parseResponse(input)).toThrow(ResponseValidationError);
    });

    it("should throw ResponseValidationError for missing args field", () => {
      const input = '{ "tool": "file_read" }';
      expect(() => parseResponse(input)).toThrow(ResponseValidationError);
    });

    it("should throw ResponseValidationError for missing response field", () => {
      const input = '{ "done": true }';
      expect(() => parseResponse(input)).toThrow(ResponseValidationError);
    });

    it("should throw ResponseValidationError for done: false", () => {
      const input = '{ "done": false, "response": "Not done yet" }';
      expect(() => parseResponse(input)).toThrow(ResponseValidationError);
    });

    it("should throw ResponseValidationError for wrong args type", () => {
      const input = '{ "tool": "file_read", "args": "should be object" }';
      expect(() => parseResponse(input)).toThrow(ResponseValidationError);
    });

    it("should throw ResponseValidationError for wrong response type", () => {
      const input = '{ "done": true, "response": 123 }';
      expect(() => parseResponse(input)).toThrow(ResponseValidationError);
    });

    it("should throw ResponseValidationError for unknown fields (strict mode)", () => {
      const input = '{ "tool": "file_read", "args": {}, "extra": "field" }';
      expect(() => parseResponse(input)).toThrow(ResponseValidationError);
    });

    it("should throw ResponseValidationError for neither tool nor done", () => {
      const input = '{ "something": "else" }';
      expect(() => parseResponse(input)).toThrow(ResponseValidationError);
    });

    it("should include validation errors in ResponseValidationError", () => {
      const input = '{ "tool": "file_read" }';
      try {
        parseResponse(input);
        expect.fail("Should have thrown ResponseValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ResponseValidationError);
        expect((error as ResponseValidationError).validationErrors).toBeDefined();
      }
    });
  });
});

