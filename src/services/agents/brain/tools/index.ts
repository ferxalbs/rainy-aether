/**
 * AgentKit Tools Index
 * 
 * Export all tools for use in agents.
 */

export * from './fileTools';
export * from './terminalTools';

import { fileTools } from './fileTools';
import { terminalTools } from './terminalTools';

export const allTools = [...fileTools, ...terminalTools];
