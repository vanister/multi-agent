import type { Message } from "../shared/types.d.ts";
import type { LLMResult } from "./types.d.ts";

export interface LLMService {
  chat(messages: Message[]): Promise<LLMResult>;
}

export class OllamaService implements LLMService {
  constructor(private readonly baseUrl: string, private readonly model: string) {}

  async chat(messages: Message[]): Promise<LLMResult> {
    // TODO: Implement HTTP call to Ollama API
    // TODO: Add response metadata (token count, model name, duration) later
    throw new Error("Not implemented");
  }
}
