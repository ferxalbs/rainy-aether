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
}

// Initial loading stages
const initialStages: LoadingStage[] = [
  { id: 'theme', label: 'Loading theme', status: 'pending' },
  { id: 'settings', label: 'Loading settings', status: 'pending' },
  { id: 'extensions', label: 'Loading extensions', status: 'pending' },
  { id: 'workspace', label: 'Provisioning workspace', status: 'pending' },
  { id: 'monaco', label: 'Initializing editor', status: 'pending' },
  { id: 'resources', label: 'Provisioning resources', status: 'pending' },
];

let state: LoadingState = {
  isLoading: true,
  stages: [...initialStages],
  currentStageId: null,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function updateState(updates: Partial<LoadingState>) {
  state = { ...state, ...updates };
  notifyListeners();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): LoadingState {
  return state;
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

  reset() {
    updateState({
      isLoading: true,
      stages: initialStages.map(s => ({ ...s, status: 'pending' as const })),
      currentStageId: null,
    });
  },

  finishLoading() {
    updateState({ isLoading: false });
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
