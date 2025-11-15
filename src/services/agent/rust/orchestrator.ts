/**
 * Rust Agent Orchestrator
 *
 * Orchestrates agent sessions using the Rust backend for high-performance
 * execution with tool calling, memory management, and metrics.
 */

import * as RustAgentCommands from './commands';
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
import { createAgentConfig } from '@/types/rustAgent';

/**
 * Event emitted during agent execution
 */
export type AgentEvent =
  | { type: 'session_created'; sessionId: string }
  | { type: 'message_sent'; message: string }
  | { type: 'tool_call'; toolName: string; arguments: unknown }
  | { type: 'tool_result'; toolName: string; result: unknown }
  | { type: 'response_chunk'; chunk: string }
  | { type: 'response_complete'; result: AgentResult }
  | { type: 'error'; error: Error };

/**
 * Event handler callback
 */
export type AgentEventHandler = (event: AgentEvent) => void;

/**
 * Rust Agent Orchestrator
 *
 * Manages agent sessions, handles communication with the Rust backend,
 * and provides a high-level API for agent interactions.
 */
export class RustAgentOrchestrator {
  private eventHandlers: Set<AgentEventHandler> = new Set();
  private activeSessions: Map<string, Session> = new Map();

  /**
   * Create a new agent session
   *
   * @param agentType - Type/name of the agent (e.g., 'rainy', 'claude', 'abby')
   * @param config - Agent configuration
   * @returns Session ID
   */
  async createSession(
    agentType: string,
    config: Partial<AgentConfig> = {}
  ): Promise<string> {
    try {
      const fullConfig = createAgentConfig(config);
      const sessionId = await RustAgentCommands.createSession(
        agentType,
        fullConfig
      );

      this.emit({ type: 'session_created', sessionId });

      // Cache session info
      const session = await RustAgentCommands.getSession(sessionId);
      if (session) {
        this.activeSessions.set(sessionId, session);
      }

      return sessionId;
    } catch (error) {
      this.emit({
        type: 'error',
        error:
          error instanceof Error
            ? error
            : new Error('Failed to create session'),
      });
      throw error;
    }
  }

  /**
   * Send a message to an agent
   *
   * @param sessionId - Session identifier
   * @param message - Message to send
   * @param enableTools - Whether to enable tool execution (default: true)
   * @returns Agent execution result
   */
  async sendMessage(
    sessionId: string,
    message: string,
    enableTools: boolean = true
  ): Promise<AgentResult> {
    try {
      this.emit({ type: 'message_sent', message });

      const result = await RustAgentCommands.sendMessage(
        sessionId,
        message,
        enableTools
      );

      // Emit tool events
      for (const toolCall of result.toolCalls) {
        this.emit({
          type: 'tool_call',
          toolName: toolCall.name,
          arguments: toolCall.arguments,
        });

        if (toolCall.result) {
          this.emit({
            type: 'tool_result',
            toolName: toolCall.name,
            result: toolCall.result.output,
          });
        }
      }

      this.emit({ type: 'response_complete', result });

      // Update cached session
      const session = await RustAgentCommands.getSession(sessionId);
      if (session) {
        this.activeSessions.set(sessionId, session);
      }

      return result;
    } catch (error) {
      this.emit({
        type: 'error',
        error:
          error instanceof Error
            ? error
            : new Error('Failed to send message'),
      });
      throw error;
    }
  }

  /**
   * Get session information
   *
   * @param sessionId - Session identifier
   * @returns Session information or null if not found
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Check cache first
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    // Fetch from backend
    const session = await RustAgentCommands.getSession(sessionId);
    if (session) {
      this.activeSessions.set(sessionId, session);
    }

    return session;
  }

  /**
   * Get conversation history
   *
   * @param sessionId - Session identifier
   * @param limit - Maximum number of messages (optional)
   * @returns Array of messages
   */
  async getHistory(sessionId: string, limit?: number): Promise<Message[]> {
    return RustAgentCommands.getHistory(sessionId, limit);
  }

  /**
   * Get memory statistics
   *
   * @param sessionId - Session identifier
   * @returns Memory statistics or null if not found
   */
  async getMemoryStats(sessionId: string): Promise<MemoryStats | null> {
    return RustAgentCommands.getMemoryStats(sessionId);
  }

  /**
   * Get agent metrics
   *
   * @param agentId - Agent identifier
   * @returns Agent metrics or null if not found
   */
  async getMetrics(agentId: string): Promise<AgentMetrics | null> {
    return RustAgentCommands.getMetrics(agentId);
  }

  /**
   * Get all metrics
   *
   * @returns All system metrics
   */
  async getAllMetrics(): Promise<AllMetrics> {
    return RustAgentCommands.getAllMetrics();
  }

  /**
   * List available tools
   *
   * @returns Array of tool definitions
   */
  async listTools(): Promise<ToolDefinition[]> {
    return RustAgentCommands.listTools();
  }

  /**
   * Destroy a session
   *
   * @param sessionId - Session identifier
   */
  async destroySession(sessionId: string): Promise<void> {
    await RustAgentCommands.destroySession(sessionId);
    this.activeSessions.delete(sessionId);
  }

  /**
   * List all active sessions
   *
   * @returns Array of session IDs
   */
  async listSessions(): Promise<string[]> {
    return RustAgentCommands.listSessions();
  }

  /**
   * Get all cached session information
   *
   * @returns Array of sessions
   */
  getCachedSessions(): Session[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Subscribe to agent events
   *
   * @param handler - Event handler callback
   * @returns Unsubscribe function
   */
  subscribe(handler: AgentEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(event: AgentEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in agent event handler:', error);
      }
    }
  }

  /**
   * Clear all cached session data
   */
  clearCache(): void {
    this.activeSessions.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global singleton instance of the Rust agent orchestrator
 */
export const rustAgentOrchestrator = new RustAgentOrchestrator();

/**
 * Get the global Rust agent orchestrator instance
 */
export function getRustAgentOrchestrator(): RustAgentOrchestrator {
  return rustAgentOrchestrator;
}
