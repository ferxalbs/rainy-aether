import { useSyncExternalStore } from 'react';
import { ChatMessage } from '@/types/chat';

// ===========================
// Types & Interfaces
// ===========================

export interface AgentSession {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastMessageAt: Date;
}

export interface AgentState {
  sessions: AgentSession[];
  activeSessionId: string | null;
  isLoading: boolean;
}

// ===========================
// State Management
// ===========================

let currentState: AgentState = {
  sessions: [],
  activeSessionId: null,
  isLoading: false,
};

let cachedSnapshot: AgentState = { ...currentState };

const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const setState = (updater: (prev: AgentState) => AgentState) => {
  const next = updater(currentState);
  currentState = next;
  cachedSnapshot = { ...next };
  notifyListeners();
};

// ===========================
// Store Actions
// ===========================

export const agentActions = {
  /**
   * Create a new agent session
   */
  createSession(
    name: string,
    model: string = 'gemini-3-pro',
    systemPrompt: string = 'You are a helpful coding assistant integrated into a Tauri-based IDE. You can read files, edit code, and explore the project structure.'
  ): string {
    const sessionId = crypto.randomUUID();
    const now = new Date();

    const newSession: AgentSession = {
      id: sessionId,
      name,
      model,
      systemPrompt,
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: systemPrompt,
          timestamp: now,
        },
      ],
      createdAt: now,
      lastMessageAt: now,
    };

    setState((prev) => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      activeSessionId: sessionId,
    }));

    return sessionId;
  },

  /**
   * Delete a session
   */
  deleteSession(sessionId: string) {
    setState((prev) => {
      const newSessions = prev.sessions.filter((s) => s.id !== sessionId);
      const newActiveId =
        prev.activeSessionId === sessionId
          ? newSessions[0]?.id || null
          : prev.activeSessionId;

      return {
        ...prev,
        sessions: newSessions,
        activeSessionId: newActiveId,
      };
    });
  },

  /**
   * Set the active session
   */
  setActiveSession(sessionId: string | null) {
    setState((prev) => ({
      ...prev,
      activeSessionId: sessionId,
    }));
  },

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: ChatMessage) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              lastMessageAt: new Date(),
            }
          : session
      ),
    }));
  },

  /**
   * Update a message in a session (useful for updating tool call results)
   */
  updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            }
          : session
      ),
    }));
  },

  /**
   * Clear all messages in a session (keep system prompt)
   */
  clearSession(sessionId: string) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [session.messages[0]], // Keep system prompt
              lastMessageAt: new Date(),
            }
          : session
      ),
    }));
  },

  /**
   * Update session model
   */
  updateSessionModel(sessionId: string, model: string) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              model,
            }
          : session
      ),
    }));
  },

  /**
   * Update session name
   */
  updateSessionName(sessionId: string, name: string) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              name,
            }
          : session
      ),
    }));
  },

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean) {
    setState((prev) => ({
      ...prev,
      isLoading,
    }));
  },

  /**
   * Get a specific session
   */
  getSession(sessionId: string): AgentSession | undefined {
    return currentState.sessions.find((s) => s.id === sessionId);
  },

  /**
   * Get the active session
   */
  getActiveSession(): AgentSession | undefined {
    if (!currentState.activeSessionId) return undefined;
    return currentState.sessions.find((s) => s.id === currentState.activeSessionId);
  },
};

// ===========================
// React Hooks
// ===========================

/**
 * Hook to access agent store state
 */
export function useAgentStore(): AgentState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => cachedSnapshot
  );
}

/**
 * Hook to get the active session
 */
export function useActiveSession(): AgentSession | undefined {
  const state = useAgentStore();
  if (!state.activeSessionId) return undefined;
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

/**
 * Hook to get all sessions
 */
export function useSessions(): AgentSession[] {
  const state = useAgentStore();
  return state.sessions;
}

/**
 * Hook to get loading state
 */
export function useAgentLoading(): boolean {
  const state = useAgentStore();
  return state.isLoading;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Get current state (for non-React contexts)
 */
export function getAgentState(): AgentState {
  return currentState;
}
