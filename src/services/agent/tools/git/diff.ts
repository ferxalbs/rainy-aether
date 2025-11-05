/**
 * Git Diff Tool
 *
 * Allows AI agents to view differences in files.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for git_diff tool
 */
export const gitDiffInputSchema = z.object({
  file: z.string().optional().describe('Specific file to diff (omit for all changes)'),
  staged: z
    .boolean()
    .optional()
    .default(false)
    .describe('Show diff of staged changes instead of unstaged'),
  contextLines: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .default(3)
    .describe('Number of context lines to show around changes'),
});

export type GitDiffInput = z.infer<typeof gitDiffInputSchema>;

/**
 * Output type for git_diff tool
 */
export interface GitDiffOutput {
  diff: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
  }>;
}

/**
 * Git diff tool definition
 */
export const gitDiffTool: ToolDefinition<GitDiffInput, GitDiffOutput> = {
  name: 'git_diff',
  description:
    'View differences in files (unstaged by default, or staged with staged:true). Shows unified diff format with additions/deletions. Use this to review changes before committing.',
  inputSchema: gitDiffInputSchema,
  category: 'git',
  permissionLevel: 'user',
  cacheable: true,
  cacheTtlMs: 3000, // 3 second cache
  timeoutMs: 15000,
  supportsParallel: true,

  async execute(input, context) {
    const { file, staged } = input;

    try {
      if (file) {
        // Diff specific file
        const diff = await invoke<string>('git_diff_file', {
          path: context.workspaceRoot,
          file,
          staged: staged || false,
        });

        // Parse diff to count changes
        const stats = parseDiffStats(diff);

        return {
          diff,
          filesChanged: 1,
          additions: stats.additions,
          deletions: stats.deletions,
          files: [
            {
              path: file,
              additions: stats.additions,
              deletions: stats.deletions,
            },
          ],
        };
      } else {
        // Diff all files
        const diff = await invoke<string>('git_diff', {
          path: context.workspaceRoot,
          staged: staged || false,
        });

        // Parse diff to get file stats
        const fileStats = parseFullDiffStats(diff);

        const totalAdditions = fileStats.reduce((sum, f) => sum + f.additions, 0);
        const totalDeletions = fileStats.reduce((sum, f) => sum + f.deletions, 0);

        return {
          diff,
          filesChanged: fileStats.length,
          additions: totalAdditions,
          deletions: totalDeletions,
          files: fileStats,
        };
      }
    } catch (error: any) {
      if (error.includes('not a git repository')) {
        throw new Error('Not a Git repository');
      }
      if (error.includes('not found') || error.includes('does not exist')) {
        throw new Error(`File not found in Git: ${file}`);
      }
      throw new Error(`Failed to get Git diff: ${error}`);
    }
  },
};

/**
 * Parse diff statistics from unified diff
 */
function parseDiffStats(diff: string): { additions: number; deletions: number } {
  const lines = diff.split('\n');
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  return { additions, deletions };
}

/**
 * Parse file statistics from full diff
 */
function parseFullDiffStats(
  diff: string
): Array<{ path: string; additions: number; deletions: number }> {
  const files: Array<{ path: string; additions: number; deletions: number }> = [];
  const fileDiffs = diff.split('diff --git');

  for (const fileDiff of fileDiffs) {
    if (!fileDiff.trim()) continue;

    // Extract file path
    const pathMatch = fileDiff.match(/a\/(.+?) b\//);
    if (!pathMatch) continue;

    const path = pathMatch[1];
    const stats = parseDiffStats(fileDiff);

    files.push({
      path,
      ...stats,
    });
  }

  return files;
}
