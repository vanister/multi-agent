import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../../src/context/prompts.js';
import type { ToolMetadata } from '../../../src/tools/tool-types.js';

describe('buildSystemPrompt', () => {
  it('should generate system prompt with no tools', () => {
    const tools: ToolMetadata[] = [];
    const result = buildSystemPrompt(tools);

    expect(result).toContain('You are a helpful AI assistant with access to tools');
    expect(result).toContain('RESPONSE FORMAT:');
    expect(result).toContain('AVAILABLE TOOLS:');
    expect(result).toContain('(No tools available)');
    expect(result).toContain('TOOL RESULTS:');
    expect(result).toContain('IMPORTANT:');
  });

  it('should generate system prompt with single tool', () => {
    const tools: ToolMetadata[] = [
      {
        name: 'file_read',
        description: 'Read contents of a file',
        parameters: { path: 'string - Path to file' }
      }
    ];
    const result = buildSystemPrompt(tools);

    expect(result).toContain('- file_read: Read contents of a file');
    expect(result).toContain('Args: {"path":"string - Path to file"}');
  });

  it('should generate system prompt with multiple tools', () => {
    const tools: ToolMetadata[] = [
      {
        name: 'file_read',
        description: 'Read contents of a file',
        parameters: { path: 'string - Path to file' }
      },
      {
        name: 'file_write',
        description: 'Write content to a file',
        parameters: { path: 'string - Path to file', content: 'string - Content to write' }
      }
    ];
    const result = buildSystemPrompt(tools);

    expect(result).toContain('- file_read: Read contents of a file');
    expect(result).toContain('- file_write: Write content to a file');
    expect(result).toContain('Args: {"path":"string - Path to file"}');
    expect(result).toContain(
      'Args: {"path":"string - Path to file","content":"string - Content to write"}'
    );
  });

  it('should include JSON format instructions', () => {
    const tools: ToolMetadata[] = [];
    const result = buildSystemPrompt(tools);

    expect(result).toContain('"tool": "tool_name"');
    expect(result).toContain('"args": {');
    expect(result).toContain('"done": true');
    expect(result).toContain('"response":');
  });

  it('should include tool result format examples', () => {
    const tools: ToolMetadata[] = [];
    const result = buildSystemPrompt(tools);

    expect(result).toContain('"tool_result": {');
    expect(result).toContain('"success": true');
    expect(result).toContain('"data": "result data"');
    expect(result).toContain('"success": false');
    expect(result).toContain('"error": "error message"');
  });

  it('should include important guidelines', () => {
    const tools: ToolMetadata[] = [];
    const result = buildSystemPrompt(tools);

    expect(result).toContain('Always output valid JSON');
    expect(result).toContain('Do not wrap JSON in markdown code blocks');
    expect(result).toContain('Check tool_result.success');
  });
});
