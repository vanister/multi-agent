import "dotenv/config";

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";
export const OLLAMA_TIMEOUT_MS = +(process.env.OLLAMA_TIMEOUT_MS || 30000);
