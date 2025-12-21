import type { ZodError } from "zod";

export class JsonParseError extends Error {
  constructor(public readonly rawText: string, public readonly parseError: Error) {
    super(`Failed to parse JSON response: ${parseError.message}`);
    this.name = "JsonParseError";
  }
}

export class ResponseValidationError extends Error {
  constructor(public readonly rawText: string, public readonly validationErrors: ZodError) {
    super(`Response validation failed: ${validationErrors.message}`);
    this.name = "ResponseValidationError";
  }
}
