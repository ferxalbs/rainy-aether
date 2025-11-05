/**
 * File Delete Tool
 *
 * Allows AI agents to delete files or directories with safety controls.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for file_delete tool
 */
export const fileDeleteInputSchema = z.object({
  path: z.string().describe('Relative file or directory path from workspace root'),
  recursive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Recursively delete directories and their contents'),
});

export type FileDeleteInput = z.infer<typeof fileDeleteInputSchema>;

/**
 * Output type for file_delete tool
 */
export interface FileDeleteOutput {
  success: boolean;
  deletedItems: number;
}

/**
 * File delete tool definition
 */
export const fileDeleteTool: ToolDefinition<FileDeleteInput, FileDeleteOutput> = {
  name: 'file_delete',
  description:
    'Delete a file or directory from the workspace. For directories, use recursive:true to delete contents. DESTRUCTIVE OPERATION - deleted files cannot be recovered unless in version control.',
  inputSchema: fileDeleteInputSchema,
  category: 'filesystem',
  permissionLevel: 'admin', // Delete operations require admin permission
  cacheable: false,
  timeoutMs: 30000,
  rateLimit: {
    maxCalls: 20,
    windowMs: 60000, // 20 deletes per minute
  },

  async execute(input, context) {
    const { path, recursive } = input;

    // Safety check: Block deletion of critical paths
    const criticalPaths = [
      '.',
      '..',
      '/',
      'src',
      'node_modules',
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'Cargo.toml',
      'Cargo.lock',
      '.git',
    ];

    if (criticalPaths.includes(path) || path === '') {
      throw new Error(
        `Safety check: Cannot delete critical path "${path}". This operation is blocked.`
      );
    }

    try {
      const deletedItems = await invoke<number>('tool_delete_file', {
        workspaceRoot: context.workspaceRoot,
        path,
        recursive,
      });

      return {
        success: true,
        deletedItems,
      };
    } catch (error: any) {
      // Enhance error messages
      if (error.includes('Path does not exist')) {
        throw new Error(`Path not found: ${path}`);
      }
      if (error.includes('outside workspace')) {
        throw new Error(`Security error: Path is outside workspace: ${path}`);
      }
      if (error.includes('use recursive=true')) {
        throw new Error(
          `Cannot delete non-empty directory: ${path}. Set recursive:true to delete directory contents.`
        );
      }
      throw new Error(`Failed to delete: ${error}`);
    }
  },

  // Custom validation
  async validate(input) {
    // Additional safety warnings for recursive deletes
    if (input.recursive) {
      console.warn(
        `[file_delete] Recursive delete requested for: ${input.path}. This will delete all contents.`
      );
    }
    return true;
  },
};
