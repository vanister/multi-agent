# Codebase Adaptability Analysis: Coding Agent → General-Purpose Agent

## Executive Summary

**Adaptability Score: 9/10 - Highly Adaptable**

The codebase is **exceptionally well-positioned** to transform from a coding-specific agent into a general-purpose agent. The architecture follows strong separation of concerns, uses dependency injection, and has minimal hardcoded coding-specific logic. Most of the "coding" specificity exists in:

1. System prompts (easily changed)
2. Tool definitions (already designed for extensibility)
3. Documentation/naming (cosmetic)

**Key Strengths:**
- Clean interface-based design allows swapping implementations
- Tool registry is domain-agnostic and extensible
- Agent loop has no coding-specific logic
- LLM service abstraction supports any model/provider
- Context management is task-agnostic

**Minimal Changes Required:**
- Update system prompt to be task-agnostic (~10 lines)
- Rename project/references (cosmetic, optional)
- Documentation updates

---

## Architecture Analysis

### 1. Core Agent Loop (`src/agent/core.ts`)

**Current State:**
- The `runAgent` function is completely task-agnostic
- No hardcoded assumptions about coding tasks
- Generic tool execution pipeline
- Model-agnostic message handling

**Adaptability: 10/10**

```typescript
// This function already works for ANY task type
export async function runAgent(
  userInput: string,        // Any user request
  systemPrompt: string,     // Can be customized per use case
  services: AgentServices,  // All injected, no hardcoded behavior
  config?: Partial<AgentConfig>
): Promise<AgentResult>
```

**Required Changes:** ✅ None - already perfect

---

### 2. System Prompts (`src/context/prompts.ts`)

**Current State:**
```typescript
export function buildSystemPrompt(tools: ToolMetadata[]): string {
  return `
You are a coding assistant with access to tools.
// ... rest of prompt
`.trim();
}
```

**Adaptability: 8/10**

The only coding-specific text is:
- Line 5: "You are a coding assistant with access to tools"

**Required Changes:**
```typescript
export function buildSystemPrompt(tools: ToolMetadata[], role?: string): string {
  const agentRole = role || 'You are a helpful assistant with access to tools';
  return `
${agentRole}

RESPONSE FORMAT:
// ... rest stays the same
`.trim();
}
```

**Alternative (more flexible):**
```typescript
export function buildSystemPrompt(
  tools: ToolMetadata[], 
  systemMessage: string = 'You are a helpful assistant with access to tools'
): string {
  return `
${systemMessage}

RESPONSE FORMAT:
// ... rest stays the same
`.trim();
}
```

---

### 3. Tool System (`src/tools/`)

**Current State:**
- `ToolRegistry` is completely domain-agnostic
- Generic `Tool` interface works for any domain
- Current tools: `file_read`, `calculate`

**Adaptability: 10/10**

The tool system is **perfectly designed** for extensibility:

```typescript
export type Tool = ToolMetadata & {
  argsSchema: z.ZodSchema<Record<string, unknown>>;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
};
```

**Example - Adding Domain-Specific Tools:**

```typescript
// For a research agent
const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for information',
  parameters: { query: 'string - Search query' },
  argsSchema: z.object({ query: z.string() }),
  execute: async (args) => {
    // Implementation
  }
};

// For a data analysis agent
const plotDataTool: Tool = {
  name: 'plot_data',
  description: 'Create a data visualization',
  parameters: { data: 'array - Data points', type: 'string - Chart type' },
  argsSchema: z.object({ 
    data: z.array(z.number()), 
    type: z.enum(['line', 'bar', 'scatter']) 
  }),
  execute: async (args) => {
    // Implementation
  }
};

// For a customer service agent
const lookupOrderTool: Tool = {
  name: 'lookup_order',
  description: 'Look up customer order by ID',
  parameters: { orderId: 'string - Order ID' },
  argsSchema: z.object({ orderId: z.string() }),
  execute: async (args) => {
    // Implementation
  }
};
```

**Required Changes:** ✅ None - just register different tools

---

### 4. LLM Service (`src/llm/LlmService.ts`)

**Current State:**
```typescript
export interface LlmService {
  chat(messages: Message[]): Promise<LlmResult>;
}

export class OllamaLlmService implements LlmService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs: number = 30000
  ) {}
}
```

**Adaptability: 10/10**

The LLM service is:
- Model-agnostic (accepts any Ollama model via config)
- Provider-agnostic (interface-based, can add OpenAI/Anthropic implementations)
- Already configurable via environment variables

**Example - Adding OpenAI Support:**
```typescript
export class OpenAiLlmService implements LlmService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly apiKey: string,
    private readonly model: string = 'gpt-4'
  ) {}

  async chat(messages: Message[]): Promise<LlmResult> {
    // OpenAI API implementation
  }
}
```

**Required Changes:** ✅ None - can add providers without changing existing code

---

### 5. Service Factory (`src/cli/serviceFactory.ts`)

**Current State:**
```typescript
export function createServices({
  conversationId,
  model = OLLAMA_MODEL,
  baseUrl = OLLAMA_BASE_URL,
  timeoutMs = OLLAMA_TIMEOUT_MS
}: ServiceFactoryOptions): AgentServices {
  // ... creates services
  
  // register built-in tools
  toolRegistry.register(fileReadTool);
  toolRegistry.register(calculateTool);
  
  return { llm, conversation, tools };
}
```

**Adaptability: 9/10**

Currently hardcodes two tools, but this is the **correct place** to configure domain-specific behavior.

**Suggested Enhancement:**
```typescript
export type ServiceFactoryOptions = {
  conversationId: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  tools?: Tool[];  // Allow custom tool injection
};

export function createServices({
  conversationId,
  model = OLLAMA_MODEL,
  baseUrl = OLLAMA_BASE_URL,
  timeoutMs = OLLAMA_TIMEOUT_MS,
  tools = [fileReadTool, calculateTool]  // Default tools
}: ServiceFactoryOptions): AgentServices {
  // ... creates services
  
  // Register provided tools
  tools.forEach(tool => toolRegistry.register(tool));
  
  return { llm, conversation, tools: toolRegistry };
}
```

---

### 6. CLI Interface (`src/index.ts`, `src/cli/`)

**Current State:**
```typescript
program
  .name('coding-agent')
  .description('AI coding assistant with tool support')
```

**Adaptability: 7/10**

Naming is coding-specific but functionality is generic.

**Suggested Changes:**
```typescript
program
  .name('agent-cli')
  .description('AI assistant with tool support for any task')
  
// Or keep it flexible:
program
  .name(process.env.AGENT_NAME || 'agent')
  .description(process.env.AGENT_DESCRIPTION || 'AI assistant with tool support')
```

---

### 7. Configuration (`src/config.ts`)

**Current State:**
```typescript
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';
export const SANDBOX_DIR = path.resolve(process.cwd(), './sandbox');
```

**Adaptability: 10/10**

Already supports:
- Any Ollama model (including non-coding models like llama3, mistral, etc.)
- Configurable base URL (could point to any Ollama-compatible API)
- Environment variable overrides

**To Use Different Models:**
```bash
# General conversation
export OLLAMA_MODEL=llama3:8b

# Medical research
export OLLAMA_MODEL=meditron:7b

# Legal analysis  
export OLLAMA_MODEL=mistral:7b

# Creative writing
export OLLAMA_MODEL=llama3:70b
```

---

## Use Case Examples: How to Adapt

### Example 1: Customer Service Agent

**Changes Required:**
1. Update system prompt:
```typescript
const customerServicePrompt = `
You are a helpful customer service agent with access to tools.
You can look up orders, process refunds, and answer product questions.
Always be polite and professional.
`;
```

2. Register domain tools:
```typescript
toolRegistry.register(lookupOrderTool);
toolRegistry.register(processRefundTool);
toolRegistry.register(checkInventoryTool);
```

3. Keep everything else the same ✅

---

### Example 2: Research Assistant

**Changes Required:**
1. Update system prompt:
```typescript
const researchPrompt = `
You are an academic research assistant with access to tools.
You can search papers, extract citations, and summarize findings.
Provide evidence-based answers with proper citations.
`;
```

2. Register research tools:
```typescript
toolRegistry.register(searchPapersTool);
toolRegistry.register(extractCitationsTool);
toolRegistry.register(summarizeDocumentTool);
```

3. Keep everything else the same ✅

---

### Example 3: Data Analysis Agent

**Changes Required:**
1. Update system prompt:
```typescript
const dataAnalysisPrompt = `
You are a data analysis assistant with access to tools.
You can load datasets, perform statistical analysis, and create visualizations.
Explain your findings clearly with supporting data.
`;
```

2. Register analysis tools:
```typescript
toolRegistry.register(loadDatasetTool);
toolRegistry.register(calculateStatsTool);
toolRegistry.register(createVisualizationTool);
toolRegistry.register(fitModelTool);
```

3. Keep everything else the same ✅

---

## Recommended Changes for Maximum Adaptability

### Priority 1: Essential Changes (30 minutes)

1. **Make system prompt configurable** (`src/context/prompts.ts`):
```typescript
export function buildSystemPrompt(
  tools: ToolMetadata[], 
  agentRole: string = 'You are a helpful assistant with access to tools'
): string {
  return `
${agentRole}

RESPONSE FORMAT:
// ... rest unchanged
`.trim();
}
```

2. **Add tool injection to service factory** (`src/cli/serviceFactory.ts`):
```typescript
export type ServiceFactoryOptions = {
  conversationId: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  tools?: Tool[];
};

export function createServices(options: ServiceFactoryOptions): AgentServices {
  // ...
  const tools = options.tools || [fileReadTool, calculateTool];
  tools.forEach(tool => toolRegistry.register(tool));
  // ...
}
```

3. **Add system prompt config** (`src/config.ts`):
```typescript
export const AGENT_SYSTEM_PROMPT = process.env.AGENT_SYSTEM_PROMPT || 
  'You are a helpful assistant with access to tools';
```

### Priority 2: Cosmetic Changes (15 minutes, optional)

1. **Rename project** (`package.json`):
```json
{
  "name": "general-agent",
  "description": "Configurable AI agent with tool support for any task"
}
```

2. **Update CLI names** (`src/index.ts`):
```typescript
program
  .name('agent')
  .description('AI assistant with tool support')
```

3. **Update documentation** (README.md, docs/*.md)

---

## Strengths: Why This Codebase Is Well-Designed

### 1. **Dependency Injection**
- All services passed as parameters, not instantiated internally
- Easy to swap implementations (mock LLM for testing, different tools per use case)

### 2. **Interface-Based Design**
```typescript
interface LlmService { chat(...): ... }
interface ToolRegistry { execute(...): ... }
interface ConversationService { add(...): ... }
```
- Any implementation that satisfies the interface works
- Can have multiple implementations (e.g., OllamaLlmService, OpenAILlmService)

### 3. **Functional Core, Imperative Shell**
- Pure functions for logic (parser, validators)
- Classes only for stateful services
- Easy to test, easy to understand

### 4. **Tool Protocol Is Universal**
```json
{ "tool": "tool_name", "args": {...} }
{ "done": true, "response": "..." }
```
- Works for any tool type
- LLM doesn't care what domain the tools are from

### 5. **No Hardcoded Business Logic**
- Agent loop is generic
- Context management is task-agnostic  
- Error recovery works for any tool failures

### 6. **Clean Separation of Concerns**
```
agent/     -> orchestration (domain-agnostic)
llm/       -> LLM communication (model-agnostic)
tools/     -> tool execution (extensible)
context/   -> prompt building (configurable)
cli/       -> user interface (presentational)
```

---

## Potential Enhancements for Multi-Domain Support

### 1. Configuration Profiles
```typescript
// profiles/coding-agent.ts
export const codingProfile = {
  systemPrompt: 'You are a coding assistant...',
  tools: [fileReadTool, calculateTool, gitTool],
  model: 'qwen2.5-coder:3b'
};

// profiles/research-agent.ts  
export const researchProfile = {
  systemPrompt: 'You are a research assistant...',
  tools: [searchPapersTool, citationTool],
  model: 'llama3:8b'
};

// Usage
agent.run(userInput, codingProfile);
```

### 2. Plugin System
```typescript
// plugins/web-search/index.ts
export const webSearchPlugin: AgentPlugin = {
  name: 'web-search',
  tools: [webSearchTool, crawlWebsiteTool],
  systemPromptAddition: 'You can search the web for current information.'
};

// Usage
agent.loadPlugin(webSearchPlugin);
```

### 3. Multi-Model Support
```typescript
// Already supported via interface!
const services = {
  llm: useOpenAI ? openAiService : ollamaService,
  conversation: conversationService,
  tools: toolRegistry
};
```

---

## Conclusion

**The codebase is exceptionally well-architected for adaptation to any domain.**

The only truly "coding-specific" elements are:
1. One line in the system prompt ("coding assistant")
2. Two registered tools (file_read, calculate)  
3. Documentation and naming

**To support any task type, you need to:**
1. Make system prompt configurable (10 lines of code)
2. Allow tool injection in service factory (5 lines of code)
3. Register different tools for different use cases (already possible)

**Everything else already works for any domain:**
- ✅ Agent loop is generic
- ✅ LLM service supports any model
- ✅ Tool registry is extensible
- ✅ Parser/validator are domain-agnostic
- ✅ Context management is universal
- ✅ Error recovery is task-independent

**Score Breakdown:**
- Architecture: 10/10 (perfect separation of concerns)
- Tool System: 10/10 (perfectly extensible)
- LLM Abstraction: 10/10 (model-agnostic)
- System Prompts: 8/10 (one string to change)
- Configuration: 10/10 (already flexible)
- Documentation: 7/10 (naming is coding-specific)

**Overall Adaptability: 9/10** 

This is a **learning project** that successfully demonstrates how to build a **truly general-purpose agent framework**. The "coding agent" is just one configuration of a much more powerful, flexible system.
