import 'dotenv/config';
import path from 'path';

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';
export const OLLAMA_TIMEOUT_MS = +(process.env.OLLAMA_TIMEOUT_MS || 30000);

export const SANDBOX_DIR = path.resolve(process.cwd(), './sandbox');
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const MAX_AGENT_ITERATIONS = 10;
export const AGENT_CONTEXT_LIMIT_THRESHOLD = 0.8;
export const AGENT_MAX_TOKENS = 32768;

export const AGENT_SYSTEM_ROLE =
  process.env.AGENT_SYSTEM_ROLE || 'You are a helpful assistant with access to tools';
