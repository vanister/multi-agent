# GitHub Copilot Instructions

## Code Preferences

**Always ask before providing code samples**

### Universal

- Guard clauses, early returns, avoid deep nesting
- No return statements inline with `if`
- Minimal necessary comments only
- Simple, concise, single-purpose code
- 100 char line limit, SOLID principles, test-minded

### TypeScript/React

- 2-space indent, functional paradigm, pure functions (justify impure)
- Named function declarations over arrows (unless clarity improves)
- Arrow functions require parens, destructure objects
- Components: `export function Component(props: ComponentProps) {...}`
- Single-purpose components, logic in helpers/hooks not JSX
- CSS Modules preferred

### Backend/Database

- .NET/C# (Python for ML/AI if better ecosystem)
- T-SQL/SQL Server (suggest alternatives when appropriate, NoSQL if justified)
