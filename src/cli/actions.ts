import type { Command } from 'commander';
import type { RunCommandOptions } from './cli-types.js';
import { runCommand } from './commands.js';

export async function chat(
  query: string,
  options: Record<string, unknown>,
  command: Command
): Promise<void> {
  const globalOptions = command.parent?.opts() || {};

  const runOptions: RunCommandOptions = {
    model: options.model as string | undefined,
    maxIterations: options.maxIterations as number | undefined,
    showMetrics: !!options.showMetrics,
    verbose: !!globalOptions.verbose
  };

  await runCommand(query, runOptions);
}
