# Coding Agent

**Configurable AI agent framework** built for learning how agents work with any LLM model. While initially 
designed as a coding assistant, the architecture is **fully adaptable** to any task type - research, customer 
service, data analysis, creative writing, etc.

The framework demonstrates clean agent architecture with tool calling, error recovery, and graceful failure 
handling using small local models (via Ollama).

## Status
- ✅ Core agent loop, parser, tool registry complete with full test coverage
- ✅ Configurable system prompts and extensible tool system  
- ✅ CLI interface (`ask` command) ready to use
- ✅ Multi-domain adaptability verified (see `docs/adaptability-analysis.md`)
- 🚧 Interactive chat mode and richer output formatting in progress

## Adaptability

This codebase is **highly adaptable** (9/10) to different use cases:

```bash
# Use as coding assistant (default)
export AGENT_SYSTEM_ROLE="You are a coding assistant with access to tools"
export OLLAMA_MODEL=qwen2.5-coder:3b

# Use as research assistant
export AGENT_SYSTEM_ROLE="You are an academic research assistant"
export OLLAMA_MODEL=llama3:70b

# Use as customer service bot
export AGENT_SYSTEM_ROLE="You are a helpful customer service agent"
export OLLAMA_MODEL=mistral:7b
```

**See [docs/multi-domain-usage.md](./docs/multi-domain-usage.md)** for examples and [docs/adaptability-analysis.md](./docs/adaptability-analysis.md) for technical details.

## Requirements
- Node.js 18+
- npm
- Ollama running locally (`ollama serve`) with the `qwen2.5-coder:3b` model pulled
- Local filesystem access (the built-in `file_read` tool reads from your workspace)

## Setup
```sh
npm install

# Configure for your use case (optional)
cp .env.example .env
# Edit .env to set OLLAMA_MODEL and AGENT_SYSTEM_ROLE

# Or use environment variables directly
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_MODEL=qwen2.5-coder:3b
export AGENT_SYSTEM_ROLE="You are a helpful assistant with access to tools"
```

## Run the agent
```sh
npm run ask -- "Summarize sandbox/some-file.txt"
```
Options:
- `--model <name>`: override the Ollama model (defaults to `qwen2.5-coder:3b`)
- `--max-iterations <n>`: cap the agent loop (defaults to 10)
- `--show-metrics`: print timing/tool info
- `--verbose`: include stack traces on errors

## How it works (short version)
- Context builder assembles a system prompt plus conversation history
- Parser enforces the JSON tool-call protocol and feeds errors back for retries
- Tool registry validates args with Zod and runs registered tools (file read, calculator)
- Agent loop streams between LLM responses, tool executions, and completion detection
- In-memory conversation store keeps each run isolated by `conversationId`

## Project structure
- src/agent: run loop, parser, schemas, helpers (task-agnostic)
- src/cli: commander wiring, ask command, formatters
- src/context: system prompt builder (configurable)
- src/tools: tool registry (extensible), file read, calculator
- src/llm: Ollama client and HTTP abstraction (model-agnostic)
- src/conversation: in-memory repository and service
- docs/: architecture docs, adaptability analysis, usage guides

## Testing
```sh
npm test
npm run test:integration
npm run test:coverage
```

## Extending the Agent

The agent is designed for easy extension:

### Add Custom Tools

```typescript
import { z } from 'zod';
import type { Tool } from './src/tools/tool-types.js';

const myTool: Tool = {
  name: 'my_tool',
  description: 'What the tool does',
  parameters: { arg1: 'string - Description' },
  argsSchema: z.object({ arg1: z.string() }),
  execute: async (args) => {
    // Your logic here
    return { success: true, data: result };
  }
};

// Register in serviceFactory.ts
toolRegistry.register(myTool);
```

### Use Different LLM Providers

The `LlmService` interface makes it easy to add OpenAI, Anthropic, or any other provider:

```typescript
export class OpenAiLlmService implements LlmService {
  async chat(messages: Message[]): Promise<LlmResult> {
    // OpenAI API implementation
  }
}
```

### Customize for Different Domains

See `docs/multi-domain-usage.md` for detailed examples of configuring the agent for:
- Research and academic work
- Customer service
- Data analysis  
- Creative writing
- And more...

## License
MIT — see [LICENSE](./LICENSE) for details.
