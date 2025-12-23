import type { ZodError } from "zod";

export class JsonParseError extends Error {
  constructor(message: string, public readonly rawText: string, public readonly parseError: Error) {
    super(message);
    this.name = "JsonParseError";
  }
}

export class ResponseValidationError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
    public readonly validationErrors: ZodError
  ) {
    super(message);
    this.name = "ResponseValidationError";
  }
}
