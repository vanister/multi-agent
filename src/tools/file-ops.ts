import { promises as fs } from "fs";
import z from "zod";
import { MAX_FILE_SIZE_BYTES, SANDBOX_DIR } from "../config.js";
import { FileSystemManager } from "../utilities/FileSystemManager.js";
import { FileReadArgsSchema } from "./schemas.js";
import type { Tool, ToolResult } from "./tool-types.js";
import { FileSizeError } from "./ToolErrors.js";

const fsManager = new FileSystemManager(SANDBOX_DIR);
await fsManager.verifySandboxExists();

export type FileReadArgs = z.infer<typeof FileReadArgsSchema>;

export const fileReadTool: Tool<FileReadArgs> = {
  name: "file_read",
  description: "Read contents of a file from the sandbox directory",
  parameters: {
    path: "string - Relative path to file within sandbox (e.g., 'test.txt', 'subdir/file.js')"
  },
  argsSchema: FileReadArgsSchema,
  execute: async (args: FileReadArgs): Promise<ToolResult> => {
    const validatedPath = await fsManager.validateSandboxPath(args.path);
    const stats = await fs.stat(validatedPath);

    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new FileSizeError(args.path, stats.size, MAX_FILE_SIZE_BYTES);
    }

    const content = await fs.readFile(validatedPath, "utf-8");

    return {
      success: true,
      data: content
    };
  }
};
