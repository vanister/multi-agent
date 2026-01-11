# Multi-Agent

AI agent MVP built for learning how small-model agents work, how tool calls fail, and how to
recover gracefully. It currently targets local Ollama models (default: qwen2.5-coder:3b) and focuses
on a clean tool-calling pipeline rather than breadth of tools.

The agent identity is configurable via `.env` - by default it specializes in coding tasks, but can be
customized for research, writing, data analysis, or other domains.

## Status
- Core services, parser, tool registry, and agent loop complete with integration tests
- CLI entry point (`ask`) is usable; richer CLI/UX and output formatting are still in progress
- See docs/tasks.md for the phase checklist and remaining CLI work

## Requirements
- Node.js 18+
- npm
- Ollama running locally (`ollama serve`) with the `qwen2.5-coder:3b` model pulled
- Local filesystem access (the built-in `file_read` tool reads from your workspace)

## Setup
```sh
npm install
# optional: export custom defaults
# export OLLAMA_BASE_URL=http://localhost:11434
# export OLLAMA_MODEL=qwen2.5-coder:3b
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
- src/agent: run loop, parser, schemas, helpers
- src/cli: commander wiring, ask command, formatters
- src/context: system prompt and context builder
- src/tools: tool registry, file read, calculator
- src/llm: Ollama client and HTTP abstraction
- src/conversation: in-memory repository and service
- docs/: quick-reference, tasks, technical notes

## Testing
```sh
npm test
npm run test:integration
npm run test:coverage
```

## License
MIT — see [LICENSE](./LICENSE) for details.
