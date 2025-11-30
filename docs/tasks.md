# Complete Task List for Coding Agent MVP

This list is based off of the [technical-design.md](./technical-design.md) file.

## Phase 1: Project Setup & Foundation
*Goal: Establish project structure and core dependencies*

1. **Initialize Project**
   1. [x] Create project directory structure
   2. [x] Initialize npm project with TypeScript
   3. [x] Configure `tsconfig.json` with strict settings
   4. [x] Setup `.gitignore` for Node/TypeScript

2. **Install Dependencies**
   1. [x] Core: `typescript`, `tsx` (for running TS directly)
   3. [x] Validation: `zod`
   4. [x] CLI: `commander` 
   5. [x] `tsx` watch mode

3. **Create Type System** (do these when they're needed, not now)
   1. [-] Define `src/shared/types.d.ts` with Message, LLMResponse
   2. [-] Define `src/tools/types.d.ts` with Tool, ToolCall, ToolResult
   3. [-] Define `src/agent/types.d.ts` with AgentServices

4. **Setup Ollama**
   1. [x] Install Ollama via Homebrew
   2. [x] Start Ollama service
   3. [x] Pull qwen2.5-coder:3b model


## Phase 2: Core Services & Components
*Goal: Build the foundational services that the agent will use*

1. **LLM Service** (`src/llm/LlmService.ts`)
   1. [x] Define LLMService interface
   2. [x] Implement OllamaLlmService class
   3. [x] Handle HTTP communication with Ollama API (via HttpClient abstraction)
   4. [x] Add error handling for network failures (LlmError, OllamaApiError)
   5. [x] Create HttpClient abstraction and FetchHttpClient implementation
   6. [x] Organize types in llm-types.d.ts and http-client-types.d.ts

2. **Tool System** (`src/tools/`)
   1. [ ] Implement ToolRegistry class with register/execute/list methods
   2. [ ] Add Zod validation in execute method
   3. [ ] Create file_read tool with args schema
   4. [ ] Create file_write tool with args schema

3. **Parser** (`src/agent/parser.ts`)
   1. [ ] Implement stripMarkdown function
   2. [ ] Create parseResponse function with Zod schemas
   3. [ ] Handle three cases: tool call, done signal, error
   4. [ ] Add comprehensive error messages

4. **Context Builder** (`src/context/`)
   1. [ ] Create buildContext pure function
   2. [ ] Design SYSTEM_PROMPT with JSON format instructions
   3. [ ] Implement ConversationHistory class
   4. [ ] Add token estimation function (chars/4 heuristic)


## Phase 3: Agent Loop Implementation
*Goal: Create the core agent orchestration logic*

1. **Agent Core** (`src/agent/core.ts`)
   1. [ ] Implement runAgent function
   2. [ ] Setup initial context with system prompt
   3. [ ] Create main loop with iteration limit (10-20)
   4. [ ] Add message array management

2. **Tool Execution Flow**
   1. [ ] Parse LLM response for tool calls
   2. [ ] Execute tools via registry
   3. [ ] Format tool results as messages
   4. [ ] Add results back to conversation

3. **Error Recovery**
   1. [ ] Handle parse errors with explicit feedback
   2. [ ] Implement retry logic with guidance
   3. [ ] Add context limit checking (80% threshold)
   4. [ ] Prevent infinite loops

4. **Completion Handling**
   1. [ ] Detect done signal
   2. [ ] Extract final response
   3. [ ] Clean up resources
   4. [ ] Return structured result

5. **Integration Testing**
   1. [ ] Test single tool workflows
   2. [ ] Test multi-tool chaining
   3. [ ] Test error recovery scenarios
   4. [ ] Test context limit behavior


## Phase 4: Interactive CLI Mode
*Goal: Create usable interface for real-world testing*

1. **CLI Framework** (`src/cli/`)
   1. [ ] Setup commander with basic commands
   2. [ ] Add `chat` command for interactive mode
   3. [ ] Add `run` command for single queries
   4. [ ] Implement configuration loading

2. **Interactive Loop** (`src/cli/commands.ts`)
   1. [ ] Create REPL-style interaction
   2. [ ] Maintain conversation history across inputs
   3. [ ] Add graceful exit handling (Ctrl+C)
   4. [ ] Display tool calls in real-time

3. **Output Formatting**
   1. [ ] Pretty-print agent responses
   2. [ ] Show tool execution with indicators
   3. [ ] Color-code different message types
   4. [ ] Add progress indicators for long operations

4. **Dependency Injection** (`src/index.ts`)
   1. [ ] Wire up all services manually
   2. [ ] Initialize with configuration
   3. [ ] Handle startup errors gracefully
   4. [ ] Add debug mode with verbose logging


## Validation Checklist for MVP

### Learning Objectives
- [ ] Understand why tool calls fail
- [ ] Can debug malformed JSON responses  
- [ ] Know how context limits affect behavior
- [ ] Recognize prompt engineering importance
- [ ] See qwen2.5-coder:3b limitations firsthand

### Technical Requirements
- [ ] Agent can read files
- [ ] Agent can write files
- [ ] Agent handles errors gracefully
- [ ] Agent completes with explicit signal
- [ ] Context doesn't overflow

### Practical Usage
- [ ] Can run from command line
- [ ] Interactive mode maintains state
- [ ] Clear output shows what's happening
- [ ] Actually useful for simple coding tasks

## Next Steps After MVP
- [ ] Add command execution tool
- [ ] Compare 3b vs 7b model behavior
- [ ] Implement RAG (Phase 3 in learning path)
- [ ] Add planning capabilities
- [ ] Build style enforcement features