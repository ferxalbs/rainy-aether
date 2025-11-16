/**
 * Rainy Agents - Public API
 *
 * This module provides the main entry point for the Rainy Agents multi-agent system.
 * Import agents, registry, router, and related utilities from this file.
 *
 * @example
 * ```typescript
 * import {
 *   agentRegistry,
 *   agentRouter,
 *   RainyAgent,
 *   createRainyAgent,
 * } from '@/services/agents';
 *
 * // Initialize registry
 * await agentRegistry.initialize();
 *
 * // Create and use an agent
 * const rainy = await createRainyAgent({
 *   apiKey: 'your-key',
 *   workspaceRoot: '/workspace',
 * });
 *
 * const response = await rainy.sendMessage('Hello!');
 *
 * // Or use the router for automatic agent selection
 * const result = await agentRouter.route({
 *   message: 'Refactor this code',
 *   capabilities: ['refactoring'],
 * });
 * ```
 */

// ============================================================================
// CORE INFRASTRUCTURE
// ============================================================================

export { AgentCore } from './core/AgentCore';
export type { MessageOptions, InitializeOptions } from './core/AgentCore';

export { AgentRegistry, agentRegistry } from './core/AgentRegistry';
export type { AgentMetadata } from './core/AgentRegistry';

export { AgentRouter, agentRouter } from './core/AgentRouter';
export type {
  RouteRequest,
  RouteStrategy,
  RouterStats,
  RouteResult,
} from './core/AgentRouter';

// ============================================================================
// AGENT IMPLEMENTATIONS
// ============================================================================

export { RainyAgent, createRainyAgent } from './rainy/RainyAgent';

// Future exports (when implemented):
// export { ClaudeAgent, createClaudeAgent } from './claude/ClaudeAgent';
// export { AbbyAgent, createAbbyAgent } from './abby/AbbyAgent';

// ============================================================================
// TYPES (re-exported from rustAgent types)
// ============================================================================

export type {
  AgentConfig,
  AgentResult,
  AgentMetrics,
  MemoryStats,
  ToolCall,
} from '@/types/rustAgent';
