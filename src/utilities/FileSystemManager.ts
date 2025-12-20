import { promises as fs } from "fs";
import { resolvePath, isWithinBoundary } from "./pathUtilities.js";
import { SandboxNotFoundError, PathValidationError } from "../tools/ToolErrors.js";
import { hasErrorCode } from "./errorUtilities.js";

export class FileSystemManager {
  constructor(private readonly sandboxDir: string) {}

  /**
   * Verifies that the sandbox directory exists and is a directory.
   * @throws {SandboxNotFoundError} if not found or not a directory.
   */
  async verifySandboxExists(): Promise<void> {
    try {
      const stats = await fs.stat(this.sandboxDir);

      if (!stats.isDirectory()) {
        throw new PathValidationError(this.sandboxDir, "Not a directory");
      }
    } catch (error) {
      if (hasErrorCode(error) && error.code === "ENOENT") {
        throw new SandboxNotFoundError(this.sandboxDir);
      }

      throw error;
    }
  }

  async validateSandboxPath(requestedPath: string): Promise<string> {
    const absoluteSandbox = resolvePath(process.cwd(), this.sandboxDir);

    try {
      const candidatePath = resolvePath(absoluteSandbox, requestedPath);
      const resolvedPath = await fs.realpath(candidatePath);

      if (!isWithinBoundary(resolvedPath, absoluteSandbox)) {
        throw new PathValidationError(requestedPath, "Path escapes sandbox");
      }

      return resolvedPath;
    } catch (error) {
      if (hasErrorCode(error)) {
        if (error.code === "ENOENT") {
          throw new PathValidationError(requestedPath, `File not found`);
        }

        if (error.code === "EACCES") {
          throw new PathValidationError(requestedPath, "Permission denied");
        }
      }

      throw error;
    }
  }
}
