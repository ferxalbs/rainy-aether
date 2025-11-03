import { useSyncExternalStore } from 'react';

export type LoadingStageStatus = 'pending' | 'loading' | 'completed' | 'error';

export interface LoadingStage {
  id: string;
  label: string;
  status: LoadingStageStatus;
  error?: string;
}

interface LoadingState {
  isLoading: boolean;
  stages: LoadingStage[];
  currentStageId: string | null;
  loadingContext: 'global' | 'workspace' | null;
}

// Global app initialization stages (runs at startup)
const globalStages: LoadingStage[] = [
  { id: 'theme', label: 'Loading theme', status: 'pending' },
  { id: 'settings', label: 'Loading settings', status: 'pending' },
  { id: 'extensions', label: 'Loading extensions', status: 'pending' },
  { id: 'terminal', label: 'Initializing terminal system', status: 'pending' },
  { id: 'resources', label: 'Provisioning resources', status: 'pending' },
];

// Workspace initialization stages (runs when opening a project)
const workspaceStages: LoadingStage[] = [
  { id: 'workspace', label: 'Provisioning workspace', status: 'pending' },
  { id: 'monaco', label: 'Initializing editor', status: 'pending' },
];

let state: LoadingState = {
  isLoading: true,
  stages: [...globalStages],
  currentStageId: null,
  loadingContext: 'global',
};

let cachedSnapshot: LoadingState = { ...state };

const listeners = new Set<() => void>();
let loadingTimeoutId: number | null = null;

// Safety timeout to prevent infinite loading (30 seconds)
const LOADING_TIMEOUT_MS = 30000;

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function updateState(updates: Partial<LoadingState>) {
  state = { 
    ...state, 
    ...updates,
    stages: updates.stages || state.stages
  };
  cachedSnapshot = state;
  notifyListeners();
  
  // Clear existing timeout
  if (loadingTimeoutId !== null) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }
  
  // Set timeout if loading is active
  if (state.isLoading) {
    loadingTimeoutId = window.setTimeout(() => {
      console.warn('Loading timeout reached, forcing finish');
      loadingActions.finishLoading();
    }, LOADING_TIMEOUT_MS);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): LoadingState {
  return cachedSnapshot;
}

// Actions
export const loadingActions = {
  startStage(stageId: string) {
    const stages = state.stages.map(stage =>
      stage.id === stageId
        ? { ...stage, status: 'loading' as const }
        : stage
    );
    updateState({ stages, currentStageId: stageId });
  },

  completeStage(stageId: string) {
    const stages = state.stages.map(stage =>
      stage.id === stageId
        ? { ...stage, status: 'completed' as const }
        : stage
    );

    // Check if all stages are completed
    const allCompleted = stages.every(s => s.status === 'completed');

    updateState({
      stages,
      currentStageId: null,
      isLoading: !allCompleted
    });
  },

  errorStage(stageId: string, error: string) {
    const stages = state.stages.map(stage =>
      stage.id === stageId
        ? { ...stage, status: 'error' as const, error }
        : stage
    );
    updateState({ stages, currentStageId: null });
  },

  // Switch to workspace loading context
  startWorkspaceLoading() {
    updateState({
      isLoading: true,
      stages: workspaceStages.map(s => ({ ...s, status: 'pending' as const })),
      currentStageId: null,
      loadingContext: 'workspace'
    });
  },

  // Reset to global loading context
  resetToGlobal() {
    updateState({
      isLoading: true,
      stages: globalStages.map(s => ({ ...s, status: 'pending' as const })),
      currentStageId: null,
      loadingContext: 'global'
    });
  },

  finishLoading() {
    // Clear timeout
    if (loadingTimeoutId !== null) {
      clearTimeout(loadingTimeoutId);
      loadingTimeoutId = null;
    }
    
    // Mark all stages as completed before finishing
    const stages = state.stages.map(stage => ({
      ...stage,
      status: stage.status === 'error' ? 'error' as const : 'completed' as const
    }));
    updateState({ 
      isLoading: false, 
      loadingContext: null,
      stages,
      currentStageId: null
    });
  },

  addStage(stage: LoadingStage) {
    const stages = [...state.stages, stage];
    updateState({ stages });
  },

  removeStage(stageId: string) {
    const stages = state.stages.filter(s => s.id !== stageId);
    updateState({ stages });
  }
};

// Hook
export function useLoadingState() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function getLoadingState() {
  return state;
}
