import type { AgentConfig, AgentServices } from '../agent/agent-types.js';

export type AskCommandOptions = {
  model?: string;
  maxIterations?: number;
  showMetrics?: boolean;
  verbose?: boolean;
};

export type ChatCommandOptions = AskCommandOptions;

export type InitializeOptions = {
  conversationId?: string;
  model?: string;
  maxIterations?: number;
};

export type InitializedServices = {
  conversationId: string;
  services: AgentServices;
  systemPrompt: string;
  config: AgentConfig;
};

export interface Logger {
  log(...messages: unknown[]): void;
  error(...messages: unknown[]): void;
}

export interface ProcessManager {
  exit(code?: number): void;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
}

export interface ReadlineInterface {
  close(): void;
  on(event: string, listener: (...args: unknown[]) => void): this;
  prompt(preserveCursor?: boolean): void;
}
