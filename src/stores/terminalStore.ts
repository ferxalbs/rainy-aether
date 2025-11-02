import { useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

const isTauriEnv = () => {
  try {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    const byGlobal = !!w.__TAURI__ || !!w.__TAURI_INTERNALS__ || !!w.__TAURI_METADATA__;
    const byEnv = !!(import.meta as any)?.env?.TAURI_PLATFORM;
    const byUA = typeof navigator !== 'undefined' && /\bTauri\b/i.test(navigator.userAgent || '');
    return byGlobal || byEnv || byUA;
  } catch {
    return false;
  }
};

export interface TerminalSessionInfo {
  id: string;
  title: string;
  cwd?: string;
}

interface TerminalState {
  visible: boolean;
  sessions: TerminalSessionInfo[];
  activeSessionId: string | null;
}

const initialTerminalState: TerminalState = {
  visible: false,
  sessions: [],
  activeSessionId: null,
};

let terminalStateData: TerminalState = initialTerminalState;
let cachedSnapshot: TerminalState = { ...initialTerminalState };

type TerminalListener = () => void;

const listeners = new Set<TerminalListener>();

const notify = () => {
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
  cachedSnapshot = terminalStateData;
  notify();
  return terminalStateData;
};

const subscribe = (listener: TerminalListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

export const useTerminalState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const getTerminalState = () => terminalStateData;

// Legacy Solid-style accessor to keep existing consumers functional during migration
export const terminalState = () => terminalStateData;

export const terminalActions = {
  // Al mostrar el panel, si no hay sesiones, abrir una inmediatamente
  async toggle() {
    const snapshot = getTerminalState();
    const currentlyVisible = snapshot.visible;
    setState((prev) => ({ ...prev, visible: !prev.visible }));
    if (!currentlyVisible && snapshot.sessions.length === 0) {
      await terminalActions.open();
    }
  },
  show: () => setState((prev) => ({ ...prev, visible: true })),
  hide: () => setState((prev) => ({ ...prev, visible: false })),

  async open(shell?: string, cwd?: string, cols?: number, rows?: number) {
    try {
      // Try real terminal first; fallback to preview on failure
      const params: any = { shell, cwd };
      if (typeof cols === 'number' && typeof rows === 'number') {
        params.cols = cols;
        params.rows = rows;
      }
      const id = await invoke<string>('terminal_create', params);
      const info: TerminalSessionInfo = { id, title: shell || 'Terminal', cwd };
      setState((prev) => ({
        ...prev,
        visible: true,
        sessions: [...prev.sessions, info],
        activeSessionId: id,
      }));
      return id;
    } catch (err) {
      // Browser dev fallback: create a mock session
      const id = `mock-${Date.now()}`;
      const info: TerminalSessionInfo = { id, title: 'Terminal (Preview)', cwd };
      setState((prev) => ({
        ...prev,
        visible: true,
        sessions: [...prev.sessions, info],
        activeSessionId: id,
      }));
      console.warn('Terminal preview session created (invoke failed).', err);
      return id;
    }
  },

  async write(id: string, data: string) {
    try {
      if (isTauriEnv()) await invoke('terminal_write', { id, data });
      else console.debug('Terminal write (preview):', { id, data });
    } catch (err) {
      console.error('Terminal write failed:', err);
    }
  },

  async resize(id: string, cols: number, rows: number) {
    try {
      if (isTauriEnv()) await invoke('terminal_resize', { id, cols, rows });
      else console.debug('Terminal resize (preview):', { id, cols, rows });
    } catch (err) {
      console.error('Terminal resize failed:', err);
    }
  },

  async kill(id: string) {
    try {
      if (isTauriEnv()) await invoke('terminal_kill', { id });
      setState((prev) => {
        const newSessions = prev.sessions.filter(s => s.id !== id);
        const newActive = prev.activeSessionId === id ? (newSessions[0]?.id || null) : prev.activeSessionId;
        return {
          ...prev,
          sessions: newSessions,
          activeSessionId: newActive,
        };
      });
    } catch (err) {
      console.error('Terminal kill failed:', err);
    }
  },

  setActive(id: string) {
    setState((prev) => ({ ...prev, activeSessionId: id }));
  },

  async changeDirectory(id: string, path: string) {
    try {
      if (isTauriEnv()) await invoke('terminal_change_directory', { id, path });
      // Update session info locally
      setState((prev) => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === id ? { ...s, cwd: path } : s)
      }));
    } catch (err) {
      console.error('Terminal changeDirectory failed:', err);
    }
  },

  async openWindowsTerminal(cwd?: string) {
    try {
      if (isTauriEnv()) {
        const params: any = {};
        if (cwd) params.cwd = cwd;
        await invoke('open_windows_terminal', params);
      } else {
        console.warn('Windows Terminal integration only available in desktop mode');
      }
    } catch (err) {
      console.error('Failed to open Windows Terminal:', err);
      if (!isTauriEnv()) alert(`Failed to open Windows Terminal: ${err}`);
    }
  }
};