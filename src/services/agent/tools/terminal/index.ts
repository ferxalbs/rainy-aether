/**
 * Terminal Tools Module
 *
 * Tools for executing commands in terminal sessions with security controls.
 */

import type { ToolDefinition } from '../types';

// Tool imports
import { terminalExecuteTool } from './execute';
import { terminalListSessionsTool } from './listSessions';
import { terminalKillTool } from './kill';

// Re-export all tools
export { terminalExecuteTool } from './execute';
export { terminalListSessionsTool } from './listSessions';
export { terminalKillTool } from './kill';

// Re-export types
export type { TerminalExecuteInput, TerminalExecuteOutput } from './execute';
export type { TerminalListSessionsInput, TerminalListSessionsOutput } from './listSessions';
export type { TerminalKillInput, TerminalKillOutput } from './kill';

/**
 * All terminal tools
 */
export const terminalTools: ToolDefinition<any, any>[] = [
  terminalExecuteTool,
  terminalListSessionsTool,
  terminalKillTool,
];

/**
 * Register all terminal tools with the registry
 */
export function registerTerminalTools(registry: {
  register: (tool: ToolDefinition<any, any>) => void;
}): void {
  for (const tool of terminalTools) {
    registry.register(tool);
  }
  console.log(`[TerminalTools] Registered ${terminalTools.length} tools`);
}
