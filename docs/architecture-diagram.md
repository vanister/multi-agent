# Architecture Adaptability Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   GENERAL-PURPOSE AGENT FRAMEWORK                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  USER INPUT (Any Request)                                        │
│  "Write code" | "Research topic" | "Analyze data" | "Help customer"│
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONFIGURATION LAYER (Customizable)                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ System Role  │  │ LLM Model    │  │ Tools        │          │
│  │ (Who am I?)  │  │ (Which LLM?) │  │ (What can I do?)│       │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│        │                   │                   │                 │
│   "Coding        "qwen2.5-coder"      fileRead,                 │
│   assistant"          :3b            calculate                  │
│        │                   │                   │                 │
│   "Research      "llama3:70b"     searchPapers,                 │
│   assistant"                       citations                    │
│        │                   │                   │                 │
│   "Customer      "mistral:7b"      lookupOrder,                 │
│   service"                         refunds                      │
└────────┬─────────────────┬─────────────────┬───────────────────┘
         │                 │                 │
         └────────────┬────┴────┬────────────┘
                      ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CORE AGENT LOOP (Task-Agnostic) ✅ NO CHANGES NEEDED            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Context Builder                                        │   │
│  │    - Assembles system prompt + history                    │   │
│  │    - Works with ANY role, ANY tools                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 2. LLM Service (Model-Agnostic Interface)                 │   │
│  │    - chat(messages) → response                            │   │
│  │    - Works with Ollama, OpenAI, Anthropic, etc.          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 3. Parser & Validator                                     │   │
│  │    - Extracts tool calls or completion signal             │   │
│  │    - Domain-agnostic JSON parsing                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 4. Tool Registry (Extensible)                             │   │
│  │    - execute(toolCall) → result                           │   │
│  │    - Works with ANY tool type                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 5. Error Recovery                                         │   │
│  │    - Handles parse errors, tool failures                  │   │
│  │    - Universal error handling                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  RESULT (Success or Error)                                       │
│  { success: true, response: "...", metrics: {...} }             │
└─────────────────────────────────────────────────────────────────┘


CONFIGURATION EXAMPLES
═══════════════════════════════════════════════════════════════

┌──────────────────┬─────────────────┬────────────────────────────┐
│ Domain           │ Model           │ Tools                      │
├──────────────────┼─────────────────┼────────────────────────────┤
│ Coding           │ qwen2.5-coder   │ fileRead, calculate, git   │
│ Research         │ llama3:70b      │ searchPapers, citations    │
│ Customer Service │ mistral:7b      │ lookupOrder, refunds       │
│ Data Analysis    │ qwen2.5-coder   │ loadData, plot, stats      │
│ Creative Writing │ llama3:8b       │ thesaurus, grammar         │
│ General Assistant│ llama3:8b       │ fileRead, calculate, web   │
└──────────────────┴─────────────────┴────────────────────────────┘


DEPENDENCY INJECTION FLOW
═══════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────┐
│                     Service Factory                            │
│                                                                │
│  createServices({                                              │
│    conversationId,                                             │
│    model: "llama3:8b",              ← Choose model            │
│    tools: [tool1, tool2, ...]       ← Inject custom tools     │
│  })                                                            │
│                                                                │
│  Returns: {                                                    │
│    llm: LlmService,                 ← Any LLM provider        │
│    conversation: ConversationService, ← State management      │
│    tools: ToolRegistry              ← Domain tools            │
│  }                                                             │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                     Agent Execution                            │
│                                                                │
│  runAgent(                                                     │
│    userInput: "Any request",        ← Generic input           │
│    systemPrompt: buildSystemPrompt( ← Configurable role       │
│      tools, "You are a..."                                    │
│    ),                                                          │
│    services: {...},                 ← Injected services       │
│    config: {...}                    ← Runtime config          │
│  )                                                             │
└───────────────────────────────────────────────────────────────┘


KEY ADAPTABILITY FEATURES
═══════════════════════════════════════════════════════════════

✅ Model-Agnostic
   - LlmService interface works with any provider
   - Just swap implementation (Ollama → OpenAI → Anthropic)

✅ Tool-Agnostic
   - Tools are simple { name, description, execute() } objects
   - Register ANY domain-specific tools

✅ Task-Agnostic
   - Agent loop has NO hardcoded domain logic
   - All task specificity comes from tools + prompt

✅ Prompt-Configurable
   - System role fully customizable
   - Can be set per use case or per request

✅ Dependency Injection
   - All services passed as parameters
   - Easy to mock, swap, or extend


WHAT MAKES IT ADAPTABLE
═══════════════════════════════════════════════════════════════

❌ BAD (Hardcoded):
   if (taskType === 'coding') {
     // Do coding stuff
   } else if (taskType === 'research') {
     // Do research stuff
   }

✅ GOOD (This Codebase):
   - Tools define capabilities
   - Prompt defines behavior
   - Agent just orchestrates
   - No task-specific branches


MINIMAL CHANGES NEEDED
═══════════════════════════════════════════════════════════════

Before:  buildSystemPrompt(tools)
         → "You are a coding assistant..."

After:   buildSystemPrompt(tools, agentRole)
         → agentRole || "You are a helpful assistant..."

That's it! Everything else already worked for any domain.
```
