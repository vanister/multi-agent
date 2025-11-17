import type { LLMResponse } from "../shared/types.d.ts";

export type LLMResult = {
  success: boolean;
  response?: LLMResponse;
  error?: string;
};
