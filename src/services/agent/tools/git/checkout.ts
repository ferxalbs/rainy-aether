/**
 * Git Checkout Tool
 *
 * Allows AI agents to switch branches or restore files.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for git_checkout tool
 */
export const gitCheckoutInputSchema = z.object({
  target: z.string().describe('Branch name to checkout or file path to restore'),
  createBranch: z
    .boolean()
    .optional()
    .default(false)
    .describe('Create new branch if it does not exist'),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force checkout, discarding local changes'),
  restoreFile: z
    .boolean()
    .optional()
    .default(false)
    .describe('Restore a specific file instead of switching branches'),
});

export type GitCheckoutInput = z.infer<typeof gitCheckoutInputSchema>;

/**
 * Output type for git_checkout tool
 */
export interface GitCheckoutOutput {
  success: boolean;
  previousBranch?: string;
  currentBranch?: string;
  restoredFile?: string;
  created?: boolean;
}

/**
 * Git checkout tool definition
 */
export const gitCheckoutTool: ToolDefinition<GitCheckoutInput, GitCheckoutOutput> = {
  name: 'git_checkout',
  description:
    'Switch to a different branch or restore files to their last committed state. Use createBranch:true to create and switch to a new branch. Use restoreFile:true to discard changes to a specific file.',
  inputSchema: gitCheckoutInputSchema,
  category: 'git',
  permissionLevel: 'admin', // Switching branches modifies working directory
  cacheable: false,
  timeoutMs: 15000,
  rateLimit: {
    maxCalls: 20,
    windowMs: 60000, // 20 checkouts per minute
  },

  async execute(input, context) {
    const { target, createBranch, force, restoreFile } = input;

    try {
      if (restoreFile) {
        // Restore specific file
        await invoke('git_discard_changes', {
          path: context.workspaceRoot,
          file: target,
        });

        return {
          success: true,
          restoredFile: target,
        };
      } else {
        // Switch branch
        const currentBranch = await invoke<string>('git_get_current_branch', {
          path: context.workspaceRoot,
        });

        // Check if already on target branch
        if (target === currentBranch && !createBranch) {
          return {
            success: true,
            previousBranch: currentBranch,
            currentBranch: target,
          };
        }

        // Check for uncommitted changes (unless force is true)
        if (!force) {
          const status = await invoke<{
            staged: string[];
            unstaged: string[];
          }>('git_status', {
            path: context.workspaceRoot,
          });

          if (status.staged.length > 0 || status.unstaged.length > 0) {
            throw new Error(
              'You have uncommitted changes. Commit them first or use force:true to discard.'
            );
          }
        }

        let created = false;

        // Create branch if requested
        if (createBranch) {
          try {
            await invoke('git_create_branch', {
              path: context.workspaceRoot,
              name: target,
            });
            created = true;
          } catch (error: any) {
            if (!error.includes('already exists')) {
              throw error;
            }
            // Branch already exists, continue with checkout
          }
        }

        // Checkout branch
        await invoke('git_checkout_branch', {
          path: context.workspaceRoot,
          name: target,
        });

        return {
          success: true,
          previousBranch: currentBranch,
          currentBranch: target,
          created,
        };
      }
    } catch (error: any) {
      if (error.includes('not a git repository')) {
        throw new Error('Not a Git repository');
      }
      if (error.includes('does not exist') || error.includes('not found')) {
        throw new Error(
          `Branch "${target}" not found. Use createBranch:true to create it.`
        );
      }
      if (error.includes('uncommitted changes') || error.includes('would be overwritten')) {
        throw new Error(
          'Uncommitted changes would be lost. Commit, stash, or use force:true to discard.'
        );
      }
      throw new Error(`Failed to checkout: ${error}`);
    }
  },

  // Custom validation
  async validate(input) {
    if (input.force && !input.restoreFile) {
      console.warn(
        `[git_checkout] Force checkout will discard local changes in branch: ${input.target}`
      );
    }
    return true;
  },
};
