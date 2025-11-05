/**
 * Workspace Tools Module
 *
 * Tools for workspace analysis, navigation, and code intelligence.
 */

import type { ToolDefinition } from '../types';

// Tool imports
import { workspaceStructureTool } from './structure';
import { workspaceSearchSymbolTool } from './searchSymbol';
import { workspaceFindReferencesTool } from './findReferences';

// Re-export all tools
export { workspaceStructureTool } from './structure';
export { workspaceSearchSymbolTool } from './searchSymbol';
export { workspaceFindReferencesTool } from './findReferences';

// Re-export types
export type { WorkspaceStructureInput, WorkspaceStructureOutput } from './structure';
export type { WorkspaceSearchSymbolInput, WorkspaceSearchSymbolOutput } from './searchSymbol';
export type { WorkspaceFindReferencesInput, WorkspaceFindReferencesOutput } from './findReferences';

/**
 * All workspace tools
 */
export const workspaceTools: ToolDefinition<any, any>[] = [
  workspaceStructureTool,
  workspaceSearchSymbolTool,
  workspaceFindReferencesTool,
];

/**
 * Register all workspace tools with the registry
 */
export function registerWorkspaceTools(registry: {
  register: (tool: ToolDefinition<any, any>) => void;
}): void {
  for (const tool of workspaceTools) {
    registry.register(tool);
  }
  console.log(`[WorkspaceTools] Registered ${workspaceTools.length} tools`);
}
