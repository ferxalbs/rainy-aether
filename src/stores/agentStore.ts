import { useSyncExternalStore } from 'react';
import { ChatMessage } from '@/types/chat';
import { agentHistoryService } from '@/services/agent/AgentHistoryService';
import { DEFAULT_SYSTEM_PROMPT } from '@/services/agent/agentSystemPrompt';

// ===========================
// Types & Interfaces
// ===========================

export interface AgentSession {
  id: string;
  name: string;
  description?: string;  // Auto-generated description based on conversation
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

// ===========================
// Debounced Save System
// ===========================

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 300;

const debouncedSaveSession = (session: AgentSession) => {
  // Cancel any pending save for this session
  const pending = pendingSaves.get(session.id);
  if (pending) {
    clearTimeout(pending);
  }

  // Schedule a new save
  const timeoutId = setTimeout(() => {
    pendingSaves.delete(session.id);
    // Fire and forget - don't block on I/O
    agentHistoryService.saveSession(session).catch(err => {
      console.warn('[AgentStore] Background save failed:', err);
    });
  }, DEBOUNCE_MS);

  pendingSaves.set(session.id, timeoutId);
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
   * Set the current workspace for session isolation
   * Should be called when workspace changes
   */
  async setWorkspace(workspacePath: string) {
    if (!workspacePath) {
      console.warn('[AgentStore] No workspace path provided');
      return;
    }

    const currentPath = agentHistoryService.getWorkspacePath();
    if (currentPath === workspacePath) {
      return; // Already set to this workspace
    }

    console.log('[AgentStore] Setting workspace:', workspacePath);

    // Clear current state
    setState((prev) => ({
      ...prev,
      sessions: [],
      activeSessionId: null,
    }));

    // Set new workspace in history service
    await agentHistoryService.setWorkspace(workspacePath);

    // Reload sessions for this workspace
    await this.initialize();
  },

  /**
   * Initialize store from history
   */
  async initialize() {
    try {
      const sessions = await agentHistoryService.listSessions();
      if (sessions.length > 0) {
        setState((prev) => ({
          ...prev,
          sessions,
          activeSessionId: sessions[0].id,
        }));
      } else {
        // Create initial session if none exists
        this.createSession("New Chat");
      }
    } catch (error) {
      console.error('Failed to initialize agent store:', error);
      // Create a default session on error
      this.createSession("New Chat");
    }
  },

  /**
   * Create a new agent session
   */
  createSession(
    name: string,
    model: string = 'gemini-flash-latest',  // Gemini 3 Flash (default for Auto mode)
    systemPrompt: string = DEFAULT_SYSTEM_PROMPT
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

    // Save to history
    agentHistoryService.saveSession(newSession);

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

    // Delete from history
    agentHistoryService.deleteSession(sessionId);
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
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            messages: [...session.messages, message],
            lastMessageAt: new Date(),
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    // Use debounced save to avoid blocking UI
    if (updatedSession) {
      debouncedSaveSession(updatedSession);
    }
  },

  /**
   * Update a message in a session (useful for updating tool call results)
   */
  updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    // Use debounced save to avoid blocking UI
    if (updatedSession) {
      debouncedSaveSession(updatedSession);
    }
  },

  /**
   * Clear all messages in a session (keep system prompt)
   */
  clearSession(sessionId: string) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            messages: [session.messages[0]], // Keep system prompt
            lastMessageAt: new Date(),
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      agentHistoryService.saveSession(updatedSession);
    }
  },

  /**
   * Update session model
   */
  updateSessionModel(sessionId: string, model: string) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            model,
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      agentHistoryService.saveSession(updatedSession);
    }
  },

  /**
   * Update session title and description (auto-generated)
   */
  updateSessionTitleAndDescription(sessionId: string, title: string, description?: string) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            name: title,
            description: description || session.description,
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      debouncedSaveSession(updatedSession);
    }
  },

  /**
   * Update session name
   */
  updateSessionName(sessionId: string, name: string) {
    let updatedSession: AgentSession | undefined;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id === sessionId) {
          updatedSession = {
            ...session,
            name,
          };
          return updatedSession;
        }
        return session;
      }),
    }));

    if (updatedSession) {
      agentHistoryService.saveSession(updatedSession);
    }
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
 * Returns the current active session from the store
 */
export function useActiveSession(): AgentSession | undefined {
  const state = useAgentStore();

  if (!state.activeSessionId) {
    return undefined;
  }

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
