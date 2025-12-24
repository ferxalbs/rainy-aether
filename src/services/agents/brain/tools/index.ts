/**
 * AgentKit Tools Index
 * 
 * Export all tools for use in agents.
 */

export * from './fileTools';
export * from './terminalTools';
export * from './applyFileDiffTool';

import { fileTools } from './fileTools';
import { terminalTools } from './terminalTools';
import { applyFileDiffTool, checkPendingDiffTool } from './applyFileDiffTool';

export const allTools = [...fileTools, ...terminalTools, applyFileDiffTool, checkPendingDiffTool];

