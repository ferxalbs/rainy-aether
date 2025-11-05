/**
 * Terminal Kill Tool
 *
 * Allows AI agents to terminate terminal sessions.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for terminal_kill tool
 */
export const terminalKillInputSchema = z.object({
  sessionId: z.string().uuid().describe('Terminal session ID to terminate'),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force kill even if command is still running'),
});

export type TerminalKillInput = z.infer<typeof terminalKillInputSchema>;

/**
 * Output type for terminal_kill tool
 */
export interface TerminalKillOutput {
  sessionId: string;
  terminated: boolean;
  previousState: string;
}

/**
 * Terminal kill tool definition
 */
export const terminalKillTool: ToolDefinition<TerminalKillInput, TerminalKillOutput> = {
  name: 'terminal_kill',
  description:
    'Terminate a terminal session by its ID. Use this to clean up terminal sessions after command execution or to stop long-running processes. The session will be forcefully killed if force:true is specified.',
  inputSchema: terminalKillInputSchema,
  category: 'terminal',
  permissionLevel: 'admin', // Killing sessions is a write operation
  cacheable: false,
  timeoutMs: 10000,
  supportsParallel: true,
  rateLimit: {
    maxCalls: 20,
    windowMs: 60000, // 20 kills per minute
  },

  async execute(input) {
    const { sessionId, force } = input;

    try {
      // Get session info before killing
      let previousState = 'unknown';
      try {
        const sessionInfo = await invoke<{ id: string; state: string }>('terminal_get_session', {
          id: sessionId,
        });
        previousState = sessionInfo.state;

        // Warn if killing an active session without force flag
        if (previousState === 'active' && !force) {
          console.warn(
            `[terminal_kill] Killing active session without force flag: ${sessionId}`
          );
        }
      } catch {
        // Session might not exist, proceed with kill anyway
      }

      // Kill the session
      await invoke('terminal_kill', { id: sessionId });

      return {
        sessionId,
        terminated: true,
        previousState,
      };
    } catch (error: any) {
      // If error contains "not found", the session doesn't exist
      if (error.toString().includes('not found') || error.toString().includes('Not found')) {
        return {
          sessionId,
          terminated: false,
          previousState: 'not_found',
        };
      }

      throw new Error(`Failed to kill terminal session: ${error}`);
    }
  },

  // Custom validation
  async validate(input) {
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(input.sessionId)) {
      throw new Error('Invalid session ID format. Expected UUID.');
    }

    return true;
  },
};
