import * as readline from 'node:readline';
import { runAgent } from '../agent/core.js';
import { formatResult, formatError } from './formatters.js';
import { initializeAgentServices } from './commandHelpers.js';
import type {
  AskCommandOptions,
  ChatCommandOptions,
  Logger,
  ProcessManager,
  ReadlineInterface
} from './cli-types.js';

export async function askAgent(
  prompt: string,
  options: AskCommandOptions,
  logger: Logger = console,
  processManager: ProcessManager = process
): Promise<void> {
  try {
    const { services, systemPrompt, config } = initializeAgentServices({
      model: options.model,
      maxIterations: options.maxIterations
    });

    const result = await runAgent(prompt, systemPrompt, services, config);
    const formattedResult = formatResult(result, options.showMetrics || false);

    logger.log(formattedResult);

    if (!result.success) {
      processManager.exit(1);
    }
  } catch (error) {
    const formattedError = formatError(error, options.verbose || false);

    logger.error(formattedError);
    processManager.exit(1);
  }
}

// WIP
export async function executeInteractiveChat(
  options: ChatCommandOptions,
  logger: Logger = console,
  processManager: ProcessManager = process,
  readlineInterface?: ReadlineInterface
): Promise<void> {
  try {
    const { conversationId } = initializeAgentServices({
      model: options.model,
      maxIterations: options.maxIterations
    });

    logger.log(`Interactive chat mode (conversation: ${conversationId})`);
    logger.log('Type /exit to quit\n');

    const rl =
      readlineInterface ||
      readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
      });

    // todo - move the below to core
    const cleanup = () => {
      rl.close();
      logger.log('\nGoodbye!');
      processManager.exit(0);
    };

    processManager.on('SIGINT', cleanup);

    rl.on('line', (...args: unknown[]) => {
      const input = args[0] as string;
      const trimmed = input.trim();

      if (trimmed === '/exit') {
        cleanup();
        return;
      }

      logger.log('Interactive mode not implemented yet');
      rl.prompt();
    });

    rl.prompt();
  } catch (error) {
    const formattedError = formatError(error, options.verbose || false);
    logger.error(formattedError);
    processManager.exit(1);
  }
}
