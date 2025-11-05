/**
 * Git Status Tool
 *
 * Allows AI agents to get the current Git repository status.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for git_status tool
 */
export const gitStatusInputSchema = z.object({
  showUntracked: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include untracked files in the status'),
});

export type GitStatusInput = z.infer<typeof gitStatusInputSchema>;

/**
 * File status entry
 */
export interface FileStatus {
  path: string;
  status: string;
  staged: boolean;
}

/**
 * Output type for git_status tool
 */
export interface GitStatusOutput {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
  isClean: boolean;
}

/**
 * Git status tool definition
 */
export const gitStatusTool: ToolDefinition<GitStatusInput, GitStatusOutput> = {
  name: 'git_status',
  description:
    'Get the current Git repository status including current branch, staged/unstaged/untracked files, and ahead/behind commits. Use this to understand the current state before making commits or switching branches.',
  inputSchema: gitStatusInputSchema,
  category: 'git',
  permissionLevel: 'user', // Status is read-only
  cacheable: true,
  cacheTtlMs: 5000, // 5 second cache (Git status changes frequently)
  timeoutMs: 10000,
  supportsParallel: true,

  async execute(input, context) {
    try {
      // Get basic status
      const status = await invoke<{
        staged: string[];
        unstaged: string[];
        untracked: string[];
      }>('git_status', {
        path: context.workspaceRoot,
      });

      // Get current branch
      const branch = await invoke<string>('git_get_current_branch', {
        path: context.workspaceRoot,
      });

      // Get ahead/behind count
      let ahead = 0;
      let behind = 0;
      try {
        const unpushed = await invoke<any[]>('git_unpushed', {
          path: context.workspaceRoot,
        });
        ahead = unpushed.length;
      } catch {
        // Ignore if no upstream
      }

      // Check for conflicts
      let conflicted: string[] = [];
      try {
        conflicted = await invoke<string[]>('git_list_conflicts', {
          path: context.workspaceRoot,
        });
      } catch {
        // No conflicts
      }

      const result: GitStatusOutput = {
        branch,
        ahead,
        behind,
        staged: status.staged,
        unstaged: status.unstaged,
        untracked: input.showUntracked ? status.untracked : [],
        conflicted,
        isClean:
          status.staged.length === 0 &&
          status.unstaged.length === 0 &&
          conflicted.length === 0,
      };

      return result;
    } catch (error: any) {
      if (error.includes('not a git repository') || error.includes('Not a git repo')) {
        throw new Error('Not a Git repository. Initialize Git first with `git init`.');
      }
      throw new Error(`Failed to get Git status: ${error}`);
    }
  },
};
