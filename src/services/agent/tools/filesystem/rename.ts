/**
 * File Rename Tool
 *
 * Allows AI agents to rename or move files and directories.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for file_rename tool
 */
export const fileRenameInputSchema = z.object({
  oldPath: z.string().describe('Current relative path from workspace root'),
  newPath: z.string().describe('New relative path from workspace root'),
});

export type FileRenameInput = z.infer<typeof fileRenameInputSchema>;

/**
 * Output type for file_rename tool
 */
export interface FileRenameOutput {
  success: boolean;
  newPath: string;
}

/**
 * File rename tool definition
 */
export const fileRenameTool: ToolDefinition<FileRenameInput, FileRenameOutput> = {
  name: 'file_rename',
  description:
    'Rename or move a file or directory within the workspace. Can be used to reorganize file structure. Fails if destination already exists.',
  inputSchema: fileRenameInputSchema,
  category: 'filesystem',
  permissionLevel: 'admin',
  cacheable: false,
  timeoutMs: 30000,
  rateLimit: {
    maxCalls: 30,
    windowMs: 60000, // 30 renames per minute
  },

  async execute(input, context) {
    const { oldPath, newPath } = input;

    // Safety check: Prevent renaming to same path
    if (oldPath === newPath) {
      throw new Error(`Source and destination paths are identical: ${oldPath}`);
    }

    // Safety check: Prevent renaming critical files
    const criticalFiles = ['package.json', 'Cargo.toml', '.git', '.gitignore'];
    if (criticalFiles.includes(oldPath)) {
      throw new Error(
        `Safety check: Cannot rename critical file "${oldPath}". This operation is blocked.`
      );
    }

    try {
      const result = await invoke<string>('tool_rename_file', {
        workspaceRoot: context.workspaceRoot,
        oldPath,
        newPath,
      });

      return {
        success: true,
        newPath: result,
      };
    } catch (error: any) {
      // Enhance error messages
      if (error.includes('Source path does not exist')) {
        throw new Error(`Source not found: ${oldPath}`);
      }
      if (error.includes('Destination path already exists')) {
        throw new Error(`Destination already exists: ${newPath}. Delete it first or choose a different name.`);
      }
      if (error.includes('outside workspace')) {
        throw new Error(`Security error: Path is outside workspace`);
      }
      throw new Error(`Failed to rename: ${error}`);
    }
  },
};
