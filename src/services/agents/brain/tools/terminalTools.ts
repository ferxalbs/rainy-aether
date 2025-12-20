/**
 * AgentKit Tools - Terminal Operations
 * 
 * Tools for executing terminal commands via Tauri IPC.
 * Commands are sandboxed and have configurable timeouts.
 */

import { createTool } from '@inngest/agent-kit';
import { z } from 'zod';

// ===========================
// Run Command Tool
// ===========================

export const runCommandTool = createTool({
    name: 'run_command',
    description: 'Execute a shell command in the terminal. Use for running tests, builds, or other CLI operations.',
    parameters: z.object({
        command: z.string().describe('The command to execute'),
        cwd: z.string().optional().describe('Working directory for the command'),
        timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
    }),
    handler: async ({ command, cwd, timeout }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');

            const result = await invoke<{
                exitCode: number;
                stdout: string;
                stderr: string;
            }>('execute_command', {
                command,
                cwd: cwd || network?.state?.data?.workspacePath,
                timeout: timeout || 30000,
            });

            if (network?.state?.data) {
                network.state.data.commandsExecuted = (network.state.data.commandsExecuted || 0) + 1;
                network.state.data.lastCommand = command;
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
    description: 'Get the current git status including modified, staged, and untracked files.',
    parameters: z.object({
        path: z.string().optional().describe('Repository path (defaults to workspace)'),
    }),
    handler: async ({ path }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');

            const repoPath = path || network?.state?.data?.workspacePath;
            const status = await invoke<{
                modified: string[];
                staged: string[];
                untracked: string[];
                branch: string;
            }>('git_status', { path: repoPath });

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
    description: 'Stage and commit changes to git with a message.',
    parameters: z.object({
        message: z.string().describe('Commit message'),
        files: z.array(z.string()).optional().describe('Specific files to stage (stages all if not provided)'),
    }),
    handler: async ({ message, files }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');

            // Stage files
            if (files && files.length > 0) {
                await invoke('git_stage', { files });
            } else {
                await invoke('git_stage_all', {});
            }

            // Commit
            const result = await invoke<{ hash: string }>('git_commit', { message });

            if (network?.state?.data) {
                network.state.data.lastCommit = result.hash;
            }

            return { success: true, hash: result.hash };
        } catch (error) {
            throw new Error(`Git commit failed: ${error}`);
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
];
