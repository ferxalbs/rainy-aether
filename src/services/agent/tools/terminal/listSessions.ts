/**
 * Terminal List Sessions Tool
 *
 * Allows AI agents to view all active terminal sessions.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for terminal_list_sessions tool
 */
export const terminalListSessionsInputSchema = z.object({
  includeExited: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include exited sessions in the list'),
});

export type TerminalListSessionsInput = z.infer<typeof terminalListSessionsInputSchema>;

/**
 * Terminal session information
 */
export interface SessionInfo {
  id: string;
  shell_cmd: string;
  state: 'starting' | 'active' | 'exited' | 'error';
  created_at: number;
  cwd?: string;
}

/**
 * Output type for terminal_list_sessions tool
 */
export interface TerminalListSessionsOutput {
  sessions: SessionInfo[];
  totalSessions: number;
  activeSessions: number;
  exitedSessions: number;
}

/**
 * Terminal list sessions tool definition
 */
export const terminalListSessionsTool: ToolDefinition<
  TerminalListSessionsInput,
  TerminalListSessionsOutput
> = {
  name: 'terminal_list_sessions',
  description:
    'List all terminal sessions created during this session. Shows session ID, shell command, state, and creation time. Use this to track running terminals and find session IDs for other operations.',
  inputSchema: terminalListSessionsInputSchema,
  category: 'terminal',
  permissionLevel: 'user', // Read-only operation
  cacheable: true,
  cacheTtlMs: 5000, // 5 second cache (sessions change frequently)
  timeoutMs: 5000,
  supportsParallel: true,

  async execute(input) {
    const { includeExited } = input;

    try {
      // Get all sessions from Rust backend
      const allSessions = await invoke<SessionInfo[]>('terminal_list_sessions');

      // Filter based on includeExited
      const sessions = includeExited
        ? allSessions
        : allSessions.filter(s => s.state !== 'exited');

      // Calculate statistics
      const activeSessions = allSessions.filter(s => s.state === 'active').length;
      const exitedSessions = allSessions.filter(s => s.state === 'exited').length;

      return {
        sessions,
        totalSessions: allSessions.length,
        activeSessions,
        exitedSessions,
      };
    } catch (error: any) {
      throw new Error(`Failed to list terminal sessions: ${error}`);
    }
  },
};
