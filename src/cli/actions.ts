import type { Command } from 'commander';
import type { AskCommandOptions, ChatCommandOptions } from './cli-types.js';
import { askAgent, executeInteractiveChat } from './commands.js';

export async function ask(
  prompt: string,
  options: Record<string, unknown>,
  command: Command
): Promise<void> {
  const globalOptions = command.parent?.opts() || {};

  const askOptions: AskCommandOptions = {
    model: options.model as string | undefined,
    maxIterations: options.maxIterations as number | undefined,
    showMetrics: !!options.showMetrics,
    verbose: !!globalOptions.verbose
  };

  await askAgent(prompt, askOptions);
}

// WIP
export async function chat(options: Record<string, unknown>, command: Command): Promise<void> {
  const globalOptions = command.parent?.opts() || {};

  const chatOptions: ChatCommandOptions = {
    model: options.model as string | undefined,
    maxIterations: options.maxIterations as number | undefined,
    showMetrics: !!options.showMetrics,
    verbose: !!globalOptions.verbose
  };

  await executeInteractiveChat(chatOptions);
}
