import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryToolRegistry } from '../../src/tools/ToolRegistry.js';
import { ToolAlreadyRegisteredError } from '../../src/tools/ToolErrors.js';
import type { Tool } from '../../src/tools/tool-types.js';
import type { ToolCall, ToolResult } from '../../src/tools/schemas.js';
import { z } from 'zod';

describe('ToolRegistry Integration', () => {
  let toolRegistry: InMemoryToolRegistry;

  // Mock tool that echoes input
  const echoArgsSchema = z.object({
    message: z.string()
  });

  const echoTool: Tool = {
    name: 'echo',
    description: 'Echoes the input message',
    parameters: { message: 'string - Message to echo' },
    argsSchema: echoArgsSchema,
    execute: vi.fn(async (args: any) => ({
      success: true,
      data: args.message
    }))
  };

  // Mock tool that throws error
  const errorTool: Tool = {
    name: 'error_tool',
    description: 'Always throws an error',
    parameters: {},
    argsSchema: z.object({}),
    execute: vi.fn(async () => {
      throw new Error('Tool execution failed');
    })
  };

  // Mock tool with complex args
  const calculateArgsSchema = z.object({
    a: z.number(),
    b: z.number(),
    operation: z.enum(['add', 'subtract'])
  });

  const calculateTool: Tool = {
    name: 'calculate',
    description: 'Performs arithmetic operations',
    parameters: {
      a: 'number - First operand',
      b: 'number - Second operand',
      operation: "string - Operation: 'add' or 'subtract'"
    },
    argsSchema: calculateArgsSchema,
    execute: vi.fn(async (args: any) => {
      const result = args.operation === 'add' ? args.a + args.b : args.a - args.b;
      return { success: true, data: result };
    })
  };

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
});
