/**
 * File Copy Tool
 *
 * Allows AI agents to copy files or directories.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for file_copy tool
 */
export const fileCopyInputSchema = z.object({
  sourcePath: z.string().describe('Source relative path from workspace root'),
  destPath: z.string().describe('Destination relative path from workspace root'),
  overwrite: z
    .boolean()
    .optional()
    .default(false)
    .describe('Overwrite destination if it exists'),
});

export type FileCopyInput = z.infer<typeof fileCopyInputSchema>;

/**
 * Output type for file_copy tool
 */
export interface FileCopyOutput {
  success: boolean;
  copiedItems: number;
}

/**
 * File copy tool definition
 */
export const fileCopyTool: ToolDefinition<FileCopyInput, FileCopyOutput> = {
  name: 'file_copy',
  description:
    'Copy a file or directory to a new location within the workspace. Recursively copies directories and their contents. Can optionally overwrite existing files.',
  inputSchema: fileCopyInputSchema,
  category: 'filesystem',
  permissionLevel: 'admin',
  cacheable: false,
  timeoutMs: 60000, // 1 minute for large copies
  rateLimit: {
    maxCalls: 20,
    windowMs: 60000, // 20 copies per minute
  },

  async execute(input, context) {
    const { sourcePath, destPath, overwrite } = input;

    // Safety check: Prevent copying to same path
    if (sourcePath === destPath) {
      throw new Error(`Source and destination paths are identical: ${sourcePath}`);
    }

    try {
      const copiedItems = await invoke<number>('tool_copy_file', {
        workspaceRoot: context.workspaceRoot,
        sourcePath,
        destPath,
        overwrite,
      });

      return {
        success: true,
        copiedItems,
      };
    } catch (error: any) {
      // Enhance error messages
      if (error.includes('Source path does not exist')) {
        throw new Error(`Source not found: ${sourcePath}`);
      }
      if (error.includes('Destination path already exists')) {
        throw new Error(
          `Destination already exists: ${destPath}. Set overwrite:true to replace it.`
        );
      }
      if (error.includes('outside workspace')) {
        throw new Error(`Security error: Path is outside workspace`);
      }
      throw new Error(`Failed to copy: ${error}`);
    }
  },

  // Custom validation
  async validate(input) {
    // Warn about potential large copies
    if (input.sourcePath.includes('node_modules') || input.sourcePath.includes('target')) {
      console.warn(
        `[file_copy] Copying large directory may be slow: ${input.sourcePath}`
      );
    }
    return true;
  },
};
