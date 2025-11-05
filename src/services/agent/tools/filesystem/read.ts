/**
 * File Read Tool
 *
 * Allows AI agents to read file contents with optional line range filtering.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for file_read tool
 */
export const fileReadInputSchema = z.object({
  path: z.string().describe('Relative file path from workspace root'),
  startLine: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Start line number (1-indexed, inclusive)'),
  endLine: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('End line number (1-indexed, inclusive)'),
});

export type FileReadInput = z.infer<typeof fileReadInputSchema>;

/**
 * Output type for file_read tool
 */
export interface FileReadOutput {
  content: string;
  lines: number;
  size: number;
  encoding: string;
}

/**
 * File read tool definition
 */
export const fileReadTool: ToolDefinition<FileReadInput, FileReadOutput> = {
  name: 'file_read',
  description:
    'Read the contents of a file from the workspace. Supports reading entire files or specific line ranges for large files. Returns the file content, total line count, file size, and encoding.',
  inputSchema: fileReadInputSchema,
  category: 'filesystem',
  permissionLevel: 'user',
  cacheable: true,
  cacheTtlMs: 60000, // 1 minute cache
  timeoutMs: 15000, // 15 second timeout
  supportsParallel: true,

  async execute(input, context) {
    const { path, startLine, endLine } = input;

    // Validate line range if provided
    if (startLine !== undefined && endLine !== undefined) {
      if (startLine > endLine) {
        throw new Error(`Start line (${startLine}) must be <= end line (${endLine})`);
      }
    }

    try {
      const result = await invoke<FileReadOutput>('tool_read_file', {
        workspaceRoot: context.workspaceRoot,
        path,
        startLine,
        endLine,
      });

      return result;
    } catch (error: any) {
      // Enhance error message for common issues
      if (error.includes('File not found')) {
        throw new Error(`File not found: ${path}`);
      }
      if (error.includes('Path is not a file')) {
        throw new Error(`Path is a directory, not a file: ${path}`);
      }
      if (error.includes('outside workspace')) {
        throw new Error(`Security error: Path is outside workspace: ${path}`);
      }
      throw new Error(`Failed to read file: ${error}`);
    }
  },
};
