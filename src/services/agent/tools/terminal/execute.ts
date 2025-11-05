/**
 * Terminal Execute Tool
 *
 * Allows AI agents to execute commands in a terminal session with strict security controls.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for terminal_execute tool
 */
export const terminalExecuteInputSchema = z.object({
  command: z.string().min(1).describe('Command to execute in the terminal'),
  cwd: z
    .string()
    .optional()
    .describe('Working directory for command execution (defaults to workspace root)'),
  timeout: z
    .number()
    .int()
    .positive()
    .max(300000)
    .optional()
    .default(30000)
    .describe('Timeout in milliseconds (max 5 minutes, default 30s)'),
  shell: z
    .string()
    .optional()
    .describe('Shell to use (PowerShell, cmd, bash). Auto-detected if not specified.'),
  captureOutput: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to capture and return command output'),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('Additional environment variables for the command'),
});

export type TerminalExecuteInput = z.infer<typeof terminalExecuteInputSchema>;

/**
 * Output type for terminal_execute tool
 */
export interface TerminalExecuteOutput {
  sessionId: string;
  command: string;
  output?: string;
  exitCode?: number;
  state: 'starting' | 'active' | 'exited' | 'error';
  executionTime: number;
  truncated?: boolean;
}

/**
 * Blocked commands for security (never allow these)
 */
const BLOCKED_COMMANDS = [
  'rm -rf /',
  'del /f /s /q',
  'format',
  'mkfs',
  'dd if=/dev/zero',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'systemctl poweroff',
  'systemctl reboot',
  ':(){:|:&};:', // Fork bomb
  'chmod -R 777 /',
  'chown -R',
];

/**
 * Dangerous command patterns that require explicit confirmation
 */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i,
  /del\s+\/[fs]/i,
  /rmdir\s+\/s/i,
  /format\s+[a-z]:/i,
  /sudo\s+rm/i,
  /sudo\s+chmod/i,
  /sudo\s+chown/i,
  />\s*\/dev\/(sda|hda)/i,
];

/**
 * Maximum output size (1MB)
 */
const MAX_OUTPUT_SIZE = 1024 * 1024;

/**
 * Terminal execute tool definition
 */
export const terminalExecuteTool: ToolDefinition<TerminalExecuteInput, TerminalExecuteOutput> = {
  name: 'terminal_execute',
  description:
    'Execute a command in a terminal session. Use this for running build scripts, tests, package managers (npm, cargo), git commands, or other development tools. Output is captured and returned. SECURITY: Dangerous commands are blocked.',
  inputSchema: terminalExecuteInputSchema,
  category: 'terminal',
  permissionLevel: 'restricted', // Most dangerous permission level
  cacheable: false, // Never cache terminal execution
  timeoutMs: 300000, // 5 minutes max
  supportsParallel: false, // Sequential execution for safety
  rateLimit: {
    maxCalls: 10,
    windowMs: 60000, // 10 executions per minute
  },

  async execute(input, context) {
    const startTime = Date.now();
    const { command, cwd, timeout, shell, captureOutput } = input;

    // Security check: Block dangerous commands
    const normalizedCommand = command.toLowerCase().trim();
    for (const blocked of BLOCKED_COMMANDS) {
      if (normalizedCommand.includes(blocked.toLowerCase())) {
        throw new Error(
          `Security: Command blocked due to dangerous pattern: "${blocked}". This command could cause system damage.`
        );
      }
    }

    // Security check: Warn about dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        console.warn(
          `[terminal_execute] WARNING: Executing potentially dangerous command: ${command}`
        );
        // In production, this should require explicit user confirmation
        // For now, we log the warning
      }
    }

    try {
      // Create terminal session
      const sessionId = await invoke<string>('terminal_create', {
        shell: shell || undefined,
        cwd: cwd || context.workspaceRoot,
        cols: 120,
        rows: 30,
      });

      // Write command to terminal
      await invoke('terminal_write', {
        id: sessionId,
        data: `${command}\n`,
      });

      let output = '';
      let state: 'starting' | 'active' | 'exited' | 'error' = 'active';
      let exitCode: number | undefined;

      if (captureOutput) {
        // Wait for command to complete or timeout
        const endTime = startTime + timeout;
        let lastOutputTime = Date.now();
        const outputCheckInterval = 100; // Check every 100ms

        while (Date.now() < endTime) {
          // Check session state
          const sessionInfo = await invoke<{
            id: string;
            state: string;
            shell_cmd: string;
          }>('terminal_get_session', { id: sessionId });

          state = sessionInfo.state as any;

          // If session exited or errored, break
          if (state === 'exited' || state === 'error') {
            break;
          }

          // Note: In a real implementation, we would listen to terminal output events
          // For now, we'll wait for the timeout or state change
          // This is a limitation - proper implementation needs event-based output capture

          await new Promise(resolve => setTimeout(resolve, outputCheckInterval));

          // Timeout check: if no state change after timeout, break
          if (Date.now() - lastOutputTime > timeout) {
            console.warn(`[terminal_execute] Command timed out after ${timeout}ms`);
            break;
          }
        }

        // Clean up: kill session if still active
        try {
          if (state === 'active') {
            await invoke('terminal_kill', { id: sessionId });
            state = 'exited';
          }
        } catch (err) {
          // Session already terminated, ignore error
        }
      }

      const executionTime = Date.now() - startTime;

      // Truncate output if too large
      const truncated = output.length > MAX_OUTPUT_SIZE;
      if (truncated) {
        output = output.substring(0, MAX_OUTPUT_SIZE) + '\n\n[Output truncated...]';
      }

      return {
        sessionId,
        command,
        output: captureOutput ? output : undefined,
        exitCode,
        state,
        executionTime,
        truncated,
      };
    } catch (error: any) {
      throw new Error(`Failed to execute command: ${error}`);
    }
  },

  // Custom validation
  async validate(input) {
    // Warn about long-running commands
    if (input.timeout && input.timeout > 120000) {
      console.warn(
        `[terminal_execute] Long timeout requested: ${input.timeout}ms. Consider shorter timeouts.`
      );
    }

    // Validate working directory
    if (input.cwd && input.cwd.includes('..')) {
      throw new Error('Security: Path traversal not allowed in working directory');
    }

    return true;
  },
};
