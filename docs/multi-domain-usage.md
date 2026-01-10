# Multi-Domain Agent Usage Examples

This document demonstrates how to configure the agent for different use cases beyond coding.

## Quick Start: Changing Agent Behavior

The agent's behavior can be customized through:
1. **Environment variables** - Configure the agent role and model
2. **Custom tools** - Register domain-specific tools
3. **Model selection** - Choose appropriate models for different tasks

## Configuration Methods

### Method 1: Environment Variables (Easiest)

Create a `.env` file or export variables:

```bash
# General conversation agent
export OLLAMA_MODEL=llama3:8b
export AGENT_SYSTEM_ROLE="You are a helpful assistant"

# Research assistant
export OLLAMA_MODEL=llama3:70b
export AGENT_SYSTEM_ROLE="You are an academic research assistant with access to tools. Provide evidence-based answers with proper citations."

# Customer service agent
export OLLAMA_MODEL=mistral:7b
export AGENT_SYSTEM_ROLE="You are a professional customer service agent. Be polite, helpful, and solution-oriented."

# Creative writing assistant
export OLLAMA_MODEL=llama3:8b
export AGENT_SYSTEM_ROLE="You are a creative writing assistant. Help with story ideas, character development, and narrative structure."
```

Then run:
```bash
npm run ask -- "Your question here"
```

### Method 2: Programmatic Configuration

Create custom agent instances with specific configurations:

```typescript
// examples/research-agent.ts
import { createServices } from './src/cli/serviceFactory.js';
import { runAgent } from './src/agent/core.js';
import { buildSystemPrompt } from './src/context/prompts.js';

// Define research-specific tools
const searchPapersTool = {
  name: 'search_papers',
  description: 'Search academic papers by query',
  parameters: { query: 'string - Search query' },
  argsSchema: z.object({ query: z.string() }),
  execute: async (args) => {
    // Implementation for academic search
    return { success: true, data: 'Search results...' };
  }
};

// Create services with custom tools
const services = createServices({
  conversationId: 'research-session-1',
  model: 'llama3:70b',
  tools: [searchPapersTool]  // Custom tools only
});

// Custom system prompt
const systemPrompt = buildSystemPrompt(
  services.tools.list(),
  'You are an academic research assistant. Provide evidence-based answers.'
);

// Run the agent
const result = await runAgent('What are the latest findings on quantum computing?', systemPrompt, services);
```

## Use Case Examples

### Example 1: Math Tutor Agent

**Configuration:**
```bash
export OLLAMA_MODEL=llama3:8b
export AGENT_SYSTEM_ROLE="You are a patient math tutor. Explain concepts step-by-step and check student understanding."
```

**Built-in tools work great:**
- `calculate` - For arithmetic operations
- Agent can explain math concepts

**Usage:**
```bash
npm run ask -- "Explain how to solve quadratic equations"
npm run ask -- "Calculate: 2 + 3 * 4"
```

### Example 2: Research Assistant

**Configuration:**
```bash
export OLLAMA_MODEL=llama3:70b
export AGENT_SYSTEM_ROLE="You are a research assistant. Help gather information, synthesize findings, and provide evidence-based answers."
```

**Suggested custom tools:**
- `web_search` - Search the internet
- `summarize_document` - Summarize long documents
- `extract_citations` - Extract references

**Usage:**
```bash
npm run ask -- "What are the main theories of consciousness?"
npm run ask -- "Summarize recent advances in renewable energy"
```

### Example 3: Customer Service Bot

**Configuration:**
```bash
export OLLAMA_MODEL=mistral:7b
export AGENT_SYSTEM_ROLE="You are a professional customer service agent for Acme Corp. Be polite, empathetic, and solution-focused."
```

**Suggested custom tools:**
- `lookup_order` - Find customer orders
- `check_inventory` - Check product availability
- `process_refund` - Initiate refunds
- `create_ticket` - Create support tickets

**Usage:**
```bash
npm run ask -- "I need to check the status of order #12345"
npm run ask -- "I want to return my recent purchase"
```

### Example 4: Creative Writing Assistant

**Configuration:**
```bash
export OLLAMA_MODEL=llama3:8b
export AGENT_SYSTEM_ROLE="You are a creative writing assistant. Help with story ideas, character development, plot structure, and writing improvement."
```

**Built-in tools work:**
- `file_read` - Read draft manuscripts
- Agent provides creative feedback

**Usage:**
```bash
npm run ask -- "Help me develop a character for a sci-fi novel"
npm run ask -- "Give me 5 story ideas about time travel"
```

### Example 5: Data Analysis Agent

**Configuration:**
```bash
export OLLAMA_MODEL=qwen2.5-coder:7b
export AGENT_SYSTEM_ROLE="You are a data analysis assistant. Help analyze datasets, create visualizations, and interpret statistical results."
```

**Suggested custom tools:**
- `load_csv` - Load CSV data
- `calculate_statistics` - Compute stats
- `create_plot` - Generate charts
- `fit_model` - Train ML models

**Usage:**
```bash
npm run ask -- "Load sales-data.csv and show summary statistics"
npm run ask -- "Create a line plot of revenue over time"
```

## Creating Custom Tools

Tools are simple objects following this pattern:

```typescript
import { z } from 'zod';
import type { Tool } from './src/tools/tool-types.js';

const myCustomTool: Tool = {
  name: 'my_tool',
  description: 'What the tool does',
  parameters: {
    param1: 'string - Description of param1',
    param2: 'number - Description of param2'
  },
  argsSchema: z.object({
    param1: z.string(),
    param2: z.number()
  }),
  execute: async (args) => {
    try {
      // Your tool logic here
      const result = doSomething(args.param1, args.param2);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
```

## Model Selection Guide

Different models work better for different tasks:

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| Coding | `qwen2.5-coder:3b`, `codellama:7b` | Fine-tuned for code |
| General Chat | `llama3:8b`, `mistral:7b` | Good balance |
| Research | `llama3:70b`, `mixtral:8x7b` | Better reasoning |
| Creative | `llama3:8b`, `mistral:7b` | More creative outputs |
| Fast Responses | `llama3:8b`, `qwen2.5-coder:3b` | Smaller = faster |
| Complex Tasks | `llama3:70b`, `mixtral:8x7b` | Better at hard problems |

## Tips for Different Domains

### For Accuracy-Critical Tasks (Medical, Legal, Financial)
- Use larger models (70B+)
- Be explicit in system role about accuracy requirements
- Include verification steps in tools
- Always validate outputs

### For Creative Tasks (Writing, Art, Design)
- Higher temperature can help (model parameter)
- Use models known for creativity (llama3)
- Give examples in system prompt
- Be open-ended in queries

### For Technical Tasks (Coding, Math, Analysis)
- Use specialized models when available (qwen2.5-coder)
- Include calculation/verification tools
- Break complex problems into steps
- Validate outputs with tools

### For Customer-Facing Tasks (Support, Sales)
- Emphasize tone in system role
- Include error handling for edge cases
- Provide fallback responses
- Log interactions for review

## Advanced: Configuration Profiles

Create reusable configuration profiles:

```typescript
// profiles/coding.ts
export const codingProfile = {
  model: 'qwen2.5-coder:3b',
  systemRole: 'You are a coding assistant with access to tools',
  tools: [fileReadTool, calculateTool, gitTool]
};

// profiles/research.ts
export const researchProfile = {
  model: 'llama3:70b',
  systemRole: 'You are an academic research assistant',
  tools: [searchPapersTool, citationTool, summarizeTool]
};

// Usage
import { codingProfile } from './profiles/coding.js';
const services = createServices({
  conversationId: randomUUID(),
  model: codingProfile.model,
  tools: codingProfile.tools
});
```

## Troubleshooting

### Agent Doesn't Follow Instructions
- Try a larger model
- Make system role more explicit
- Add examples in system prompt
- Reduce complexity of request

### Tool Calls Fail
- Check tool argument schemas
- Verify tool descriptions are clear
- Test tools independently
- Add better error messages

### Slow Response Times
- Use smaller model (3b or 7b)
- Reduce context window
- Optimize tool execution
- Consider caching

### Poor Quality Outputs
- Use larger model
- Improve system prompt
- Add domain-specific examples
- Break task into smaller steps

## Next Steps

1. **Experiment with models** - Try different models for your use case
2. **Create custom tools** - Build tools specific to your domain
3. **Refine prompts** - Iterate on system roles for better results
4. **Monitor performance** - Use `--show-metrics` to track usage
5. **Share examples** - Document what works for your use case

## Contributing Domain-Specific Examples

If you create a successful configuration for a specific domain, consider contributing:
1. Document the configuration
2. Include example tools
3. Share sample queries
4. Explain design decisions

See `docs/adaptability-analysis.md` for technical details on the architecture.
