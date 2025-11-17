/**
 * Agent Session Bridge
 *
 * Bridge between the new Rainy Agents system (AgentCore, RainyAgent, etc.)
 * and the existing AgentStore. This allows seamless integration with the
 * current UI while using the new dual-mode agent architecture.
 *
 * Features:
 * - Create sessions using new agent system
 * - Route messages through AgentRouter
 * - Synchronize state with AgentStore
 * - Handle streaming responses
 * - Track metrics and costs
 *
 * @example
 * ```typescript
 * import { sessionBridge } from './sessionBridge';
 *
 * // Create a session
 * const sessionId = await sessionBridge.createSession({
 *   agentId: 'rainy',
 *   name: 'My Coding Session',
 *   providerId: 'groq',
 *   modelId: 'llama-3.3-70b-versatile',
 * });
 *
 * // Send a message
 * const result = await sessionBridge.sendMessage({
 *   sessionId,
 *   message: 'Help me refactor this code',
 *   options: { fastMode: false },
 * });
 * ```
 */

import { agentRegistry } from '../agents/core/AgentRegistry';
import { agentRouter } from '../agents/core/AgentRouter';
import type { RouteRequest } from '../agents/core/AgentRouter';
import type { AgentResult } from '@/types/rustAgent';
import type { MessageOptions } from '../agents/core/AgentCore';

/**
 * Session creation parameters
 */
export interface CreateSessionParams {
  /** Agent ID to use (default: 'rainy') */
  agentId?: string;

  /** Session name */
  name: string;

  /** Provider ID (groq, google, etc.) */
  providerId: string;

  /** Model ID */
  modelId: string;

  /** Workspace root directory */
  workspaceRoot?: string;

  /** User ID for tracking */
  userId?: string;

  /** API key (optional, can be provided later) */
  apiKey?: string;
}

/**
 * Send message parameters
 */
export interface SendMessageParams {
  /** Session ID */
  sessionId: string;

  /** Agent ID (optional, defaults to session's agent) */
  agentId?: string;

  /** User message */
  message: string;

  /** Message options */
  options?: MessageOptions;

  /** Required capabilities (for routing) */
  capabilities?: string[];
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  /** Session ID */
  id: string;

  /** Agent ID */
  agentId: string;

  /** Session name */
  name: string;

  /** Created timestamp */
  createdAt: number;

  /** Last used timestamp */
  lastUsedAt: number;

  /** Total messages sent */
  messageCount: number;

  /** Workspace root */
  workspaceRoot?: string;

  /** User ID */
  userId?: string;
}

/**
 * Agent Session Bridge
 *
 * Provides integration between new agent system and existing UI/stores.
 */
export class AgentSessionBridge {
  /** Active sessions metadata */
  private sessions = new Map<string, SessionMetadata>();

  /** Session ID to agent ID mapping */
  private sessionAgents = new Map<string, string>();

  /**
   * Initialize the session bridge
   *
   * Ensures agent registry is initialized.
   */
  async initialize(): Promise<void> {
    console.log('🌉 Initializing AgentSessionBridge...');

    // Ensure agent registry is initialized
    if (!agentRegistry.isInitialized()) {
      await agentRegistry.initialize();
    }

    console.log('✅ AgentSessionBridge initialized');
  }

  /**
   * Create a new agent session
   *
   * This creates a session that can be used to send messages to an agent.
   * The session is tracked in the bridge for routing purposes.
   *
   * @param params - Session creation parameters
   * @returns Session ID
   */
  async createSession(params: CreateSessionParams): Promise<string> {
    const agentId = params.agentId || 'rainy';

    // Ensure registry is initialized
    if (!agentRegistry.isInitialized()) {
      await this.initialize();
    }

    // Get or create agent instance
    const agent = agentRegistry.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Initialize agent if needed
    // Note: We don't actually initialize here because the agent needs
    // an API key which might not be available yet. The agent will be
    // initialized on first use.

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Store session metadata
    const metadata: SessionMetadata = {
      id: sessionId,
      agentId,
      name: params.name,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      messageCount: 0,
      workspaceRoot: params.workspaceRoot,
      userId: params.userId,
    };

    this.sessions.set(sessionId, metadata);
    this.sessionAgents.set(sessionId, agentId);

    console.log(
      `✅ Session created: ${sessionId} (agent: ${agentId}, name: ${params.name})`
    );

    return sessionId;
  }

  /**
   * Send a message through the agent system
   *
   * Routes the message to the appropriate agent and returns the result.
   *
   * @param params - Send message parameters
   * @returns Agent result
   */
  async sendMessage(params: SendMessageParams): Promise<AgentResult> {
    const { sessionId, message, options, capabilities } = params;

    // Get session metadata
    const metadata = this.sessions.get(sessionId);
    if (!metadata) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update session metadata
    metadata.lastUsedAt = Date.now();
    metadata.messageCount++;

    // Determine agent to use
    const agentId = params.agentId || metadata.agentId;

    // Build route request with workspace context from session
    const routeRequest: RouteRequest = {
      message,
      agentId,
      capabilities,
      options,
      workspaceRoot: metadata.workspaceRoot,
      userId: metadata.userId,
    };

    console.log(
      `📨 Sending message via session ${sessionId} (agent: ${agentId}, workspace: ${metadata.workspaceRoot || 'none'})`
    );

    try {
      // Route through agent router
      const result = await agentRouter.route(routeRequest);

      console.log(
        `✅ Message processed by ${result.agentId} in ${result.metadata.executionTimeMs}ms`
      );

      return result;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get session metadata
   *
   * @param sessionId - Session ID
   * @returns Session metadata or undefined
   */
  getSession(sessionId: string): SessionMetadata | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   *
   * @returns Array of session metadata
   */
  getAllSessions(): SessionMetadata[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get sessions for a specific agent
   *
   * @param agentId - Agent ID
   * @returns Array of session metadata
   */
  getSessionsForAgent(agentId: string): SessionMetadata[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.agentId === agentId
    );
  }

  /**
   * Delete a session
   *
   * @param sessionId - Session ID
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.sessionAgents.delete(sessionId);
    console.log(`🗑️ Session deleted: ${sessionId}`);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear();
    this.sessionAgents.clear();
    console.log('🗑️ All sessions cleared');
  }

  /**
   * Get statistics
   *
   * @returns Session statistics
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());

    return {
      totalSessions: sessions.length,
      activeAgents: new Set(sessions.map((s) => s.agentId)).size,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
      sessionsPerAgent: sessions.reduce(
        (acc, s) => {
          acc[s.agentId] = (acc[s.agentId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      oldestSession: sessions.reduce((oldest, current) => {
        return !oldest || current.createdAt < oldest.createdAt
          ? current
          : oldest;
      }, null as SessionMetadata | null),
      mostRecentlyUsed: sessions.reduce((recent, current) => {
        return !recent || current.lastUsedAt > recent.lastUsedAt
          ? current
          : recent;
      }, null as SessionMetadata | null),
    };
  }

  /**
   * Reset bridge (for testing)
   */
  _reset(): void {
    this.sessions.clear();
    this.sessionAgents.clear();
    console.warn('⚠️ AgentSessionBridge has been reset (testing only)');
  }
}

/**
 * Global singleton instance
 *
 * Use this instance throughout the application for session management.
 *
 * @example
 * ```typescript
 * import { sessionBridge } from '@/services/agentIntegration/sessionBridge';
 *
 * // Initialize once at startup
 * await sessionBridge.initialize();
 *
 * // Create session
 * const sessionId = await sessionBridge.createSession({
 *   name: 'Debug Session',
 *   providerId: 'groq',
 *   modelId: 'llama-3.3-70b-versatile',
 * });
 *
 * // Send message
 * const result = await sessionBridge.sendMessage({
 *   sessionId,
 *   message: 'Help me debug this issue',
 * });
 * ```
 */
export const sessionBridge = new AgentSessionBridge();
