# GitHub Copilot Instructions

## Project Context

This is a **learning project** building a coding agent MVP to understand:

- How LLM-based agents work
- Tool calling protocols and failure modes
- Context management and token limits
- Prompt engineering for small models (qwen2.5-coder:3b)

See [quick-reference.md](../docs/quick-reference.md) for architecture, types, and current phase.
See [tasks.md](../docs/tasks.md) for complete implementation checklist.

## Code Preferences

**Always ask before providing code samples**

### Universal

- Guard clauses, early returns, avoid deep nesting
- No return statements inline with `if`
- Minimal necessary comments only
- Don't document public APIs unless non-obvious
- Simple, concise, single-purpose code
- 100 char line limit, SOLID principles, test-minded
- Use specific custom error classes, not generic Error

### TypeScript/React

- 2-space indent, functional paradigm, pure functions (justify impure)
- Named function declarations over arrows (unless clarity improves)
- Arrow functions require parens, destructure objects
- Components: `export function Component(props: ComponentProps) {...}`
- Single-purpose components, logic in helpers/hooks not JSX
- CSS Modules preferred
- No `index.ts` barrels
- Classes should use `TitleCase` names
- Utility/helpers/functional files use `camelCase` names

## Testing Strategy

This is a learning project - **deprioritize testing in favor of learning** unless testing provides learning value.

- Use `vitest` for integration tests
- Focus on understanding failure modes
- Add tests after learning edge cases
- Tests should skip gracefully if dependencies (like Ollama) are unavailable
