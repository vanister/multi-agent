import type { ToolResult } from './schemas.js';

export function createToolSuccess(data?: unknown): ToolResult {
  return {
    success: true,
    data
  };
}

export function createToolError(error: string): ToolResult {
  return {
    success: false,
    error
  };
}
