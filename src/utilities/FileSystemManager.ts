import { promises as fs } from 'fs';
import path from 'path';
import { isWithinBoundary } from './pathUtilities.js';
import { SandboxNotFoundError, PathValidationError } from '../tools/ToolErrors.js';
import { hasErrorCode } from './errorUtilities.js';

export class FileSystemManager {
  constructor(private readonly sandboxDir: string) {}

  async verifySandboxExists(): Promise<void> {
    try {
      const stats = await fs.stat(this.sandboxDir);

      if (!stats.isDirectory()) {
        throw new PathValidationError(this.sandboxDir, 'Not a directory');
      }
    } catch (error) {
      if (hasErrorCode(error) && error.code === 'ENOENT') {
        throw new SandboxNotFoundError(this.sandboxDir);
      }

      throw error;
    }
  }

  async validateSandboxPath(requestedPath: string): Promise<string> {
    const absoluteSandbox = this.resolvePath(process.cwd(), this.sandboxDir);

    try {
      const candidatePath = this.resolvePath(absoluteSandbox, requestedPath);
      const resolvedPath = await fs.realpath(candidatePath);

      if (!isWithinBoundary(resolvedPath, absoluteSandbox)) {
        throw new PathValidationError(requestedPath, 'Path escapes sandbox');
      }

      return resolvedPath;
    } catch (error) {
      if (hasErrorCode(error)) {
        if (error.code === 'ENOENT') {
          throw new PathValidationError(requestedPath, `File not found`);
        }

        if (error.code === 'EACCES') {
          throw new PathValidationError(requestedPath, 'Permission denied');
        }
      }

      throw error;
    }
  }

  private resolvePath(basePath: string, requestedPath: string): string {
    return path.resolve(basePath, requestedPath);
  }
}
