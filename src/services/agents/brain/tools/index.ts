/**
 * AgentKit Tools Index
 * 
 * Export all tools for use in agents.
 */

export * from './fileTools';
export * from './terminalTools';
export * from './applyFileDiffTool';
export * from './batchTools';

import { fileTools } from './fileTools';
import { terminalTools } from './terminalTools';
import { applyFileDiffTool, checkPendingDiffTool } from './applyFileDiffTool';
import { batchTools } from './batchTools';

export const allTools = [
    ...fileTools,
    ...terminalTools,
    ...batchTools,
    applyFileDiffTool,
    checkPendingDiffTool,
];
