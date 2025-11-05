/**
 * File Write Tool
 *
 * Allows AI agents to write or create files with optional directory creation.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for file_write tool
 */
export const fileWriteInputSchema = z.object({
  path: z.string().describe('Relative file path from workspace root'),
  content: z.string().describe('Content to write to the file'),
  createDirs: z
    .boolean()
    .optional()
    .default(true)
    .describe('Create parent directories if they do not exist'),
});

export type FileWriteInput = z.infer<typeof fileWriteInputSchema>;

/**
 * Output type for file_write tool
 */
export interface FileWriteOutput {
  success: boolean;
  bytesWritten: number;
  path: string;
}

/**
 * File write tool definition
 */
export const fileWriteTool: ToolDefinition<FileWriteInput, FileWriteOutput> = {
  name: 'file_write',
  description:
    'Write content to a file in the workspace. Creates the file if it does not exist. Can optionally create parent directories. OVERWRITES existing files completely. For modifications, use file_edit instead.',
  inputSchema: fileWriteInputSchema,
  category: 'filesystem',
  permissionLevel: 'admin', // Write operations require admin permission
  cacheable: false, // Write operations are not cacheable
  timeoutMs: 30000, // 30 second timeout
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 writes per minute
  },

  async execute(input, context) {
    const { path, content, createDirs } = input;

    try {
      const result = await invoke<FileWriteOutput>('tool_write_file', {
        workspaceRoot: context.workspaceRoot,
        path,
        content,
        createDirs,
      });

      return result;
    } catch (error: any) {
      // Enhance error messages
      if (error.includes('outside workspace')) {
        throw new Error(`Security error: Path is outside workspace: ${path}`);
      }
      if (error.includes('Failed to create directories')) {
        throw new Error(`Failed to create parent directories for: ${path}`);
      }
      if (error.includes('Permission denied') || error.includes('access')) {
        throw new Error(`Permission denied: Cannot write to ${path}`);
      }
      throw new Error(`Failed to write file: ${error}`);
    }
  },

  // Custom validation to warn about large files
  async validate(input) {
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (input.content.length > maxSize) {
      console.warn(
        `[file_write] Writing large file (${(input.content.length / 1024 / 1024).toFixed(2)} MB): ${input.path}`
      );
    }
    return true;
  },
};
