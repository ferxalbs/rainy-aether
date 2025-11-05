/**
 * Agent Tools System
 *
 * Central exports for all agent tools, utilities, and infrastructure.
 */

// Core types and errors
export * from './types';

// Core infrastructure
export * from './registry';
export * from './permissions';
export * from './cache';
export * from './rateLimiter';
export * from './audit';
export * from './executor';

// Tool implementations
export * from './filesystem';

// Convenience imports
import { getToolRegistry } from './registry';
import { getPermissionManager } from './permissions';
import { getToolCache } from './cache';
import { getRateLimiter } from './rateLimiter';
import { getAuditLogger } from './audit';
import { executeTool, executeToolBatch, getExecutionStats } from './executor';
import { registerFilesystemTools } from './filesystem';

/**
 * Initialize the tool system
 */
export async function initializeToolSystem(options?: {
  workspaceRoot?: string;
  userId?: string;
}): Promise<void> {
  const registry = getToolRegistry();
  const permissionManager = getPermissionManager();

  // Register all tools
  registerFilesystemTools(registry);

  // Set global permission level (default: user)
  // Users can elevate to admin level in UI for write operations
  permissionManager.setGlobalPermissionLevel('user');

  // If userId provided, set their permission level
  if (options?.userId) {
    permissionManager.setUserPermissionLevel(options.userId, 'user');
  }

  console.log('[ToolSystem] Initialized with', registry.size, 'tools');
  console.log('[ToolSystem] Permission level:', permissionManager.getGlobalPermissionLevel());
}

/**
 * Get tool system services
 */
export function getToolSystem() {
  return {
    registry: getToolRegistry(),
    permissions: getPermissionManager(),
    cache: getToolCache(),
    rateLimiter: getRateLimiter(),
    audit: getAuditLogger(),
    executeTool,
    executeToolBatch,
    getExecutionStats,
  };
}

/**
 * Get tools formatted for AI model (Vercel AI SDK)
 */
export function getToolsForAI(permissionLevel: 'user' | 'admin' | 'restricted' = 'user') {
  const registry = getToolRegistry();
  return registry.getToolsForAI(permissionLevel);
}
