import type { Message, LlmResult, OllamaChatResponse } from "./llm-types.js";
import type { HttpClient } from "../utilities/HttpClient.js";
import { LlmError, OllamaApiError } from "./LlmErrors.js";

export interface LlmService {
  chat(messages: Message[]): Promise<LlmResult>;
}

export class OllamaLlmService implements LlmService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs: number = 30000
  ) {}

  async chat(messages: Message[]): Promise<LlmResult> {
    try {
      const body = {
        model: this.model,
        messages,
        stream: false
      };

      const response = await this.httpClient.post<OllamaChatResponse>(
        `${this.baseUrl}/api/chat`,
        body,
        { timeoutMs: this.timeoutMs }
      );

      if (!response.ok) {
        throw new OllamaApiError(response.status, response.data);
      }

      if (response.data?.message == null) {
        throw new LlmError("Invalid response from Ollama: missing message", response.data);
      }

      return { content: response.data.message.content };
    } catch (error) {
      if (error instanceof OllamaApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new LlmError(`LLM request failed: ${error.message}`, error);
      }

      throw error;
    }
  }
}
