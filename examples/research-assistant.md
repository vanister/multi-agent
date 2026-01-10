# Example: Configuring as a Research Assistant

This example shows how to configure the coding agent as a research assistant with custom tools.

## Step 1: Configure Environment

Create a `.env` file or export these variables:

```bash
# Use a larger model for better reasoning
export OLLAMA_MODEL=llama3:70b

# Set research-focused system role
export AGENT_SYSTEM_ROLE="You are an academic research assistant with access to tools. Provide evidence-based answers with proper citations. Focus on accuracy and thoroughness."
```

## Step 2: Create Research-Specific Tools

Create a file `src/tools/research-tools.ts`:

```typescript
import { z } from 'zod';
import type { Tool } from './tool-types.js';
import { createToolSuccess, createToolError } from './toolHelpers.js';

// Example: Academic paper search tool
export const searchPapersTool: Tool = {
  name: 'search_papers',
  description: 'Search academic papers and publications by query',
  parameters: {
    query: 'string - Search query (e.g., "machine learning transformers")',
    maxResults: 'number - Maximum number of results to return (default: 10)'
  },
  argsSchema: z.object({
    query: z.string().min(1),
    maxResults: z.number().optional().default(10)
  }),
  execute: async (args) => {
    try {
      // In a real implementation, integrate with:
      // - Semantic Scholar API
      // - arXiv API
      // - PubMed API
      
      // Mock for demonstration
      const papers = [{
        title: "Example Paper",
        authors: ["Author et al."],
        year: 2024,
        url: "https://example.com/paper"
      }];
      
      return createToolSuccess({ papers });
    } catch (error) {
      return createToolError(`Search failed: ${error.message}`);
    }
  }
};
```

## Step 3: Register Research Tools

Update `src/cli/serviceFactory.ts` to use custom tools:

```typescript
import { searchPapersTool } from '../tools/research-tools.js';

const services = createServices({
  conversationId,
  tools: [searchPapersTool, calculateTool]
});
```

## Step 4: Use It

```bash
ollama pull llama3:70b
npm run ask -- "Find papers on transformer architectures"
```

See `docs/multi-domain-usage.md` for more examples and complete tool implementations.
