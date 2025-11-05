/**
 * Git Commit Tool
 *
 * Allows AI agents to create Git commits.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for git_commit tool
 */
export const gitCommitInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(500)
    .describe('Commit message (first line is subject, rest is body)'),
  files: z
    .array(z.string())
    .optional()
    .describe('Specific files to stage and commit (omit to commit all staged files)'),
  stageAll: z
    .boolean()
    .optional()
    .default(false)
    .describe('Stage all changes before committing'),
  authorName: z.string().optional().describe('Author name (uses Git config if omitted)'),
  authorEmail: z.string().email().optional().describe('Author email (uses Git config if omitted)'),
});

export type GitCommitInput = z.infer<typeof gitCommitInputSchema>;

/**
 * Output type for git_commit tool
 */
export interface GitCommitOutput {
  success: boolean;
  commitHash: string;
  filesCommitted: number;
  message: string;
}

/**
 * Git commit tool definition
 */
export const gitCommitTool: ToolDefinition<GitCommitInput, GitCommitOutput> = {
  name: 'git_commit',
  description:
    'Create a Git commit with the specified message. Can stage specific files or all changes before committing. Use descriptive commit messages following conventional commit format when possible.',
  inputSchema: gitCommitInputSchema,
  category: 'git',
  permissionLevel: 'admin', // Commits modify repository state
  cacheable: false,
  timeoutMs: 15000,
  rateLimit: {
    maxCalls: 20,
    windowMs: 60000, // 20 commits per minute
  },

  async execute(input, context) {
    const { message, files, stageAll, authorName, authorEmail } = input;

    try {
      // Get author info from settings or Git config
      let name = authorName;
      let email = authorEmail;

      if (!name || !email) {
        // Try to get from Git config
        try {
          const config = await invoke<Record<string, string>>('git_get_config', {
            path: context.workspaceRoot,
          });
          name = name || config['user.name'] || 'Unknown';
          email = email || config['user.email'] || 'unknown@example.com';
        } catch {
          name = name || 'Unknown';
          email = email || 'unknown@example.com';
        }
      }

      // Stage files if requested
      if (stageAll) {
        await invoke('git_stage_all', {
          path: context.workspaceRoot,
        });
      } else if (files && files.length > 0) {
        await invoke('git_stage_files', {
          path: context.workspaceRoot,
          files,
        });
      }

      // Create commit
      const commitHash = await invoke<string>('git_commit', {
        path: context.workspaceRoot,
        message,
        authorName: name,
        authorEmail: email,
      });

      // Get number of files in commit
      const status = await invoke<{ staged: string[] }>('git_status', {
        path: context.workspaceRoot,
      });

      return {
        success: true,
        commitHash: commitHash.substring(0, 8), // Short hash
        filesCommitted: files?.length || status.staged.length,
        message: message.split('\n')[0], // First line only
      };
    } catch (error: any) {
      if (error.includes('not a git repository')) {
        throw new Error('Not a Git repository');
      }
      if (error.includes('nothing to commit') || error.includes('no changes')) {
        throw new Error('No changes to commit. Stage files first or use stageAll:true');
      }
      if (error.includes('author')) {
        throw new Error('Git author not configured. Provide authorName and authorEmail');
      }
      throw new Error(`Failed to create commit: ${error}`);
    }
  },

  // Custom validation
  async validate(input) {
    // Check commit message format
    const lines = input.message.split('\n');
    const subject = lines[0];

    if (subject.length > 72) {
      console.warn(
        `[git_commit] Subject line is ${subject.length} chars (recommend ≤72): "${subject.substring(0, 50)}..."`
      );
    }

    return true;
  },
};
