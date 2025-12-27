import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chat } from './cli/actions.js';

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
  .command('run')
  .description('Run a single query against the coding agent')
  .argument('<query>', 'The query to send to the agent')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-i, --max-iterations <number>', 'Maximum number of agent iterations', parseInt)
  .option('--show-metrics', 'Display agent execution metrics')
  .action(chat);

program.parse();
