/**
 * Git Tools
 *
 * Collection of tools for Git version control operations.
 */

export * from './status';
export * from './diff';
export * from './commit';
export * from './branch';
export * from './checkout';

import { gitStatusTool } from './status';
import { gitDiffTool } from './diff';
import { gitCommitTool } from './commit';
import { gitBranchTool } from './branch';
import { gitCheckoutTool } from './checkout';
import type { ToolDefinition } from '../types';

/**
 * All Git tools
 */
export const gitTools: ToolDefinition<any, any>[] = [
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
  gitBranchTool,
  gitCheckoutTool,
];

/**
 * Register all Git tools with the registry
 */
export function registerGitTools(registry: {
  register: (tool: ToolDefinition<any, any>) => void;
}): void {
  for (const tool of gitTools) {
    registry.register(tool);
  }
  console.log(`[GitTools] Registered ${gitTools.length} Git tools`);
}
