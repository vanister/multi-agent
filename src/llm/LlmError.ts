export class LlmError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LlmError";
  }
}

export class OllamaApiError extends LlmError {
  constructor(
    public readonly status: number,
    public readonly responseData: unknown,
    message?: string
  ) {
    super(message || `Ollama API error (${status}): ${JSON.stringify(responseData)}`, responseData);
    this.name = "OllamaApiError";
  }
}
