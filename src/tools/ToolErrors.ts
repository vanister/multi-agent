export class ToolRegistryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ToolRegistryError';
  }
}

export class ToolAlreadyRegisteredError extends Error {
  constructor(toolName: string) {
    super(`Tool '${toolName}' is already registered`);
    this.name = 'ToolAlreadyRegisteredError';
  }
}

export class FileSizeError extends Error {
  constructor(path: string, actualBytes: number, maxBytes: number) {
    const actualMB = (actualBytes / (1024 * 1024)).toFixed(2);
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(2);
    super(
      `File at '${path}' exceeds size limit: ${actualMB}MB (max: ${maxMB}MB). ` +
        `Try a smaller file or split content into multiple files.`
    );
    this.name = 'FileSizeError';
  }
}

export class SandboxNotFoundError extends Error {
  constructor(sandboxPath: string) {
    super(
      `Sandbox directory not found at '${sandboxPath}'. ` +
        `Please create the sandbox directory before using file operations.`
    );
    this.name = 'SandboxNotFoundError';
  }
}

export class PathValidationError extends Error {
  constructor(requestedPath: string, reason: string) {
    super(
      `Path validation failed for '${requestedPath}': ${reason}. ` +
        `Path must be relative to ./sandbox/ directory. Valid examples: 'test.txt', 'subdir/file.js'`
    );
    this.name = 'PathValidationError';
  }
}
