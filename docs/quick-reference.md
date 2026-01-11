# Quick Reference

## Architecture Rules

- **DI**: Services passed to agent, not instantiated internally
- **SoC**: Proper separation of concerns for files, modules, and implementation
- **Types**: `type` for data shapes, `interface` for class contracts (colocated)
- **Functional Core**: Pure functions for transforms, classes for state
- **Validation**: Zod for runtime, TypeScript for compile-time
- **KISS**: One way to do things, no optional complexity
- **Errors**: Use specific custom error classes, not generic Error

## Core Types

```typescript
type Message = { role: 'system' | 'user' | 'assistant'; content: string };
type ToolCall = { name: string; args: Record<string, unknown> };
type ToolResult = { success: boolean; data?: unknown; error?: string };
type Tool<T> = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  argsSchema: z.ZodSchema<T>;
  execute: (args: T) => Promise<ToolResult>;
};
```

## Tool Protocol

**Tool Call:**

```json
{ "tool": "file_read", "args": { "path": "src/index.ts" } }
```

**Tool Result:**

```json
{ "tool_result": { "tool": "file_read", "success": true, "data": "..." } }
```

**Completion:**

```json
{ "done": true, "response": "Final answer..." }
```

## Parser Strategy

1. Strip markdown fences: `text.replace(/```json\n?/g, '').replace(/```\n?/g, '')`
2. Parse JSON with Zod
3. Check `done` field → return | Check `tool` field → execute | Neither → error

## Project Structure

```
src/
├── agent/        # core.ts (runAgent), parser.ts, types.d.ts
├── llm/          # service.ts (OllamaService), types.d.ts
├── tools/        # registry.ts, file-ops.ts, types.d.ts
├── context/      # builder.ts, prompts.ts, history.ts, types.d.ts
└── shared/       # types.d.ts, utils.ts
```

**Next:**

- Phase 3: Agent loop (runAgent, error recovery, completion)
- Phase 4: CLI interface

## Code Style

- Guard clauses and early returns over nested conditions
- Named function declarations over arrows (unless improving clarity)
- 2-space indent, 100 char line limit
- Minimal comments only - no public API docs unless behavior is non-obvious
- Single-purpose functions and modules

## Key Design Decisions

1. **Tool args always required** (can be `{}`)
2. **Zod validates in registry** before execute
3. **Hard context limit** at 80% capacity (chars/4 heuristic)
4. **Explicit error feedback** to LLM for self-correction
5. **Max iterations**: 10 (configurable later)
6. **Date handling**: DateUtility wrapper class for testability (currently just wraps `new Date()`; will use date-fns when date formatting/manipulation is needed)
