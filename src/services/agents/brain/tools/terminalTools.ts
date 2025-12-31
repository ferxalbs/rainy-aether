/**
 * AgentKit Tools - Terminal Operations
 * 
 * Tools for executing terminal commands via Tauri IPC.
 * Features:
 * - Commands sandboxed through Tauri
 * - Result caching for repeated commands
 * - Network state integration for context
 */

import { createTool } from '@inngest/agent-kit';
import { z } from 'zod';
import type { NetworkState } from '../types';

// ===========================
// Run Command Tool
// ===========================

export const runCommandTool = createTool({
    name: 'run_command',
    description: `Execute a shell command in the terminal.

WHEN TO USE: Running tests, builds, linters, or other CLI operations.
TIMEOUT: Default 30s, increase for long-running commands.
RETURNS: Exit code, stdout, and stderr.`,
    parameters: z.object({
        command: z.string().describe('The command to execute'),
        cwd: z.string().optional().describe('Working directory for the command'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
    }),
    handler: async ({ command, cwd, timeout }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const state = network?.state?.data as NetworkState | undefined;

            const result = await invoke<{
                exitCode: number;
                stdout: string;
                stderr: string;
            }>('execute_command', {
                command,
                cwd: cwd || state?.context?.workspace,
                timeout: timeout || 30000,
            });

            // Track command in state
            if (state) {
                state.context.relevantFiles = [
                    ...state.context.relevantFiles.filter(f => !f.startsWith('cmd:')),
                    `cmd:${command.slice(0, 50)}`,
                ];
            }

            return {
                success: result.exitCode === 0,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
            };
        } catch (error) {
            throw new Error(`Command execution failed: ${error}`);
        }
    },
});

// ===========================
// Git Status Tool
// ===========================

export const gitStatusTool = createTool({
    name: 'git_status',
    description: `Get current git status including modified, staged, and untracked files.

CACHING: Results cached for 5s to avoid repeated git calls.
RETURNS: Lists of modified, staged, untracked files and current branch.`,
    parameters: z.object({
        path: z.string().optional().describe('Repository path (defaults to workspace)'),
    }),
    handler: async ({ path }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const state = network?.state?.data as NetworkState | undefined;

            // Check cache (5 second TTL for git status)
            const cacheKey = 'git_status';
            const cached = state?.symbolCache[cacheKey];
            if (cached && Date.now() - cached.timestamp < 5000) {
                console.log('[git_status] Using cached result');
                return JSON.parse(cached.symbols[0] || '{}');
            }

            const repoPath = path || state?.context?.workspace;
            const status = await invoke<{
                modified: string[];
                staged: string[];
                untracked: string[];
                branch: string;
            }>('git_status', { path: repoPath });

            // Cache result
            if (state) {
                state.symbolCache[cacheKey] = {
                    symbols: [JSON.stringify(status)],
                    timestamp: Date.now(),
                };
            }

            return status;
        } catch (error) {
            throw new Error(`Git status failed: ${error}`);
        }
    },
});

// ===========================
// Git Commit Tool
// ===========================

export const gitCommitTool = createTool({
    name: 'git_commit',
    description: `Stage and commit changes to git with a message.

WHEN TO USE: After making code changes that should be saved to version control.
INVALIDATES: Clears git_status cache after successful commit.`,
    parameters: z.object({
        message: z.string().describe('Commit message'),
        files: z.array(z.string()).optional().describe('Specific files to stage (stages all if not provided)'),
    }),
    handler: async ({ message, files }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const state = network?.state?.data as NetworkState | undefined;

            // Stage files
            if (files && files.length > 0) {
                await invoke('git_stage', { files });
            } else {
                await invoke('git_stage_all', {});
            }

            // Commit
            const result = await invoke<{ hash: string }>('git_commit', { message });

            // Invalidate git status cache
            if (state) {
                delete state.symbolCache['git_status'];
            }

            return { success: true, hash: result.hash };
        } catch (error) {
            throw new Error(`Git commit failed: ${error}`);
        }
    },
});

// ===========================
// Git Diff Tool
// ===========================

export const gitDiffTool = createTool({
    name: 'git_diff',
    description: `Get git diff for staged or unstaged changes.

CACHING: Results cached briefly to avoid repeated calls.
RETURNS: Unified diff output.`,
    parameters: z.object({
        staged: z.boolean().optional().describe('Show staged changes only (default: false)'),
        file: z.string().optional().describe('Specific file to diff'),
    }),
    handler: async ({ staged, file }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const state = network?.state?.data as NetworkState | undefined;

            // Cache key based on params
            const cacheKey = `git_diff:${staged || false}:${file || 'all'}`;
            const cached = state?.symbolCache[cacheKey];
            if (cached && Date.now() - cached.timestamp < 3000) {
                return { diff: cached.symbols[0], cached: true };
            }

            const result = await invoke<{ diff: string }>('git_diff', {
                staged: staged || false,
                file,
            });

            // Cache result
            if (state) {
                state.symbolCache[cacheKey] = {
                    symbols: [result.diff],
                    timestamp: Date.now(),
                };
            }

            return { diff: result.diff, cached: false };
        } catch (error) {
            throw new Error(`Git diff failed: ${error}`);
        }
    },
});

// ===========================
// Exports
// ===========================

export const terminalTools = [
    runCommandTool,
    gitStatusTool,
    gitCommitTool,
    gitDiffTool,
];
