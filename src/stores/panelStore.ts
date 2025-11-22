/**
 * Panel Store - Manages bottom panel state (Terminal, Problems, Output, etc.)
 *
 * Provides centralized state management for the bottom panel with:
 * - Panel visibility toggle
 * - Active tab management
 * - Persistence via Tauri store
 */

import { useSyncExternalStore } from "react";
import { loadFromStore, saveToStore } from "./app-store";

export type BottomPanelTab = 'terminal' | 'problems' | 'output' | 'diff';

interface PanelState {
  isBottomPanelOpen: boolean;
  activeBottomTab: BottomPanelTab;
}

const initialState: PanelState = {
  isBottomPanelOpen: false,
  activeBottomTab: 'terminal',
};

// State management
let currentState: PanelState = { ...initialState };
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[Panel Store] Listener error:', error);
    }
  });
};

const setState = (updater: (prev: PanelState) => PanelState) => {
  const next = updater(currentState);
  currentState = next;
  notifyListeners();
  return next;
};

const getState = () => currentState;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Helper to save state to persistent storage
const safeSaveToStore = async <T,>(key: string, value: T): Promise<void> => {
  try {
    await saveToStore(key, value);
  } catch (error) {
    console.error(`[Panel Store] Failed to save ${key}:`, error);
  }
};

/**
 * Toggle a specific bottom panel tab
 * - If panel is closed: Open it and switch to the tab
 * - If panel is open and tab is active: Close the panel
 * - If panel is open and different tab is active: Switch to the tab
 */
const togglePanel = (tab: BottomPanelTab) => {
  setState((prev) => {
    const willClose = prev.isBottomPanelOpen && prev.activeBottomTab === tab;
    const newState = {
      isBottomPanelOpen: !willClose,
      activeBottomTab: willClose ? prev.activeBottomTab : tab,
    };

    // Persist state
    safeSaveToStore('rainy-panel-open', newState.isBottomPanelOpen);
    safeSaveToStore('rainy-panel-active-tab', newState.activeBottomTab);

    return newState;
  });
};

/**
 * Show a specific panel tab (always opens, switches if needed)
 */
const showPanel = (tab: BottomPanelTab) => {
  setState((prev) => {
    const newState = {
      isBottomPanelOpen: true,
      activeBottomTab: tab,
    };

    // Persist state
    safeSaveToStore('rainy-panel-open', true);
    safeSaveToStore('rainy-panel-active-tab', tab);

    return newState;
  });
};

/**
 * Hide the bottom panel
 */
const hidePanel = () => {
  setState((prev) => ({
    ...prev,
    isBottomPanelOpen: false,
  }));

  safeSaveToStore('rainy-panel-open', false);
};

/**
 * Set the active tab (without changing visibility)
 */
const setActiveTab = (tab: BottomPanelTab) => {
  setState((prev) => ({
    ...prev,
    activeBottomTab: tab,
  }));

  safeSaveToStore('rainy-panel-active-tab', tab);
};

/**
 * Initialize panel state from persistent storage
 */
const initializePanelState = async () => {
  try {
    const [isOpen, activeTab] = await Promise.all([
      loadFromStore<boolean>('rainy-panel-open', false),
      loadFromStore<BottomPanelTab>('rainy-panel-active-tab', 'terminal'),
    ]);

    setState(() => ({
      isBottomPanelOpen: isOpen,
      activeBottomTab: activeTab,
    }));

    console.log('[Panel Store] Initialized:', currentState);
  } catch (error) {
    console.error('[Panel Store] Failed to initialize:', error);
  }
};

// Actions
export const panelActions = {
  togglePanel,
  showPanel,
  hidePanel,
  setActiveTab,
  initialize: initializePanelState,
  getState,
};

// React hook
export function usePanelState() {
  return useSyncExternalStore(subscribe, getState, getState);
}

// Export getState for non-React contexts
export const getPanelState = getState;
