export type MessageRole = "system" | "user" | "assistant";

export type Message = {
  role: MessageRole;
  content: string;
};

export type LlmResult = {
  content: string;
};

export type OllamaChatResponse = {
  message: {
    content: string;
  };
};
