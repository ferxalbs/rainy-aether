import { useSyncExternalStore } from 'react';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  releaseDate?: string;
  downloadUrl?: string;
}

export interface UpdateProgress {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'ready' | 'up-to-date' | 'error' | 'dev-mode';
  progress?: number;
  message?: string;
}

interface UpdateState {
  updateInfo: UpdateInfo | null;
  updateProgress: UpdateProgress;
  lastChecked: Date | null;
  autoCheckEnabled: boolean;
  checkInterval: number; // in hours
  showNotification: boolean;
}

const initialState: UpdateState = {
  updateInfo: null,
  updateProgress: {
    status: 'idle',
    progress: undefined,
    message: undefined,
  },
  lastChecked: null,
  autoCheckEnabled: true,
  checkInterval: 24, // Check every 24 hours by default
  showNotification: false,
};

let state: UpdateState = { ...initialState };
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// Subscribe function for useSyncExternalStore
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Snapshot function for useSyncExternalStore
function getSnapshot() {
  return state;
}

// Actions
export const updateActions = {
  setUpdateInfo(info: UpdateInfo) {
    state = {
      ...state,
      updateInfo: info,
      lastChecked: new Date(),
    };
    notifyListeners();
  },

  setUpdateProgress(progress: UpdateProgress) {
    state = {
      ...state,
      updateProgress: progress,
    };
    notifyListeners();
  },

  setShowNotification(show: boolean) {
    state = {
      ...state,
      showNotification: show,
    };
    notifyListeners();
  },

  dismissNotification() {
    state = {
      ...state,
      showNotification: false,
    };
    notifyListeners();
  },

  setAutoCheckEnabled(enabled: boolean) {
    state = {
      ...state,
      autoCheckEnabled: enabled,
    };
    notifyListeners();
  },

  setCheckInterval(hours: number) {
    state = {
      ...state,
      checkInterval: hours,
    };
    notifyListeners();
  },

  resetUpdateState() {
    state = {
      ...state,
      updateInfo: null,
      updateProgress: {
        status: 'idle',
        progress: undefined,
        message: undefined,
      },
    };
    notifyListeners();
  },

  shouldAutoCheck(): boolean {
    if (!state.autoCheckEnabled) return false;
    if (!state.lastChecked) return true;

    const now = new Date();
    const hoursSinceLastCheck =
      (now.getTime() - state.lastChecked.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastCheck >= state.checkInterval;
  },
};

// Hook to use the update store
export function useUpdateState() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Export state getter for non-React contexts
export function getUpdateState() {
  return state;
}
