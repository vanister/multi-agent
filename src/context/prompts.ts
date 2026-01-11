import type { ToolMetadata } from '../tools/tool-types.js';
import { AGENT_IDENTITY, AGENT_CAPABILITIES } from '../config.js';

export function buildSystemPrompt(tools: ToolMetadata[]): string {
  return `
${AGENT_IDENTITY}. ${AGENT_CAPABILITIES}.

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
${getToolDescriptions(tools)}

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
- Use multiple tool calls if needed before responding with "done"`.trim();
}

function getToolDescriptions(tools: ToolMetadata[]): string {
  if (tools.length === 0) {
    return '(No tools available)';
  }

  return tools
    .map(
      (tool) => `- ${tool.name}: ${tool.description}\n  Args: ${JSON.stringify(tool.parameters)}`
    )
    .join('\n');
}
