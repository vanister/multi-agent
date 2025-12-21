import type { Tool, ToolMetadata } from "./tool-types.js";
import type { ToolCall, ToolResult } from "./schemas.js";
import { ToolAlreadyRegisteredError } from "./ToolErrors.js";
import { z } from "zod";

export interface ToolRegistry {
  register(tool: Tool): void;
  execute(toolCall: ToolCall): Promise<ToolResult>;
  list(): ToolMetadata[];
}

export class InMemoryToolRegistry implements ToolRegistry {
  private readonly tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new ToolAlreadyRegisteredError(tool.name);
    }

    this.tools.set(tool.name, tool);
  }

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolCall.name}' not found`
      };
    }

    const validationResult = tool.argsSchema.safeParse(toolCall.args);

    if (!validationResult.success) {
      const flattened = z.flattenError(validationResult.error);

      return {
        success: false,
        error: `Invalid arguments for tool '${toolCall.name}': ${JSON.stringify(
          flattened.fieldErrors
        )}`
      };
    }

    try {
      return await tool.execute(validationResult.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: `Tool '${toolCall.name}' failed: ${errorMessage}`
      };
    }
  }

  list(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }
}
