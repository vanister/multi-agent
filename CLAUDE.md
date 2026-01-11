# RAG-Enabled Agent - Project Context

## Overview

**Learning project** building a RAG-enabled agent to understand:
- LLM-based agents, tool calling protocols, failure modes
- Context management, prompt engineering for small models (qwen2.5-coder:3b)
- **Current phase:** Phase 2 - Core Services (LLM ✅, Conversation ✅, Tools/Parser/Context pending)

See `docs/quick-reference.md` for types and `docs/tasks.md` for checklist.

## Architecture Rules

- **DI:** Services passed to agent, not instantiated internally
- **Types:** `type` for data shapes, `interface` for class contracts (colocated)
- **Functional Core:** Pure functions for transforms, classes for state
- **Validation:** Zod for runtime, TypeScript for compile-time
- **Errors:** Specific custom error classes, not generic Error
- **KISS:** One way to do things, no optional complexity

## Core Types

```typescript
type Message = { role: 'system' | 'user' | 'assistant'; content: string }
type ToolCall = { name: string; args: Record<string, unknown> }
type ToolResult = { success: boolean; data?: unknown; error?: string }
type Tool<T> = {
  name: string
  description: string
  parameters: Record<string, unknown>
  argsSchema: z.ZodSchema<T>
  execute: (args: T) => Promise<ToolResult>
}
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

1. Strip markdown: `text.replace(/```json\n?/g, '').replace(/```\n?/g, '')`
2. Parse JSON with Zod
3. Check `done` → return | Check `tool` → execute | Neither → error

## Project Structure

```
src/
├── agent/        # core.ts (runAgent), parser.ts, types.d.ts
├── llm/          # service.ts (LLMService), types.d.ts
├── tools/        # registry.ts, file-ops.ts, types.d.ts
├── context/      # builder.ts, prompts.ts, history.ts, types.d.ts
└── shared/       # types.d.ts, utils.ts
```

## Code Style

- Guard clauses, early returns, no deep nesting
- No return statements inline with `if`
- Named functions over arrows (unless clearer)
- 2-space indent, 100 char limit
- Minimal comments, no public API docs unless non-obvious
- Functional paradigm, pure functions (justify impure)

## Key Design Decisions

- **Tool args always required** (can be `{}`)
- **Zod validates in registry** before execute
- **Hard context limit** at 80% capacity (chars/4 heuristic)
- **Explicit error feedback** to LLM for self-correction
- **Max iterations:** 10 (configurable later)
- **Date handling:** Use DateUtility wrapper around date-fns

## Testing Strategy

**Deprioritize testing in favor of learning** unless testing provides learning value.
- Use `vitest` for integration tests
- Focus on understanding failure modes
- Add tests after learning edge cases
- Tests skip gracefully if dependencies (like Ollama) unavailable
