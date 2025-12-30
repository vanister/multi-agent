import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryToolRegistry } from '../../src/tools/ToolRegistry.js';
import { ToolAlreadyRegisteredError } from '../../src/tools/ToolErrors.js';
import type { ToolCall } from '../../src/tools/schemas.js';
import { echoTool, errorTool, calculateTool } from '../fixtures/tools.js';
import { calculateTool as realCalculateTool } from '../../src/tools/calculator.js';

describe('ToolRegistry Integration', () => {
  let toolRegistry: InMemoryToolRegistry;

  beforeEach(() => {
    toolRegistry = new InMemoryToolRegistry();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a tool successfully', () => {
      toolRegistry.register(echoTool);

      const tools = toolRegistry.list();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('echo');
      expect(tools[0].description).toBe('Echoes the input message');
      expect(tools[0].parameters).toEqual({ message: 'string - Message to echo' });
    });

    it('should register multiple tools', () => {
      toolRegistry.register(echoTool);
      toolRegistry.register(calculateTool);

      const tools = toolRegistry.list();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual(['echo', 'calculate']);
    });

    it('should throw ToolAlreadyRegisteredError when registering duplicate tool name', () => {
      toolRegistry.register(echoTool);

      expect(() => toolRegistry.register(echoTool)).toThrow(ToolAlreadyRegisteredError);
      expect(() => toolRegistry.register(echoTool)).toThrow('echo');
    });
  });

  describe('execute', () => {
    it('should execute tool with valid arguments', async () => {
      toolRegistry.register(echoTool);

      const toolCall: ToolCall = {
        name: 'echo',
        args: { message: 'Hello, World!' }
      };

      const result = await toolRegistry.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Hello, World!');
      expect(echoTool.execute).toHaveBeenCalledWith({ message: 'Hello, World!' });
    });

    it('should execute tool with complex arguments', async () => {
      toolRegistry.register(calculateTool);

      const toolCall: ToolCall = {
        name: 'calculate',
        args: { a: 10, b: 5, operation: 'add' }
      };

      const result = await toolRegistry.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.data).toBe(15);
      expect(calculateTool.execute).toHaveBeenCalledWith({ a: 10, b: 5, operation: 'add' });
    });

    it('should return error for non-existent tool', async () => {
      const toolCall: ToolCall = {
        name: 'non_existent',
        args: {}
      };

      const result = await toolRegistry.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tool 'non_existent' not found");
    });

    it('should validate arguments and return error for invalid args', async () => {
      toolRegistry.register(echoTool);

      const toolCall: ToolCall = {
        name: 'echo',
        args: { wrong_field: 'test' }
      };

      const result = await toolRegistry.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid arguments');
      expect(result.error).toContain('echo');
      expect(echoTool.execute).not.toHaveBeenCalled();
    });

    it('should validate argument types', async () => {
      toolRegistry.register(calculateTool);

      const toolCall: ToolCall = {
        name: 'calculate',
        args: { a: 'not-a-number', b: 5, operation: 'add' }
      };

      const result = await toolRegistry.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid arguments');
      expect(calculateTool.execute).not.toHaveBeenCalled();
    });

    it('should return error when tool execution throws', async () => {
      toolRegistry.register(errorTool);

      const toolCall: ToolCall = {
        name: 'error_tool',
        args: {}
      };

      const result = await toolRegistry.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tool 'error_tool' failed");
      expect(result.error).toContain('Tool execution failed');
      expect(errorTool.execute).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return empty array when no tools registered', () => {
      const tools = toolRegistry.list();
      expect(tools).toEqual([]);
    });

    it('should return metadata for all registered tools', () => {
      toolRegistry.register(echoTool);
      toolRegistry.register(calculateTool);
      toolRegistry.register(errorTool);

      const tools = toolRegistry.list();

      expect(tools).toHaveLength(3);
      expect(tools[0]).toEqual({
        name: 'echo',
        description: 'Echoes the input message',
        parameters: { message: 'string - Message to echo' }
      });
      expect(tools[1]).toEqual({
        name: 'calculate',
        description: 'Performs arithmetic operations',
        parameters: {
          a: 'number - First operand',
          b: 'number - Second operand',
          operation: "string - Operation: 'add' or 'subtract'"
        }
      });
    });

    it('should not include execute function in metadata', () => {
      toolRegistry.register(echoTool);

      const tools = toolRegistry.list();

      expect(tools[0]).not.toHaveProperty('execute');
      expect(tools[0]).not.toHaveProperty('argsSchema');
    });
  });

  describe('full workflow', () => {
    it('should handle complete tool lifecycle', async () => {
      // Register
      toolRegistry.register(echoTool);
      toolRegistry.register(calculateTool);

      // List
      const tools = toolRegistry.list();
      expect(tools).toHaveLength(2);

      // Execute echo
      const echoResult = await toolRegistry.execute({
        name: 'echo',
        args: { message: 'test' }
      });
      expect(echoResult.success).toBe(true);

      // Execute calculate
      const calcResult = await toolRegistry.execute({
        name: 'calculate',
        args: { a: 20, b: 10, operation: 'subtract' }
      });
      expect(calcResult.success).toBe(true);
      expect(calcResult.data).toBe(10);

      // Try invalid tool
      const invalidResult = await toolRegistry.execute({
        name: 'unknown',
        args: {}
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('calculator tool integration', () => {
    beforeEach(() => {
      toolRegistry.register(realCalculateTool);
    });

    it('should evaluate simple addition', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '2 + 3' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should evaluate simple subtraction', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '10 - 3' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(7);
    });

    it('should evaluate simple multiplication', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '4 * 5' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(20);
    });

    it('should evaluate simple division', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '20 / 4' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should evaluate left-to-right (2 + 3 * 4 = 20, not 14)', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '2 + 3 * 4' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(20); // (2 + 3) * 4 = 5 * 4 = 20
    });

    it('should handle expressions without spaces', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '10+5*2' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(30); // (10 + 5) * 2 = 15 * 2 = 30
    });

    it('should handle expressions with mixed spacing', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '  10  +  5  ' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(15);
    });

    it('should handle decimal numbers', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '2.5 + 3.5' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(6);
    });

    it('should return error for division by zero', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '10 / 0' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Division by zero');
    });

    it('should return error for expression starting with operator (like negative numbers)', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '-5 + 3' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('operator without preceding number');
    });

    it('should handle subtraction that results in negative (still returns negative result)', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '3 - 5' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(-2); // Results can be negative, just not inputs
    });

    it('should return error for invalid characters', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '2 + 3 & 4' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid character');
    });

    it('should return error for expression ending with operator', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '2 + 3 +' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ends with operator');
    });

    it('should return error for expression starting with operator', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '+ 3 + 4' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('operator without preceding number');
    });

    it('should return error for empty expression', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expression cannot be empty');
    });

    it('should return error for consecutive operators', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '2 + * 3' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('operator without preceding number');
    });

    it('should handle complex expressions', async () => {
      const result = await toolRegistry.execute({
        name: 'calculate',
        args: { expression: '100 / 2 + 10 * 3 - 5' }
      });

      expect(result.success).toBe(true);
      // (((100 / 2) + 10) * 3) - 5 = ((50 + 10) * 3) - 5 = (60 * 3) - 5 = 180 - 5 = 175
      expect(result.data).toBe(175);
    });
  });
});
