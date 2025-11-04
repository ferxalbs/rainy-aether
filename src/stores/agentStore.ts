/**
 * Agent Store
 *
 * Central state management for AI agent sessions, messages, and configuration.
 * Uses the useSyncExternalStore pattern consistent with other stores in the app.
 */

import { useSyncExternalStore } from 'react';
import { saveToStore, loadFromStore } from './app-store';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Message in a conversation
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  seed?: number;

  // Advanced features
  parallelToolCalls?: boolean;
  maxToolCalls?: number;
  toolTimeout?: number;
  user?: string;
  responseFormat?: 'text' | 'json_object' | 'json_schema';
  responseSchema?: Record<string, unknown>;
}

/**
 * Agent session
 */
export interface AgentSession {
  id: string;
  name: string;
  providerId: string;
  modelId: string;
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  createdAt: number;
  updatedAt: number;
  config: AgentConfig;
  totalTokens: number;
  totalCost: number;
}

/**
 * Agent state
 */
export interface AgentState {
  sessions: Map<string, AgentSession>;
  activeSessionId: string | null;
  isInitialized: boolean;
  lastError: string | null;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultConfig: AgentConfig = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  parallelToolCalls: true, // Enable by default for models that support it
  maxToolCalls: 10, // Reasonable limit
  toolTimeout: 30000, // 30 seconds
};

const initialState: AgentState = {
  sessions: new Map(),
  activeSessionId: null,
  isInitialized: false,
  lastError: null,
};

// ============================================================================
// STATE & LISTENERS
// ============================================================================

let agentState: AgentState = initialState;
let cachedSnapshot: AgentState = { ...initialState };

type AgentListener = () => void;
const listeners = new Set<AgentListener>();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Agent listener error:', error);
    }
  });
};

const setState = (updater: (prev: AgentState) => AgentState) => {
  agentState = updater(agentState);
  cachedSnapshot = agentState;
  notify();
  return agentState;
};

const subscribe = (listener: AgentListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to subscribe to agent state changes
 */
export const useAgentState = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/**
 * Get current agent state (non-reactive)
 */
export const getAgentState = () => agentState;

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Initialize agent store from persistent storage
 */
async function initialize(): Promise<void> {
  try {
    const savedSessions = await loadFromStore<[string, AgentSession][]>(
      'rainy-agent-sessions',
      []
    );
    const activeId = await loadFromStore<string | null>('rainy-agent-active-session', null);

    setState((prev) => ({
      ...prev,
      sessions: new Map(savedSessions),
      activeSessionId: activeId,
      isInitialized: true,
    }));
  } catch (error) {
    console.error('Failed to initialize agent store:', error);
    setState((prev) => ({
      ...prev,
      isInitialized: true,
      lastError: `Initialization failed: ${error}`,
    }));
  }
}

/**
 * Create a new agent session
 */
async function createSession(params: {
  name?: string;
  providerId: string;
  modelId: string;
  config?: Partial<AgentConfig>;
  systemPrompt?: string;
}): Promise<string> {
  const sessionId = crypto.randomUUID();

  const session: AgentSession = {
    id: sessionId,
    name: params.name || `Chat ${new Date().toLocaleTimeString()}`,
    providerId: params.providerId,
    modelId: params.modelId,
    messages: params.systemPrompt
      ? [
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: params.systemPrompt,
            timestamp: Date.now(),
          },
        ]
      : [],
    isStreaming: false,
    streamingMessageId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    config: { ...defaultConfig, ...params.config },
    totalTokens: 0,
    totalCost: 0,
  };

  setState((prev) => ({
    ...prev,
    sessions: new Map(prev.sessions).set(sessionId, session),
    activeSessionId: sessionId,
  }));

  await persistSessions();
  return sessionId;
}

/**
 * Delete a session
 */
async function deleteSession(sessionId: string): Promise<void> {
  setState((prev) => {
    const sessions = new Map(prev.sessions);
    sessions.delete(sessionId);

    const activeSessionId =
      prev.activeSessionId === sessionId ? sessions.keys().next().value || null : prev.activeSessionId;

    return { ...prev, sessions, activeSessionId };
  });

  await persistSessions();
}

/**
 * Set active session
 */
async function setActiveSession(sessionId: string): Promise<void> {
  setState((prev) => ({ ...prev, activeSessionId: sessionId }));
  await saveToStore('rainy-agent-active-session', sessionId);
}

/**
 * Add a message to a session
 */
function addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): string {
  const messageId = crypto.randomUUID();
  const fullMessage: Message = {
    ...message,
    id: messageId,
    timestamp: Date.now(),
  };

  setState((prev) => {
    const session = prev.sessions.get(sessionId);
    if (!session) return prev;

    const updated: AgentSession = {
      ...session,
      messages: [...session.messages, fullMessage],
      updatedAt: Date.now(),
      totalTokens: session.totalTokens + (fullMessage.tokens || 0),
      totalCost: session.totalCost + (fullMessage.cost || 0),
    };

    return {
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, updated),
    };
  });

  void persistSessions();
  return messageId;
}

/**
 * Update message content (for streaming)
 */
function updateMessageContent(sessionId: string, messageId: string, content: string): void {
  setState((prev) => {
    const session = prev.sessions.get(sessionId);
    if (!session) return prev;

    const messages = session.messages.map((msg) =>
      msg.id === messageId ? { ...msg, content } : msg
    );

    const updated: AgentSession = { ...session, messages, updatedAt: Date.now() };

    return {
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, updated),
    };
  });
}

/**
 * Update message metadata (tokens, cost, etc.)
 */
function updateMessageMetadata(
  sessionId: string,
  messageId: string,
  metadata: Partial<Pick<Message, 'tokens' | 'cost' | 'metadata'>>
): void {
  setState((prev) => {
    const session = prev.sessions.get(sessionId);
    if (!session) return prev;

    let tokenDelta = 0;
    let costDelta = 0;

    const messages = session.messages.map((msg) => {
      if (msg.id === messageId) {
        tokenDelta = (metadata.tokens || 0) - (msg.tokens || 0);
        costDelta = (metadata.cost || 0) - (msg.cost || 0);
        return { ...msg, ...metadata };
      }
      return msg;
    });

    const updated: AgentSession = {
      ...session,
      messages,
      totalTokens: session.totalTokens + tokenDelta,
      totalCost: session.totalCost + costDelta,
      updatedAt: Date.now(),
    };

    return {
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, updated),
    };
  });

  void persistSessions();
}

/**
 * Set streaming state for a session
 */
function setStreaming(sessionId: string, isStreaming: boolean, messageId: string | null = null): void {
  setState((prev) => {
    const session = prev.sessions.get(sessionId);
    if (!session) return prev;

    const updated: AgentSession = {
      ...session,
      isStreaming,
      streamingMessageId: messageId,
    };

    return {
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, updated),
    };
  });
}

/**
 * Update session configuration
 */
async function updateConfig(sessionId: string, config: Partial<AgentConfig>): Promise<void> {
  setState((prev) => {
    const session = prev.sessions.get(sessionId);
    if (!session) return prev;

    const updated: AgentSession = {
      ...session,
      config: { ...session.config, ...config },
      updatedAt: Date.now(),
    };

    return {
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, updated),
    };
  });

  await persistSessions();
}

/**
 * Rename a session
 */
async function renameSession(sessionId: string, name: string): Promise<void> {
  setState((prev) => {
    const session = prev.sessions.get(sessionId);
    if (!session) return prev;

    const updated: AgentSession = { ...session, name, updatedAt: Date.now() };

    return {
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, updated),
    };
  });

  await persistSessions();
}

/**
 * Clear all messages in a session
 */
async function clearMessages(sessionId: string): Promise<void> {
  setState((prev) => {
    const session = prev.sessions.get(sessionId);
    if (!session) return prev;

    // Keep system message if present
    const systemMessage = session.messages.find((m) => m.role === 'system');
    const messages = systemMessage ? [systemMessage] : [];

    const updated: AgentSession = {
      ...session,
      messages,
      totalTokens: 0,
      totalCost: 0,
      updatedAt: Date.now(),
    };

    return {
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, updated),
    };
  });

  await persistSessions();
}

/**
 * Delete a specific message
 */
async function deleteMessage(sessionId: string, messageId: string): Promise<void> {
  setState((prev) => {
    const session = prev.sessions.get(sessionId);
    if (!session) return prev;

    const messageToDelete = session.messages.find((m) => m.id === messageId);
    const messages = session.messages.filter((m) => m.id !== messageId);

    const updated: AgentSession = {
      ...session,
      messages,
      totalTokens: session.totalTokens - (messageToDelete?.tokens || 0),
      totalCost: session.totalCost - (messageToDelete?.cost || 0),
      updatedAt: Date.now(),
    };

    return {
      ...prev,
      sessions: new Map(prev.sessions).set(sessionId, updated),
    };
  });

  await persistSessions();
}

/**
 * Get a specific session
 */
function getSession(sessionId: string): AgentSession | undefined {
  return agentState.sessions.get(sessionId);
}

/**
 * Set last error
 */
function setError(error: string | null): void {
  setState((prev) => ({ ...prev, lastError: error }));
}

/**
 * Persist sessions to storage
 */
async function persistSessions(): Promise<void> {
  try {
    await saveToStore('rainy-agent-sessions', Array.from(agentState.sessions.entries()));
  } catch (error) {
    console.error('Failed to persist agent sessions:', error);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const agentActions = {
  initialize,
  createSession,
  deleteSession,
  setActiveSession,
  addMessage,
  updateMessageContent,
  updateMessageMetadata,
  setStreaming,
  updateConfig,
  renameSession,
  clearMessages,
  deleteMessage,
  getSession,
  setError,
};
