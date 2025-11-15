/**
 * React hooks for Rust Agent System
 *
 * Provides reactive hooks for managing agent sessions, sending messages,
 * and tracking metrics using the Rust backend.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRustAgentOrchestrator,
  type AgentConfig,
  type AgentResult,
  type Session,
  type Message,
  type MemoryStats,
  type AgentMetrics,
  type AllMetrics,
  type ToolDefinition,
  type AgentEvent,
} from '@/services/agent/rust';

// ============================================================================
// useRustAgentSession Hook
// ============================================================================

export interface UseRustAgentSessionOptions {
  /** Agent type (e.g., 'rainy', 'claude', 'abby') */
  agentType: string;

  /** Agent configuration */
  config?: Partial<AgentConfig>;

  /** Auto-create session on mount */
  autoCreate?: boolean;
}

export interface UseRustAgentSessionReturn {
  /** Current session ID */
  sessionId: string | null;

  /** Session information */
  session: Session | null;

  /** Whether session is being created */
  creating: boolean;

  /** Whether a message is being sent */
  sending: boolean;

  /** Last error */
  error: Error | null;

  /** Conversation history */
  history: Message[];

  /** Memory statistics */
  memoryStats: MemoryStats | null;

  /** Create a new session */
  createSession: () => Promise<string>;

  /** Send a message */
  sendMessage: (message: string, enableTools?: boolean) => Promise<AgentResult>;

  /** Refresh conversation history */
  refreshHistory: () => Promise<void>;

  /** Refresh memory stats */
  refreshMemoryStats: () => Promise<void>;

  /** Destroy the session */
  destroySession: () => Promise<void>;
}

/**
 * Hook for managing a Rust agent session
 */
export function useRustAgentSession(
  options: UseRustAgentSessionOptions
): UseRustAgentSessionReturn {
  const { agentType, config, autoCreate = true } = options;

  const orchestrator = getRustAgentOrchestrator();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

  // Create session
  const createSession = useCallback(async () => {
    setCreating(true);
    setError(null);

    try {
      const id = await orchestrator.createSession(agentType, config);
      setSessionId(id);

      const sessionInfo = await orchestrator.getSession(id);
      setSession(sessionInfo);

      return id;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create session');
      setError(error);
      throw error;
    } finally {
      setCreating(false);
    }
  }, [agentType, config, orchestrator]);

  // Send message
  const sendMessage = useCallback(
    async (message: string, enableTools: boolean = true): Promise<AgentResult> => {
      if (!sessionId) {
        throw new Error('No active session');
      }

      setSending(true);
      setError(null);

      try {
        const result = await orchestrator.sendMessage(sessionId, message, enableTools);

        // Refresh session info
        const sessionInfo = await orchestrator.getSession(sessionId);
        setSession(sessionInfo);

        // Refresh history
        await refreshHistory();

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message');
        setError(error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [sessionId, orchestrator]
  );

  // Refresh history
  const refreshHistory = useCallback(async () => {
    if (!sessionId) return;

    try {
      const messages = await orchestrator.getHistory(sessionId);
      setHistory(messages);
    } catch (err) {
      console.error('Failed to refresh history:', err);
    }
  }, [sessionId, orchestrator]);

  // Refresh memory stats
  const refreshMemoryStats = useCallback(async () => {
    if (!sessionId) return;

    try {
      const stats = await orchestrator.getMemoryStats(sessionId);
      setMemoryStats(stats);
    } catch (err) {
      console.error('Failed to refresh memory stats:', err);
    }
  }, [sessionId, orchestrator]);

  // Destroy session
  const destroySession = useCallback(async () => {
    if (!sessionId) return;

    try {
      await orchestrator.destroySession(sessionId);
      setSessionId(null);
      setSession(null);
      setHistory([]);
      setMemoryStats(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to destroy session');
      setError(error);
      throw error;
    }
  }, [sessionId, orchestrator]);

  // Auto-create session on mount
  useEffect(() => {
    if (autoCreate && !sessionId && !creating) {
      createSession();
    }
  }, [autoCreate, sessionId, creating, createSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        orchestrator.destroySession(sessionId).catch(console.error);
      }
    };
  }, [sessionId, orchestrator]);

  return {
    sessionId,
    session,
    creating,
    sending,
    error,
    history,
    memoryStats,
    createSession,
    sendMessage,
    refreshHistory,
    refreshMemoryStats,
    destroySession,
  };
}

// ============================================================================
// useRustAgentEvents Hook
// ============================================================================

/**
 * Hook for subscribing to agent events
 */
export function useRustAgentEvents(
  handler: (event: AgentEvent) => void
): void {
  const orchestrator = getRustAgentOrchestrator();
  const handlerRef = useRef(handler);

  // Update handler ref
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Subscribe to events
  useEffect(() => {
    const wrappedHandler = (event: AgentEvent) => {
      handlerRef.current(event);
    };

    const unsubscribe = orchestrator.subscribe(wrappedHandler);
    return unsubscribe;
  }, [orchestrator]);
}

// ============================================================================
// useRustAgentMetrics Hook
// ============================================================================

export interface UseRustAgentMetricsReturn {
  /** All system metrics */
  metrics: AllMetrics | null;

  /** Whether metrics are loading */
  loading: boolean;

  /** Last error */
  error: Error | null;

  /** Refresh metrics */
  refresh: () => Promise<void>;
}

/**
 * Hook for accessing agent metrics
 */
export function useRustAgentMetrics(): UseRustAgentMetricsReturn {
  const orchestrator = getRustAgentOrchestrator();

  const [metrics, setMetrics] = useState<AllMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allMetrics = await orchestrator.getAllMetrics();
      setMetrics(allMetrics);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get metrics');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [orchestrator]);

  // Load metrics on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    metrics,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// useRustAgentTools Hook
// ============================================================================

export interface UseRustAgentToolsReturn {
  /** Available tools */
  tools: ToolDefinition[];

  /** Whether tools are loading */
  loading: boolean;

  /** Last error */
  error: Error | null;

  /** Refresh tool list */
  refresh: () => Promise<void>;
}

/**
 * Hook for accessing available tools
 */
export function useRustAgentTools(): UseRustAgentToolsReturn {
  const orchestrator = getRustAgentOrchestrator();

  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const toolList = await orchestrator.listTools();
      setTools(toolList);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to list tools');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [orchestrator]);

  // Load tools on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    tools,
    loading,
    error,
    refresh,
  };
}
