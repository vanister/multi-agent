# Complete Task List for Coding Agent MVP

See the [quick-reference](./quick-reference.md) for design decisions.

## Phase 1: Project Setup & Foundation

_Goal: Establish project structure and core dependencies_

1. **Initialize Project**
   1. [x] Create project directory structure
   2. [x] Initialize npm project with TypeScript
   3. [x] Configure `tsconfig.json` with strict settings
   4. [x] Setup `.gitignore` for Node/TypeScript

2. **Install Dependencies**
   1. [x] Core: `typescript`, `tsx` (for running TS directly)
   2. [x] Validation: `zod`
   3. [x] CLI: `commander`
   4. [x] `tsx` watch mode

3. **Create Type System** (do these when they're needed, not now)
   1. [-] Define `src/shared/types.d.ts` with Message, LLMResponse
   2. [-] Define `src/tools/types.d.ts` with Tool, ToolCall, ToolResult
   3. [-] Define `src/agent/types.d.ts` with AgentServices

4. **Setup Ollama**
   1. [x] Install Ollama via Homebrew
   2. [x] Start Ollama service
   3. [x] Pull qwen2.5-coder:3b model

## Phase 2: Core Services & Components

_Goal: Build the foundational services that the agent will use_

1. **LLM Service** (`src/llm/LlmService.ts`)
   1. [x] Define LLMService interface
   2. [x] Implement OllamaLlmService class
   3. [x] Handle HTTP communication with Ollama API (via HttpClient abstraction)
   4. [x] Add error handling for network failures (LlmError, OllamaApiError)
   5. [x] Create HttpClient abstraction and FetchHttpClient implementation
   6. [x] Organize types in llm-types.d.ts and http-client-types.d.ts
   7. [x] Refactor to be stateless (accepts Message[])

2. **Conversation Management** (`src/conversation/`)
   1. [x] Define ConversationRepository interface with CRUD operations
   2. [x] Implement InMemoryConversationRepository
   3. [x] Create ConversationHistoryService interface
   4. [x] Implement InMemoryConversationHistoryService
   5. [x] Add specific error classes (ConversationNotFoundError, ConversationAlreadyExistsError)
   6. [x] Organize types in conversation-types.d.ts
   7. [x] Add token estimation function (chars/4 heuristic)

3. **Tool System** (`src/tools/`)
   1. [x] Implement ToolRegistry class with register/execute/list methods
   2. [x] Add Zod validation in execute method
   3. [x] Create file_read tool with args schema
          ~~4. [ ] Create file_write tool with args schema~~

4. **Parser** (`src/agent/parser.ts`)
   1. [x] Implement `stripMarkdown` function
   2. [x] Create `parseResponse` function with Zod schemas
   3. [x] Handle three cases: tool call, done signal, error
   4. [ ] Add comprehensive error messages

5. **Context Builder** (`src/context/`)
   1. [ ] Create buildContext pure function
   2. [ ] Design SYSTEM_PROMPT with JSON format instructions

6. **Integration Testing**
   1. [ ] Test integration with Ollama through `LlmService`
   2. [ ] Complete integration with all services and components

## Phase 3: Agent Loop Implementation

_Goal: Create the core agent orchestration logic_

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

_Goal: Create usable interface for real-world testing_

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
