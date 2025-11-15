/**
 * Tauri commands wrapper for Rust Agent System
 *
 * This module provides TypeScript bindings to the Rust agent system
 * exposed via Tauri IPC commands.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  AgentConfig,
  AgentResult,
  Session,
  Message,
  MemoryStats,
  AgentMetrics,
  AllMetrics,
  ToolDefinition,
} from '@/types/rustAgent';

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new agent session
 *
 * @param agentType - Type/name of the agent
 * @param config - Agent configuration
 * @returns Session ID
 */
export async function createSession(
  agentType: string,
  config: AgentConfig
): Promise<string> {
  return invoke<string>('agent_create_session', {
    agentType,
    config,
  });
}

/**
 * Send a message to an agent
 *
 * @param sessionId - Session identifier
 * @param message - Message to send
 * @param enableTools - Whether to enable tool execution
 * @returns Agent execution result
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  enableTools: boolean = true
): Promise<AgentResult> {
  return invoke<AgentResult>('agent_send_message', {
    sessionId,
    message,
    enableTools,
  });
}

/**
 * Get session information
 *
 * @param sessionId - Session identifier
 * @returns Session information or null if not found
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  return invoke<Session | null>('agent_get_session', {
    sessionId,
  });
}

/**
 * Destroy a session
 *
 * @param sessionId - Session identifier
 */
export async function destroySession(sessionId: string): Promise<void> {
  return invoke<void>('agent_destroy_session', {
    sessionId,
  });
}

/**
 * List all active sessions
 *
 * @returns Array of session IDs
 */
export async function listSessions(): Promise<string[]> {
  return invoke<string[]>('agent_list_sessions');
}

// ============================================================================
// Memory Management
// ============================================================================

/**
 * Get conversation history
 *
 * @param sessionId - Session identifier
 * @param limit - Maximum number of messages to retrieve (optional)
 * @returns Array of messages
 */
export async function getHistory(
  sessionId: string,
  limit?: number
): Promise<Message[]> {
  return invoke<Message[]>('agent_get_history', {
    sessionId,
    limit: limit ?? null,
  });
}

/**
 * Get memory statistics
 *
 * @param sessionId - Session identifier
 * @returns Memory statistics or null if not found
 */
export async function getMemoryStats(
  sessionId: string
): Promise<MemoryStats | null> {
  return invoke<MemoryStats | null>('agent_get_memory_stats', {
    sessionId,
  });
}

// ============================================================================
// Metrics
// ============================================================================

/**
 * Get agent metrics
 *
 * @param agentId - Agent identifier
 * @returns Agent metrics or null if not found
 */
export async function getMetrics(
  agentId: string
): Promise<AgentMetrics | null> {
  return invoke<AgentMetrics | null>('agent_get_metrics', {
    agentId,
  });
}

/**
 * Get all metrics
 *
 * @returns All metrics (agents, tools, providers, system)
 */
export async function getAllMetrics(): Promise<AllMetrics> {
  return invoke<AllMetrics>('agent_get_all_metrics');
}

// ============================================================================
// Tools
// ============================================================================

/**
 * List available tools
 *
 * @returns Array of tool definitions
 */
export async function listTools(): Promise<ToolDefinition[]> {
  return invoke<ToolDefinition[]>('agent_list_tools');
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Error thrown by agent commands
 */
export class AgentCommandError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly cause?: unknown
  ) {
    super(`Agent command '${command}' failed: ${message}`);
    this.name = 'AgentCommandError';
  }
}

/**
 * Wrap a Tauri command invocation with error handling
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new AgentCommandError(
      error instanceof Error ? error.message : String(error),
      command,
      error
    );
  }
}
