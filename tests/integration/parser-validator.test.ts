import { describe, it, expect } from 'vitest';
import { stripMarkdown, parseJson } from '../../src/agent/parser.js';
import { validateResponse } from '../../src/agent/validator.js';
import { JsonParseError } from '../../src/agent/ParserErrors.js';
import {
  MARKDOWN_WRAPPED_TOOL_CALL,
  PLAIN_TOOL_CALL,
  MARKDOWN_WRAPPED_COMPLETION
} from '../fixtures/llmResponses.js';

describe('Parser → Validator Pipeline Integration', () => {
  describe('stripMarkdown', () => {
    it('should strip markdown fences from tool call', () => {
      const result = stripMarkdown(MARKDOWN_WRAPPED_TOOL_CALL);

      expect(result).not.toContain('```');
      expect(result).toContain('file_read');
    });

    it('should strip markdown fences from completion', () => {
      const result = stripMarkdown(MARKDOWN_WRAPPED_COMPLETION);

      expect(result).not.toContain('```');
      expect(result).toContain('done');
    });

    it('should handle plain JSON without markdown', () => {
      const result = stripMarkdown(PLAIN_TOOL_CALL);

      expect(result).toBe(PLAIN_TOOL_CALL);
    });

    it('should return empty string for empty input', () => {
      expect(stripMarkdown('')).toBe('');
      expect(stripMarkdown('   ')).toBe('');
    });
  });

  describe('parseJson', () => {
    it('should parse markdown-wrapped tool call', () => {
      const result = parseJson(MARKDOWN_WRAPPED_TOOL_CALL);

      expect(result).toEqual({
        tool: 'file_read',
        args: { path: 'example.txt' }
      });
    });

    it('should parse plain tool call JSON', () => {
      const result = parseJson(PLAIN_TOOL_CALL);

      expect(result).toEqual({
        tool: 'file_read',
        args: { path: 'example.txt' }
      });
    });

    it('should parse markdown-wrapped completion', () => {
      const result = parseJson(MARKDOWN_WRAPPED_COMPLETION);

      expect(result).toEqual({
        done: true,
        response: 'All done!'
      });
    });

    it('should throw JsonParseError for malformed JSON', () => {
      const malformedJson = '```json\n{ "tool": "test", invalid }\n```';

      expect(() => parseJson(malformedJson)).toThrow(JsonParseError);
    });

    it('should throw JsonParseError for invalid JSON syntax', () => {
      const invalidJson = '{ tool: "test" }'; // Missing quotes around key

      expect(() => parseJson(invalidJson)).toThrow(JsonParseError);
    });
  });

  describe('validateResponse', () => {
    it('should validate tool call response', () => {
      const parsed = {
        tool: 'file_read',
        args: { path: 'test.txt' }
      };

      const result = validateResponse(parsed);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toEqual(parsed);
      }
    });

    it('should validate completion response', () => {
      const parsed = {
        done: true,
        response: 'Task completed'
      };

      const result = validateResponse(parsed);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toEqual(parsed);
      }
    });

    it('should return errors for invalid tool call', () => {
      const parsed = {
        tool: 'test'
        // missing args
      };

      const result = validateResponse(parsed);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return errors for invalid completion', () => {
      const parsed = {
        done: true
        // missing response
      };

      const result = validateResponse(parsed);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return errors for completely invalid structure', () => {
      const parsed = {
        invalid: 'data'
      };

      const result = validateResponse(parsed);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe('full pipeline: stripMarkdown → parseJson → validateResponse', () => {
    it('should process markdown-wrapped tool call end-to-end', () => {
      const raw = '```json\n{"tool": "echo", "args": {"message": "hello"}}\n```';

      const stripped = stripMarkdown(raw);
      const parsed = parseJson(stripped);
      const validated = validateResponse(parsed);

      expect(validated.success).toBe(true);
      if (validated.success) {
        expect(validated.data).toEqual({
          tool: 'echo',
          args: { message: 'hello' }
        });
      }
    });

    it('should process markdown-wrapped completion end-to-end', () => {
      const raw = '```json\n{"done": true, "response": "Finished"}\n```';

      const stripped = stripMarkdown(raw);
      const parsed = parseJson(stripped);
      const validated = validateResponse(parsed);

      expect(validated.success).toBe(true);
      if (validated.success) {
        expect(validated.data).toEqual({
          done: true,
          response: 'Finished'
        });
      }
    });

    it('should handle plain JSON without markdown', () => {
      const raw = '{"tool": "test", "args": {}}';

      const parsed = parseJson(raw);
      const validated = validateResponse(parsed);

      expect(validated.success).toBe(true);
      if (validated.success) {
        expect(validated.data).toEqual({
          tool: 'test',
          args: {}
        });
      }
    });

    it('should detect parse error in pipeline', () => {
      const raw = '```json\n{ invalid json }\n```';

      expect(() => {
        const parsed = parseJson(raw);
        validateResponse(parsed);
      }).toThrow(JsonParseError);
    });

    it('should detect validation error in pipeline', () => {
      const raw = '```json\n{"invalid": "structure"}\n```';

      const parsed = parseJson(raw);
      const validated = validateResponse(parsed);

      expect(validated.success).toBe(false);
    });

    it('should handle complex tool call with nested args', () => {
      const raw = `\`\`\`json
{
  "tool": "complex_tool",
  "args": {
    "nested": {
      "value": 123
    },
    "array": [1, 2, 3]
  }
}
\`\`\``;

      const parsed = parseJson(raw);
      const validated = validateResponse(parsed);

      expect(validated.success).toBe(true);
      if (validated.success) {
        expect(validated.data).toEqual({
          tool: 'complex_tool',
          args: {
            nested: { value: 123 },
            array: [1, 2, 3]
          }
        });
      }
    });

    it('should handle LLM response with extra whitespace', () => {
      const raw = `

      \`\`\`json
      {
        "done": true,
        "response": "Success"
      }
      \`\`\`

      `;

      const parsed = parseJson(raw);
      const validated = validateResponse(parsed);

      expect(validated.success).toBe(true);
    });

    it('should handle trailing commas gracefully (should fail)', () => {
      const raw = '{"tool": "test", "args": {},}'; // Trailing comma

      expect(() => parseJson(raw)).toThrow(JsonParseError);
    });
  });
});
