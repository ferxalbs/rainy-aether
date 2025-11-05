/**
 * Git Branch Tool
 *
 * Allows AI agents to list and manage Git branches.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for git_branch tool
 */
export const gitBranchInputSchema = z.object({
  action: z
    .enum(['list', 'create', 'delete'])
    .default('list')
    .describe('Action to perform: list branches, create new branch, or delete branch'),
  name: z
    .string()
    .optional()
    .describe('Branch name (required for create/delete actions)'),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force delete unmerged branches (only for delete action)'),
});

export type GitBranchInput = z.infer<typeof gitBranchInputSchema>;

/**
 * Branch information
 */
export interface BranchInfo {
  name: string;
  current: boolean;
  remote: boolean;
  upstream?: string;
}

/**
 * Output type for git_branch tool
 */
export interface GitBranchOutput {
  action: 'list' | 'create' | 'delete';
  branches?: BranchInfo[];
  currentBranch?: string;
  created?: string;
  deleted?: string;
  success: boolean;
}

/**
 * Git branch tool definition
 */
export const gitBranchTool: ToolDefinition<GitBranchInput, GitBranchOutput> = {
  name: 'git_branch',
  description:
    'Manage Git branches: list all branches with current branch marked, create new branches, or delete branches. Use this to organize work into feature branches.',
  inputSchema: gitBranchInputSchema,
  category: 'git',
  permissionLevel: 'admin', // Creating/deleting branches modifies repository
  cacheable: false, // Branch state changes frequently
  timeoutMs: 10000,
  rateLimit: {
    maxCalls: 30,
    windowMs: 60000, // 30 branch operations per minute
  },

  async execute(input, context) {
    const { action, name, force } = input;

    try {
      switch (action) {
        case 'list': {
          // Get all branches
          const branches = await invoke<string[]>('git_branches', {
            path: context.workspaceRoot,
          });

          const currentBranch = await invoke<string>('git_get_current_branch', {
            path: context.workspaceRoot,
          });

          const branchInfos: BranchInfo[] = branches.map(branch => ({
            name: branch,
            current: branch === currentBranch,
            remote: branch.startsWith('remotes/') || branch.startsWith('origin/'),
          }));

          return {
            action: 'list',
            branches: branchInfos,
            currentBranch,
            success: true,
          };
        }

        case 'create': {
          if (!name) {
            throw new Error('Branch name is required for create action');
          }

          // Validate branch name
          if (!isValidBranchName(name)) {
            throw new Error(
              `Invalid branch name: "${name}". Use alphanumeric characters, hyphens, and slashes.`
            );
          }

          await invoke('git_create_branch', {
            path: context.workspaceRoot,
            name,
          });

          return {
            action: 'create',
            created: name,
            success: true,
          };
        }

        case 'delete': {
          if (!name) {
            throw new Error('Branch name is required for delete action');
          }

          // Check if trying to delete current branch
          const currentBranch = await invoke<string>('git_get_current_branch', {
            path: context.workspaceRoot,
          });

          if (name === currentBranch) {
            throw new Error(
              `Cannot delete current branch "${name}". Switch to another branch first.`
            );
          }

          // Protect main branches
          const protectedBranches = ['main', 'master', 'develop', 'development'];
          if (protectedBranches.includes(name)) {
            throw new Error(
              `Safety check: Cannot delete protected branch "${name}". This operation is blocked.`
            );
          }

          await invoke('git_delete_branch', {
            path: context.workspaceRoot,
            name,
            force: force || false,
          });

          return {
            action: 'delete',
            deleted: name,
            success: true,
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      if (error.includes('not a git repository')) {
        throw new Error('Not a Git repository');
      }
      if (error.includes('already exists')) {
        throw new Error(`Branch "${name}" already exists`);
      }
      if (error.includes('not found') || error.includes('does not exist')) {
        throw new Error(`Branch "${name}" not found`);
      }
      if (error.includes('not fully merged')) {
        throw new Error(
          `Branch "${name}" is not fully merged. Use force:true to delete anyway (not recommended).`
        );
      }
      throw new Error(`Failed to ${action} branch: ${error}`);
    }
  },
};

/**
 * Validate branch name
 */
function isValidBranchName(name: string): boolean {
  // Git branch name rules:
  // - Can contain alphanumeric, -, _, /
  // - Cannot start with -, .
  // - Cannot contain .., @{, \, spaces
  const invalidChars = /[^\w\-\/]/;
  const invalidPatterns = /^[\-\.]|\.\.|@\{|\\|\s/;

  return !invalidChars.test(name) && !invalidPatterns.test(name) && name.length > 0;
}
