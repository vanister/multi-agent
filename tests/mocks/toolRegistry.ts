import { InMemoryToolRegistry } from '../../src/tools/ToolRegistry.js';
import type { Tool } from '../../src/tools/tool-types.js';

/**
 * Creates a tool registry with the provided tools
 */
export function createMockToolRegistry(tools: Tool[] = []): InMemoryToolRegistry {
  const registry = new InMemoryToolRegistry();
  tools.forEach(tool => registry.register(tool));
  return registry;
}
