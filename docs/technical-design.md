## Architecture Principles

1. **Separation of Concerns**: Each module has single responsibility
2. **Dependency Injection**: Services passed to agent, not instantiated internally
3. **Interface-based Design**: Classes implement interfaces for testability
4. **Functional Core**: Pure functions for transformations, classes for state
5. **Type Safety**: Zod for runtime validation, TypeScript for compile-time
6. **KISS**: Keep it simple - one way to do things, no optional complexity

---

## Project Structure

```
coding-agent/
├── src/
│   ├── index.ts                 # Entry point with manual DI
│   │
│   ├── agent/
│   │   ├── core.ts              # runAgent() - pure orchestration function
│   │   ├── parser.ts            # Parse/validate LLM responses
│   │   └── types.d.ts           # Agent-specific types
│   │
│   ├── llm/
│   │   ├── service.ts           # LLMService interface 
│   │   └── types.d.ts           # Message, LLMResponse types
│   │
│   ├── tools/
│   │   ├── registry.ts          # ToolRegistry interface
│   │   ├── file-ops.ts          # Tool object definitions
│   │   ├── command.ts           # Command execution tool
│   │   └── types.d.ts           # Tool, ToolCall, ToolResult types
│   │
│   ├── context/
│   │   ├── builder.ts           # buildContext() - pure function
│   │   ├── prompts.ts           # System prompt templates
│   │   ├── history.ts           # ConversationHistory interface
│   │   └── types.d.ts           # Context-specific types
│   │
│   ├── cli/
│   │   ├── commands.ts          # CLI command definitions
│   │   └── types.d.ts           # CLI types
│   │
│   └── shared/
│       ├── types.d.ts           # Cross-cutting types
│       └── utils.ts             # Common utilities
│
├── learning/                    # Add as you discover
│   └── experiments.md           # Document your surprises
│
├── tests/                       # Mirrors src/ structure
│   ├── agent/
│   ├── llm/
│   └── tools/
│
├── tests_integrations/           # End-to-end workflows
│   └── agent-workflow.test.ts
│
├── config.ts                    # Root configuration
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## Core Type System

### Type vs Interface Usage

```typescript
// Use 'type' for data shapes
type Message = { ... }
type ToolCall = { ... }
type AgentServices = { ... }

// Use 'interface' for class contracts (colocated with implementation)
interface LLMService { ... }
interface IToolRegistry { ... }
interface IConversationHistory { ... }
```

### Key Types

```typescript
// src/shared/types.d.ts
type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type LLMResponse = {
  content: string
  raw: string  // Original response for debugging
}

// src/tools/types.d.ts
type Tool<TArgs = Record<string, unknown>> = {
  name: string
  description: string
  parameters: Record<string, unknown>  // Human-readable for LLM
  argsSchema: z.ZodSchema<TArgs>       // Machine validation with Zod
  execute: (args: TArgs) => Promise<ToolResult>
}

type ToolCall = {
  name: string
  args: Record<string, unknown>  // Required, can be empty {}
}

type ToolResult = {
  success: boolean
  data?: unknown
  error?: string
}

// src/agent/types.d.ts
type AgentServices = {
  llm: LLMService
  tools: IToolRegistry
  context: ContextBuilder
}

type ContextBuilder = {
  buildInitial: (input: string) => Message[]
}

// Learning additions (optional but helpful)
type AgentResult = {
  response: string
  success: boolean
  metrics?: {
    iterations: number
    toolCalls: number
    parseErrors: number
    tokensUsed?: number
  }
}
```

---

## Design Decisions

### 1. Tool Calling Protocol: JSON with Markdown Stripping

**Format:**

```json
{
  "tool": "file_read",
  "args": {
    "path": "src/index.ts"
  }
}
```

**Rationale:**

- Qwen 2.5 Coder has structured output support
- Zod provides runtime validation and type safety
- JSON is familiar and well-structured

**Implementation:**

- System prompt instructs model to output raw JSON (no markdown)
- Parser strips markdown fences defensively (```json blocks)
- Zod schemas validate structure and types

**Learning Note:** Consider trying ReAct format in an experiment to see if showing reasoning helps the model

---

### 2. Agent Loop Control: Explicit Completion Signal

**Completion Format:**

```json
{
  "done": true,
  "response": "Final answer here..."
}
```

**Detection Logic:**

1. Check for `done: true` → return response to user
2. Check for `tool` field → execute tool and continue loop
3. Neither → treat as error, add error message and retry

**Rationale:**

- Explicit signals are clearer for small models
- Easy to detect and implement
- Can evolve implementation later without breaking contract

---

### 3. Error Recovery: Explicit Error Feedback

**Strategy:**

```typescript
// On parse error:
messages.push({
  role: 'system',
  content: `Error: Invalid response format. 
  
  Available tools:
  - file_read (args: { path: string })
  - file_write (args: { path: string, content: string })
  
  Use JSON format: { "tool": "tool_name", "args": {...} }
  Or complete with: { "done": true, "response": "..." }`
})

// On tool execution error:
messages.push({
  role: 'system', 
  content: `Tool execution failed: ${error}
  
  Please try a different approach.`
})
```

**Rationale:**

- Small models benefit from explicit guidance
- Clear error messages help model self-correct
- Includes examples of correct format

---

### 4. Context Management: Token Tracking with Hard Limit

**Phase 1 Approach:**

```typescript
type ContextState = {
  messages: Message[]
  totalTokens: number      // Approximate count
  maxTokens: number        // Model's context window
}

// Simple heuristic: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Hard stop at 80% capacity
if (totalTokens > maxTokens * 0.8) {
  return "Context limit reached. Start new conversation."
}
```

**Rationale:**

- Start simple, understand token usage patterns
- Hard limit prevents context overflow
- Forces new conversation (acceptable for Phase 1)

**Future Enhancements:**

- Sliding window (keep last N messages)
- Summarization of old messages
- Smart pruning (remove tool results after use)

**Learning Note:** Track actual vs estimated tokens to calibrate your heuristic

---

### 5. Tool Result Format: Structured JSON

**Format:**

```json
{
  "tool_result": {
    "tool": "file_read",
    "success": true,
    "data": "file contents..."
  }
}
```

**On failure:**

```json
{
  "tool_result": {
    "tool": "file_read",
    "success": false,
    "error": "File not found: src/missing.ts"
  }
}
```

**Rationale:**

- **Clear Success/Failure**: Model knows immediately if tool worked
- **Consistent Format**: Every tool result has same structure
- **Easy Error Handling**: Model can check `success` field
- **Debuggability**: Structured logs are easier to inspect
- **Future-Proof**: Can add metadata (timing, token cost, etc.)

**Why Not Alternatives:**

- Raw content: Model must infer success/failure
- Conversational: Wastes tokens, adds ambiguity
- Structured: Best signal-to-noise for small models

---

### 6. JSON Parsing: Belt and Suspenders

**Two-Layer Approach:**

```typescript
// Layer 1: System prompt instruction
const SYSTEM_PROMPT = `
IMPORTANT: Output raw JSON only. Do not wrap in markdown code blocks.

Correct:
{ "tool": "file_read", "args": { "path": "..." } }

Incorrect:
\`\`\`json
{ "tool": "file_read", "args": { "path": "..." } }
\`\`\`
`

// Layer 2: Parser strips markdown anyway
function stripMarkdown(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}
```

**Rationale:**

- Models don't always follow instructions
- Defense in depth prevents parsing failures
- Small overhead for robustness

---

### 7. Tool Arguments: Required Object with Zod Validation

**Design:**

```typescript
type Tool<TArgs = Record<string, unknown>> = {
  name: string
  description: string
  parameters: Record<string, unknown>
  argsSchema: z.ZodSchema<TArgs>
  execute: (args: TArgs) => Promise<ToolResult>
}

type ToolCall = {
  name: string
  args: Record<string, unknown>  // Required, can be empty {}
}
```

**Example:**

```typescript
const fileReadArgsSchema = z.object({
  path: z.string()
})

const fileReadTool: Tool<z.infer<typeof fileReadArgsSchema>> = {
  name: 'file_read',
  description: 'Read file contents',
  parameters: { path: 'string - Path to file' },
  argsSchema: fileReadArgsSchema,
  execute: async (args) => {
    // args is guaranteed to be { path: string }
    const { path } = args
    // read file...
  }
}
```

**Rationale:**

- **Type Safety**: `z.infer<>` gives compile-time types
- **Runtime Validation**: Catches LLM mistakes before crashes
- **Consistent Structure**: Every tool call has args (can be `{}`)
- **Simple**: One way to define tools, no optional complexity
- **Better Errors**: Zod provides clear validation messages

---

## Agent Loop Flow

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Parser
    participant LLM
    participant Tools

    User->>Agent: "Read src/index.ts"
    Agent->>Agent: buildContext(input, history, systemPrompt)
    
    loop Until done=true or error
        Agent->>LLM: generate(messages)
        LLM->>Agent: Raw response
        Agent->>Parser: parseResponse(raw)
        Parser->>Parser: Strip markdown
        Parser->>Parser: Parse JSON with Zod
        
        alt Valid tool call
            Parser->>Agent: ToolCall object
            Agent->>Tools: execute(toolCall)
            Tools->>Tools: Validate args with Zod
            Tools->>Agent: ToolResult
            Agent->>Agent: Format as tool_result, add to messages
        else Done signal
            Parser->>Agent: FinalResponse object
            Agent->>User: Return response
        else Parse error
            Parser->>Agent: ParseError
            Agent->>Agent: Format error message, add to messages
        end
    end
```

---

## Module Design

### Classes vs Functions

**Classes (Stateful Services):**

- `OllamaService` - HTTP connection, model config
- `ToolRegistry` - Tool map, execution
- `ConversationHistory` - Message list

**Functions (Pure Logic):**

- `runAgent()` - Orchestration loop
- `buildContext()` - Message array assembly
- `parseResponse()` - String to structured data
- `stripMarkdown()` - Text transformation

---

### Service Interfaces (Colocated with Implementation)

```typescript
// src/llm/service.ts
export interface LLMService {
  generate(messages: Message[]): Promise<LLMResponse>
}

export class OllamaService implements LLMService {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string
  ) {}

  async generate(messages: Message[]): Promise<LLMResponse> {
    // HTTP call to Ollama API
    // Return structured response
  }
}
```

```typescript
// src/tools/registry.ts
export interface IToolRegistry {
  register(tool: Tool): void
  execute(toolCall: ToolCall): Promise<ToolResult>
  list(): Tool[]
}

export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, Tool> = new Map()

  register(tool: Tool): void {
    // Add tool to registry
  }

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name)
    
    if (!tool) {
      return { success: false, error: `Tool not found: ${toolCall.name}` }
    }
    
    // Validate args with Zod
    const parsed = tool.argsSchema.safeParse(toolCall.args)
    
    if (!parsed.success) {
      return { 
        success: false, 
        error: `Invalid args: ${parsed.error.message}` 
      }
    }
    
    // Execute with validated args
    return await tool.execute(parsed.data)
  }

  list(): Tool[] {
    // Return all registered tools
  }
}
```

```typescript
// src/context/history.ts
export interface IConversationHistory {
  add(message: Message): void
  getAll(): Message[]
  getRecent(count: number): Message[]
  clear(): void
}

export class ConversationHistory implements IConversationHistory {
  private messages: Message[] = []

  add(message: Message): void { }
  getAll(): Message[] { }
  getRecent(count: number): Message[] { }
  clear(): void { }
}
```

---

### Tool Definitions (Plain Objects)

```typescript
// src/tools/file-ops.ts
const fileReadArgsSchema = z.object({
  path: z.string()
})

export const fileReadTool: Tool<z.infer<typeof fileReadArgsSchema>> = {
  name: 'file_read',
  description: 'Read contents of a file',
  parameters: {
    path: 'string - Path to file'
  },
  argsSchema: fileReadArgsSchema,
  execute: async (args) => {
    // args is typed as { path: string }
    // Validate args (done by registry)
    // Read file
    // Return ToolResult
  }
}

const fileWriteArgsSchema = z.object({
  path: z.string(),
  content: z.string()
})

export const fileWriteTool: Tool<z.infer<typeof fileWriteArgsSchema>> = {
  name: 'file_write',
  description: 'Write content to a file',
  parameters: {
    path: 'string - Path to file',
    content: 'string - Content to write'
  },
  argsSchema: fileWriteArgsSchema,
  execute: async (args) => {
    // args is typed as { path: string, content: string }
    // Validate args (done by registry)
    // Write file
    // Return ToolResult
  }
}
```

**Rationale:**

- Plain objects are simpler than classes
- Easy to test (just functions)
- Natural for registry pattern
- Zod handles all validation
- Can add more sophisticated tools later if needed

---

## System Prompt Design

```typescript
// src/context/prompts.ts
export const SYSTEM_PROMPT = `
You are a coding assistant with access to tools.

RESPONSE FORMAT:
You must respond with valid JSON only. No markdown, no explanations outside JSON.

To use a tool:
{
  "tool": "tool_name",
  "args": {
    "arg1": "value1",
    "arg2": "value2"
  }
}

For tools with no arguments:
{
  "tool": "tool_name",
  "args": {}
}

When you have the final answer:
{
  "done": true,
  "response": "Your complete answer here"
}

AVAILABLE TOOLS:
- file_read: Read a file's contents
  Args: { "path": "string" }

- file_write: Write content to a file
  Args: { "path": "string", "content": "string" }

TOOL RESULTS:
You will receive tool results in this format:
{
  "tool_result": {
    "tool": "tool_name",
    "success": true,
    "data": "result data"
  }
}

Or on failure:
{
  "tool_result": {
    "tool": "tool_name",
    "success": false,
    "error": "error message"
  }
}

IMPORTANT:
- Always output valid JSON
- Do not wrap JSON in markdown code blocks
- Check tool_result.success before proceeding
- Use multiple tool calls if needed before responding with "done"
`
```

---

## Dependency Injection Pattern

```typescript
// src/index.ts - Manual DI for Phase 1

async function main() {
  // Initialize services
  const llm = new OllamaService(
    'http://localhost:11434',
    'qwen2.5-coder:3b'
  )
  
  const tools = new ToolRegistry()
  tools.register(fileReadTool)
  tools.register(fileWriteTool)
  
  const history = new ConversationHistory()
  
  // Create context builder
  const contextBuilder = {
    buildInitial: (input: string) => 
      buildContext(input, history.getAll(), SYSTEM_PROMPT)
  }
  
  // Assemble services
  const services: AgentServices = {
    llm,
    tools,
    context: contextBuilder
  }
  
  // Run agent
  const userInput = "Read src/index.ts and summarize it"
  const result = await runAgent(userInput, services)
  
  console.log(result)
  
  // Learning addition: Log metrics if available
  if (result.metrics) {
    console.log('Metrics:', result.metrics)
  }
}
```

**Rationale:**

- Explicit dependencies make testing easier
- Can swap implementations (mock LLM, different tools)
- Clear initialization order
- Can add factory/builder pattern later

---

## Implementation Phases

### Phase 1: Core Agent Loop

**Goals:**

- Understand agent mechanics
- Handle tool calling protocol
- Deal with failure modes

**Tasks:**

1. Setup project (package.json, tsconfig, dependencies)
2. Implement OllamaService (HTTP client)
3. Implement response parser (markdown stripping, Zod validation)
4. Implement ToolRegistry
5. Create one tool (file_read)
6. Implement agent loop (runAgent function)
7. Add `tests/integration/agent-workflow.test.ts` for single-tool and multi-tool loops

**Success Criteria:**

- Agent can call file_read tool
- Agent handles malformed responses
- Agent completes with "done" signal
- Understand why it fails when it does

**Learning Experiment:** Once basic tool calling works, try the same prompt with temp=0, 0.3, and 0.7 to see the impact

---

### Phase 2: Additional Tools

**Goals:**

- Real-world agent behavior
- Error handling patterns

**Tasks:**

1. Add file_write tool
2. Add command execution tool (run shell commands)
3. Implement error recovery strategies
4. Add conversation history management
5. Test multi-tool workflows

**Success Criteria:**

- Agent can chain multiple tool calls
- Agent recovers from errors
- Agent stays within context limits

**Learning Note:** Keep a tally of failure types (parse errors, tool failures, context overflow) to identify patterns

---

### Phase 3: CLI Interface

**Goals:**

- Usable tool for development

**Tasks:**

1. Add CLI framework (commander or yargs)
2. Implement interactive mode
3. Add command history
4. Pretty output formatting

**Success Criteria:**

- Can use agent from terminal
- Conversation persists across inputs
- Clear output formatting

---

## Testing Strategy

This is a learning project so deprioritize testing in favor of learning unless testing provides learning value.

### Phase 1 Approach:

- Baseline: integration tests via `vitest` for core flows; manual testing for exploration
- Focus on understanding failure modes
- Add tests after learning edge cases

### Future Testing:

```
tests/
├── agent/
│   ├── core.test.ts           # Agent loop logic
│   └── parser.test.ts         # Response parsing
├── llm/
│   └── service.test.ts        # Mock HTTP calls
└── tools/
    ├── registry.test.ts       # Tool execution
    └── file-ops.test.ts       # File operations

integration_tests/
└── agent-workflow.test.ts     # End-to-end scenarios
```

---

## Open Questions for Implementation

1. **Token Counting:**
    
    - Use simple heuristic (chars / 4)?
    - Use tokenizer library?
    - Query Ollama API for token count?
    - **Learning:** Track actual vs estimated to calibrate
2. **Max Iterations:**
    
    - What's a reasonable limit? (10? 20?)
    - Should it be configurable?
    - **Learning:** Start with 10, see what tasks need more
3. **Tool Timeout:**
    
    - Should tools have execution timeout?
    - What's reasonable for file operations?
    - **Learning:** Add 5s default, log when timeouts occur
4. **Logging:**
    
    - How verbose should logging be?
    - File logging or just console?
    - Structured logs (JSON) or human-readable?
    - **Learning:** Start with verbose console logs, you can reduce later
5. **Configuration:**
    
    - What should be configurable? (model, base URL, max iterations, context limit)
    - Config file format? (JSON, YAML, TypeScript)
    - Environment variables?
    - **Learning:** Start hardcoded, extract to config as patterns emerge

---

## Learning Artifacts

### Simple Experiment Log

Create `learning/experiments.md`:

```markdown
# Experiment Log

## Date: [Date]
**What I Tried:** 
**Expected:** 
**What Happened:** 
**Surprised By:** 
**Next Question:** 

---
```

### Failure Patterns

As you discover failure modes, document them:

```markdown
# Failure Pattern: [Name]
**Frequency:** How often
**Trigger:** What causes it
**Solution:** What fixed it
**Insight:** What this teaches
```

---

## Success Metrics

**Technical:**

- Agent completes multi-tool workflows
- Error recovery works 80%+ of the time
- Context management prevents overflow
- Response parsing handles edge cases

**Learning:**

- Understand why agents fail
- Know when to retry vs give up
- Recognize prompt engineering importance
- See small model limitations
- Can predict failure modes from prompts
- Understand temperature impact on reliability

**Practical:**

- Actually use the tool for coding tasks
- Tool saves time vs manual work
- Can explain how it works to others

---

## Key Takeaways

1. **Keep It Simple**: One way to do things, no optional complexity
2. **Validate Everything**: Small models make mistakes, Zod catches them
3. **Explicit Over Implicit**: Clear signals and error messages help models
4. **Type Safety**: Runtime validation + compile-time types = fewer bugs
5. **Learn By Doing**: Manual DI and simple patterns reveal how agents work
6. **Document Surprises**: Future you will thank present you for writing down what broke and why