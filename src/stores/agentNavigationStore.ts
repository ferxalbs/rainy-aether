import { useSyncExternalStore } from 'react';

export type AgentView = 'home' | 'ask-ai' | 'prompts' | 'abby' | 'split-view';

export interface AgentNavigationState {
  currentView: AgentView;
}

const initialState: AgentNavigationState = {
  currentView: 'home',
};

let currentState: AgentNavigationState = initialState;
let cachedSnapshot: AgentNavigationState = { ...initialState };

type NavigationStateListener = () => void;
const listeners = new Set<NavigationStateListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Navigation state listener error:', error);
    }
  });
};

const setState = (updater: (prev: AgentNavigationState) => AgentNavigationState) => {
  const next = updater(currentState);
  currentState = next;
  cachedSnapshot = { ...next };
  notifyListeners();
};

const subscribe = (listener: NavigationStateListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = (): AgentNavigationState => cachedSnapshot;

// Actions
export const agentNavigationActions = {
  setView: (view: AgentView) => {
    setState((state) => ({
      ...state,
      currentView: view,
    }));
  },
};

// React hooks
export function useAgentNavigationState(): AgentNavigationState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useAgentNavigationActions() {
  return agentNavigationActions;
}
