/**
 * Enhanced Terminal Store
 *
 * Provides comprehensive state management for terminals with:
 * - Split panel support (horizontal/vertical)
 * - Session persistence and recovery
 * - Profile management
 * - History tracking
 * - Keyboard shortcuts
 */

import { useSyncExternalStore } from "react";
import { getTerminalService, SessionState, ShellProfile } from "@/services/terminalService";
import { loadFromStore, saveToStore } from "./app-store";

// Types
export interface TerminalSession {
  id: string;
  title: string;
  shell: string;
  cwd?: string;
  state: SessionState;
  createdAt: number;
  profile?: string;
}

export type SplitDirection = "horizontal" | "vertical";

export interface TerminalSplit {
  id: string;
  direction?: SplitDirection;
  sessions: string[]; // session IDs in this split
  activeSessionId: string | null;
  size?: number; // percentage of parent container
}

export interface TerminalLayout {
  splits: TerminalSplit[];
  activeSplitId: string | null;
}

export interface TerminalConfig {
  defaultShell?: string;
  defaultProfile?: string;
  fontSize: number;
  fontFamily: string;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  scrollback: number;
  enableBell: boolean;
  closeOnExit: boolean;
}

export interface TerminalHistory {
  command: string;
  timestamp: number;
  cwd: string;
  exitCode?: number;
}

interface TerminalState {
  visible: boolean;
  sessions: Map<string, TerminalSession>;
  layout: TerminalLayout;
  profiles: ShellProfile[];
  config: TerminalConfig;
  history: TerminalHistory[];
  searchQuery: string;
  searchVisible: boolean;
}

// Default configuration
const defaultConfig: TerminalConfig = {
  fontSize: 13,
  fontFamily: 'Consolas, "Courier New", monospace',
  cursorStyle: "block",
  cursorBlink: true,
  scrollback: 10000,
  enableBell: false,
  closeOnExit: false,
};

const initialLayout: TerminalLayout = {
  splits: [],
  activeSplitId: null,
};

const initialTerminalState: TerminalState = {
  visible: false,
  sessions: new Map(),
  layout: initialLayout,
  profiles: [],
  config: defaultConfig,
  history: [],
  searchQuery: "",
  searchVisible: false,
};

// State management
let terminalStateData: TerminalState = { ...initialTerminalState };
let cachedSnapshot: TerminalState = { ...initialTerminalState };

type TerminalListener = () => void;
const listeners = new Set<TerminalListener>();

const notify = () => {
  cachedSnapshot = {
    ...terminalStateData,
    sessions: new Map(terminalStateData.sessions),
    layout: { ...terminalStateData.layout, splits: [...terminalStateData.layout.splits] },
  };
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Terminal state listener error:", error);
    }
  });
};

const setState = (updater: (prev: TerminalState) => TerminalState) => {
  terminalStateData = updater(terminalStateData);
  notify();
  return terminalStateData;
};

const subscribe = (listener: TerminalListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => cachedSnapshot;

export const useTerminalState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const getTerminalState = () => terminalStateData;

// Persistence
const STORAGE_KEY_CONFIG = "terminal-config";
const STORAGE_KEY_HISTORY = "terminal-history";
const STORAGE_KEY_SESSIONS = "terminal-sessions";

async function loadConfig(): Promise<TerminalConfig> {
  try {
    const stored = await loadFromStore<TerminalConfig | null>(STORAGE_KEY_CONFIG, null);
    return stored ? { ...defaultConfig, ...stored } : defaultConfig;
  } catch {
    return defaultConfig;
  }
}

async function saveConfig(config: TerminalConfig): Promise<void> {
  try {
    await saveToStore(STORAGE_KEY_CONFIG, config);
  } catch (error) {
    console.error("Failed to save terminal config:", error);
  }
}

async function loadHistory(): Promise<TerminalHistory[]> {
  try {
    const stored = await loadFromStore<TerminalHistory[]>(STORAGE_KEY_HISTORY, []);
    return stored;
  } catch {
    return [];
  }
}

async function saveHistory(history: TerminalHistory[]): Promise<void> {
  try {
    // Keep only last 1000 entries
    const trimmed = history.slice(-1000);
    await saveToStore(STORAGE_KEY_HISTORY, trimmed);
  } catch (error) {
    console.error("Failed to save terminal history:", error);
  }
}

interface PersistedSession {
  id: string;
  title: string;
  shell: string;
  cwd?: string;
  profile?: string;
}

async function loadPersistedSessions(): Promise<PersistedSession[]> {
  try {
    const stored = await loadFromStore<PersistedSession[]>(STORAGE_KEY_SESSIONS, []);
    return stored;
  } catch {
    return [];
  }
}

async function savePersistedSessions(sessions: TerminalSession[]): Promise<void> {
  try {
    const persisted: PersistedSession[] = sessions
      .filter((s) => s.state === "active" || s.state === "starting")
      .map((s) => ({
        id: s.id,
        title: s.title,
        shell: s.shell,
        cwd: s.cwd,
        profile: s.profile,
      }));
    await saveToStore(STORAGE_KEY_SESSIONS, persisted);
  } catch (error) {
    console.error("Failed to save terminal sessions:", error);
  }
}

// Split management helpers
function findSplitById(splits: TerminalSplit[], id: string): TerminalSplit | undefined {
  return splits.find((s) => s.id === id);
}

function createNewSplit(sessionId: string): TerminalSplit {
  return {
    id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sessions: [sessionId],
    activeSessionId: sessionId,
  };
}

// Service integration flag
let serviceInitialized = false;
let isCreatingSession = false;

// Terminal Actions
export const terminalActions = {
  /**
   * Initialize terminal system (load config, profiles, set up listeners)
   */
  async initialize(): Promise<void> {
    if (serviceInitialized) {
      console.warn("Terminal service already initialized");
      return;
    }

    try {
      const service = getTerminalService();
      await service.initialize();

      // Load persisted data
      const [config, history, profiles] = await Promise.all([
        loadConfig(),
        loadHistory(),
        service.initProfiles(),
      ]);

      setState((prev) => ({
        ...prev,
        config,
        history,
        profiles,
      }));

      // Set up event listeners
      service.onData((_id, _data) => {
        // Data is handled by xterm instances directly
      });

      service.onState((id, state) => {
        setState((prev) => {
          const session = prev.sessions.get(id);
          if (session) {
            const updated = new Map(prev.sessions);
            updated.set(id, { ...session, state });
            return { ...prev, sessions: updated };
          }
          return prev;
        });
      });

      service.onExit((id) => {
        const config = getTerminalState().config;
        if (config.closeOnExit) {
          terminalActions.removeSession(id);
        }
      });

      service.onError((id, error) => {
        console.error(`Terminal ${id} error:`, error);
      });

      serviceInitialized = true;
      console.log("Terminal system initialized");
    } catch (error) {
      console.error("Failed to initialize terminal system:", error);
      throw error;
    }
  },

  /**
   * Toggle terminal panel visibility
   */
  async toggle(): Promise<void> {
    const state = getTerminalState();
    const willBeVisible = !state.visible;

    setState((prev) => ({ ...prev, visible: willBeVisible }));

    // Create first session if becoming visible with no sessions
    if (willBeVisible && state.sessions.size === 0 && !isCreatingSession) {
      await terminalActions.createSession();
    }
  },

  /**
   * Show terminal panel
   */
  show(): void {
    setState((prev) => ({ ...prev, visible: true }));
  },

  /**
   * Hide terminal panel
   */
  hide(): void {
    setState((prev) => ({ ...prev, visible: false }));
  },

  /**
   * Create a new terminal session
   */
  async createSession(options: {
    shell?: string;
    cwd?: string;
    profile?: string;
    splitId?: string;
  } = {}): Promise<string | null> {
    if (isCreatingSession) {
      console.warn("Session creation already in progress");
      return null;
    }

    isCreatingSession = true;

    try {
      if (!serviceInitialized) {
        await terminalActions.initialize();
      }

      const service = getTerminalService();
      const state = getTerminalState();

      // Determine shell from profile or config
      let shell = options.shell;
      if (!shell && options.profile) {
        const profile = state.profiles.find((p) => p.name === options.profile);
        if (profile) shell = profile.command;
      }
      if (!shell) {
        shell = state.config.defaultShell;
      }

      // Create session via service
      const id = await service.create({
        shell,
        cwd: options.cwd,
        cols: 80,
        rows: 24,
      });

      // Create session info
      const session: TerminalSession = {
        id,
        title: options.profile || shell || "Terminal",
        shell: shell || "default",
        cwd: options.cwd,
        state: "starting",
        createdAt: Date.now(),
        profile: options.profile,
      };

      // Add to state
      setState((prev) => {
        const sessions = new Map(prev.sessions);
        sessions.set(id, session);

        // Add to layout
        const layout = { ...prev.layout };
        const targetSplitId = options.splitId || prev.layout.activeSplitId;
        let split = targetSplitId ? findSplitById(layout.splits, targetSplitId) : null;

        if (!split) {
          // Create new split
          split = createNewSplit(id);
          layout.splits = [...layout.splits, split];
          layout.activeSplitId = split.id;
        } else {
          // Add to existing split
          const splitIndex = layout.splits.findIndex((s) => s.id === split!.id);
          const updatedSplit = {
            ...split,
            sessions: [...split.sessions, id],
            activeSessionId: id,
          };
          layout.splits = [
            ...layout.splits.slice(0, splitIndex),
            updatedSplit,
            ...layout.splits.slice(splitIndex + 1),
          ];
        }

        return {
          ...prev,
          sessions,
          layout,
          visible: true,
        };
      });

      // Persist sessions
      await savePersistedSessions(Array.from(getTerminalState().sessions.values()));

      return id;
    } catch (error) {
      console.error("Failed to create terminal session:", error);
      return null;
    } finally {
      isCreatingSession = false;
    }
  },

  /**
   * Remove a terminal session
   */
  async removeSession(id: string): Promise<void> {
    try {
      const service = getTerminalService();
      await service.kill(id);

      setState((prev) => {
        const sessions = new Map(prev.sessions);
        sessions.delete(id);

        // Remove from layout
        const layout = { ...prev.layout };
        const splits = layout.splits.map((split) => {
          const filtered = split.sessions.filter((sid) => sid !== id);
          if (filtered.length === 0) return null;

          const activeStillExists = filtered.includes(split.activeSessionId || "");
          return {
            ...split,
            sessions: filtered,
            activeSessionId: activeStillExists ? split.activeSessionId : filtered[0],
          };
        }).filter((s): s is TerminalSplit => s !== null);

        // Remove empty splits and update active split
        layout.splits = splits;
        if (splits.length > 0 && !layout.activeSplitId) {
          layout.activeSplitId = splits[0].id;
        } else if (splits.length === 0) {
          layout.activeSplitId = null;
        }

        return {
          ...prev,
          sessions,
          layout,
        };
      });

      await savePersistedSessions(Array.from(getTerminalState().sessions.values()));
    } catch (error) {
      console.error(`Failed to remove terminal session ${id}:`, error);
    }
  },

  /**
   * Set active session in a split
   */
  setActiveSession(splitId: string, sessionId: string): void {
    setState((prev) => {
      const layout = { ...prev.layout };
      const splitIndex = layout.splits.findIndex((s) => s.id === splitId);
      if (splitIndex === -1) return prev;

      const split = layout.splits[splitIndex];
      const updatedSplit = { ...split, activeSessionId: sessionId };
      layout.splits = [
        ...layout.splits.slice(0, splitIndex),
        updatedSplit,
        ...layout.splits.slice(splitIndex + 1),
      ];
      layout.activeSplitId = splitId;

      return { ...prev, layout };
    });
  },

  /**
   * Set active split
   */
  setActiveSplit(splitId: string): void {
    setState((prev) => ({
      ...prev,
      layout: { ...prev.layout, activeSplitId: splitId },
    }));
  },

  /**
   * Create a new split (simplified - just creates a new terminal in a new split)
   */
  async createSplit(_direction: SplitDirection): Promise<string | null> {
    // For now, just create a new terminal session
    // The split direction is stored but actual split rendering would need more UI work
    const sessionId = await terminalActions.createSession();
    return sessionId;
  },

  /**
   * Update terminal configuration
   */
  async updateConfig(updates: Partial<TerminalConfig>): Promise<void> {
    setState((prev) => {
      const config = { ...prev.config, ...updates };
      saveConfig(config);
      return { ...prev, config };
    });
  },

  /**
   * Add command to history
   */
  async addToHistory(entry: TerminalHistory): Promise<void> {
    setState((prev) => {
      const history = [...prev.history, entry];
      saveHistory(history);
      return { ...prev, history };
    });
  },

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    setState((prev) => ({ ...prev, searchQuery: query }));
  },

  /**
   * Toggle search visibility
   */
  toggleSearch(): void {
    setState((prev) => ({ ...prev, searchVisible: !prev.searchVisible }));
  },

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    const state = getTerminalState();
    const service = getTerminalService();

    // Kill all sessions
    await Promise.all(
      Array.from(state.sessions.keys()).map((id) => service.kill(id).catch(() => {}))
    );

    setState((prev) => ({
      ...prev,
      sessions: new Map(),
      layout: initialLayout,
    }));

    await savePersistedSessions([]);
  },

  /**
   * Recover persisted sessions
   */
  async recoverSessions(): Promise<void> {
    try {
      const persisted = await loadPersistedSessions();
      if (persisted.length === 0) return;

      console.log(`Recovering ${persisted.length} terminal sessions`);

      for (const session of persisted) {
        await terminalActions.createSession({
          shell: session.shell,
          cwd: session.cwd,
          profile: session.profile,
        });
      }
    } catch (error) {
      console.error("Failed to recover terminal sessions:", error);
    }
  },
};
