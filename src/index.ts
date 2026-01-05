import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ask, chat } from './cli/actions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('coding-agent')
  .description('AI coding assistant with tool support')
  .version(packageJson.version)
  .option('-v, --verbose', 'Show detailed error output with stack traces');

program
  .command('ask', { isDefault: true })
  .description('Ask the coding agent a question')
  .argument('<prompt>', 'What you want the agent to do')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-i, --max-iterations <number>', 'Maximum number of agent iterations', parseInt)
  .option('--show-metrics', 'Display agent execution metrics')
  .action(ask);

program
  .command('chat')
  .description('Start an interactive chat session with the agent')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-i, --max-iterations <number>', 'Maximum number of agent iterations', parseInt)
  .option('--show-metrics', 'Display agent execution metrics')
  .action(chat);

program.parse();
