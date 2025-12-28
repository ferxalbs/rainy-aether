/**
 * Autocompletion Store
 * 
 * State management for AI-powered inline autocompletions.
 * Uses external store pattern for React integration with useSyncExternalStore.
 */

import { useSyncExternalStore } from 'react';
import { saveToStore, loadFromStore } from './app-store';
import {
    AutocompletionState,
    AutocompletionConfig,
    DEFAULT_AUTOCOMPLETION_CONFIG,
} from '@/services/autocompletion/types';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'autocompletion_settings';

// ============================================================================
// Initial State
// ============================================================================

const initialState: AutocompletionState = {
    enabled: true,
    isLoading: false,
    lastTriggerTime: 0,
    stats: {
        accepted: 0,
        dismissed: 0,
        generated: 0,
    },
    config: DEFAULT_AUTOCOMPLETION_CONFIG,
};

// ============================================================================
// State Management
// ============================================================================

let state: AutocompletionState = { ...initialState };
let cachedSnapshot: AutocompletionState = { ...state };
const listeners = new Set<() => void>();

function notify(): void {
    cachedSnapshot = { ...state };
    listeners.forEach((listener) => listener());
}

function setState(updater: (prev: AutocompletionState) => AutocompletionState): void {
    state = updater(state);
    notify();
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot(): AutocompletionState {
    return cachedSnapshot;
}

// ============================================================================
// Saved Settings Type
// ============================================================================

interface SavedSettings {
    enabled?: boolean;
    config?: Partial<AutocompletionConfig>;
}

// ============================================================================
// Actions
// ============================================================================

export const autocompletionActions = {
    /**
     * Initialize store from persisted settings
     */
    async initialize(): Promise<void> {
        try {
            const saved = await loadFromStore<SavedSettings>(STORAGE_KEY, {});
            if (saved && typeof saved === 'object') {
                setState((prev) => ({
                    ...prev,
                    enabled: saved.enabled ?? prev.enabled,
                    config: { ...prev.config, ...(saved.config || {}) },
                }));
                console.log('[AutocompletionStore] Initialized from storage');
            }
        } catch (error) {
            console.warn('[AutocompletionStore] Failed to load settings:', error);
        }
    },

    /**
     * Enable or disable autocompletion
     */
    setEnabled(enabled: boolean): void {
        setState((prev) => ({ ...prev, enabled }));
        this.persistSettings();
    },

    /**
     * Set loading state
     */
    setLoading(isLoading: boolean): void {
        setState((prev) => ({ ...prev, isLoading }));
    },

    /**
     * Update configuration
     */
    updateConfig(config: Partial<AutocompletionConfig>): void {
        setState((prev) => ({
            ...prev,
            config: { ...prev.config, ...config },
        }));
        this.persistSettings();
    },

    /**
     * Record an accepted completion
     */
    recordAccepted(): void {
        setState((prev) => ({
            ...prev,
            stats: { ...prev.stats, accepted: prev.stats.accepted + 1 },
        }));
    },

    /**
     * Record a dismissed completion
     */
    recordDismissed(): void {
        setState((prev) => ({
            ...prev,
            stats: { ...prev.stats, dismissed: prev.stats.dismissed + 1 },
        }));
    },

    /**
     * Record a generated completion
     */
    recordGenerated(): void {
        setState((prev) => ({
            ...prev,
            stats: { ...prev.stats, generated: prev.stats.generated + 1 },
            lastTriggerTime: Date.now(),
        }));
    },

    /**
     * Reset statistics
     */
    resetStats(): void {
        setState((prev) => ({
            ...prev,
            stats: { accepted: 0, dismissed: 0, generated: 0 },
        }));
    },

    /**
     * Persist settings to storage
     */
    async persistSettings(): Promise<void> {
        try {
            const toSave: SavedSettings = {
                enabled: state.enabled,
                config: state.config,
            };
            await saveToStore(STORAGE_KEY, toSave);
        } catch (error) {
            console.warn('[AutocompletionStore] Failed to save settings:', error);
        }
    },

    /**
     * Get current state (non-React)
     */
    getState(): AutocompletionState {
        return state;
    },
};

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to access autocompletion state
 */
export function useAutocompletionState(): AutocompletionState {
    return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Hook to check if autocompletion is enabled
 */
export function useAutocompletionEnabled(): boolean {
    const state = useAutocompletionState();
    return state.enabled;
}

/**
 * Hook to check loading state
 */
export function useAutocompletionLoading(): boolean {
    const state = useAutocompletionState();
    return state.isLoading;
}

/**
 * Hook to get autocompletion config
 */
export function useAutocompletionConfig(): AutocompletionConfig {
    const state = useAutocompletionState();
    return state.config;
}

/**
 * Hook to get autocompletion stats
 */
export function useAutocompletionStats(): AutocompletionState['stats'] {
    const state = useAutocompletionState();
    return state.stats;
}

// ============================================================================
// Non-React Accessors
// ============================================================================

/**
 * Get current state (for non-React usage)
 */
export function getAutocompletionState(): AutocompletionState {
    return state;
}

/**
 * Check if autocompletion is enabled (non-React)
 */
export function isAutocompletionEnabled(): boolean {
    return state.enabled;
}
