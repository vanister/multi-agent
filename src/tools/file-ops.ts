import { promises as fs } from 'fs';
import { MAX_FILE_SIZE_BYTES, SANDBOX_DIR } from '../config.js';
import { FileSystemManager } from '../utilities/FileSystemManager.js';
import { fileReadArgsSchema, type FileReadArgs } from './schemas.js';
import type { Tool } from './tool-types.js';
import type { ToolResult } from './schemas.js';
import { FileSizeError } from './ToolErrors.js';
import { createToolSuccess } from './toolHelpers.js';

const fsManager = new FileSystemManager(SANDBOX_DIR);

export const fileReadTool: Tool = {
  name: 'file_read',
  description: 'Read contents of a file from the sandbox directory',
  parameters: {
    path: "string - Relative path to file within sandbox (e.g., 'test.txt', 'subdir/file.js')"
  },
  argsSchema: fileReadArgsSchema,
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const validatedArgs = fileReadArgsSchema.parse(args);
    const validatedPath = await fsManager.validateSandboxPath(validatedArgs.path);
    const stats = await fs.stat(validatedPath);

    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new FileSizeError(validatedArgs.path, stats.size, MAX_FILE_SIZE_BYTES);
    }

    const content = await fs.readFile(validatedPath, 'utf-8');

    return createToolSuccess(content);
  }
};
