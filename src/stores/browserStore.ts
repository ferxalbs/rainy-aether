/**
 * Browser Store
 *
 * State management for integrated browser preview windows.
 * Tracks browser instances, navigation state, and loading status.
 * 
 * Uses the same pattern as panelStore (useSyncExternalStore) for consistency.
 */

import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/** Browser instance state (mirrors Rust BrowserState) */
export interface BrowserInstance {
    id: string;
    url: string;
    title: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
}

/** Browser store state */
interface BrowserState {
    instances: Map<string, BrowserInstance>;
    activeInstanceId: string | null;
    defaultUrl: string;
    isInitialized: boolean;
}

// Initial state
const initialState: BrowserState = {
    instances: new Map(),
    activeInstanceId: null,
    defaultUrl: 'http://localhost:3000',
    isInitialized: false,
};

// State management
let currentState: BrowserState = { ...initialState };
const listeners = new Set<() => void>();

const notifyListeners = () => {
    listeners.forEach((listener) => {
        try {
            listener();
        } catch (error) {
            console.error('[browserStore] Listener error:', error);
        }
    });
};

const setState = (updater: (prev: BrowserState) => BrowserState) => {
    currentState = updater(currentState);
    notifyListeners();
    return currentState;
};

const getState = (): BrowserState => currentState;

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/** Convert snake_case Rust response to camelCase */
function convertInstance(raw: {
    id: string;
    url: string;
    title: string;
    is_loading: boolean;
    can_go_back: boolean;
    can_go_forward: boolean;
}): BrowserInstance {
    return {
        id: raw.id,
        url: raw.url,
        title: raw.title,
        isLoading: raw.is_loading,
        canGoBack: raw.can_go_back,
        canGoForward: raw.can_go_forward,
    };
}

// Actions

/** Open a new browser preview window */
async function openBrowser(url?: string, id?: string): Promise<BrowserInstance> {
    const targetUrl = url || currentState.defaultUrl;

    try {
        const rawInstance = await invoke<{
            id: string;
            url: string;
            title: string;
            is_loading: boolean;
            can_go_back: boolean;
            can_go_forward: boolean;
        }>('browser_open_preview', {
            url: targetUrl,
            windowId: id || null,
        });

        const instance = convertInstance(rawInstance);

        setState((state) => ({
            ...state,
            instances: new Map(state.instances).set(instance.id, instance),
            activeInstanceId: instance.id,
        }));

        return instance;
    } catch (error) {
        console.error('[browserStore] Failed to open browser:', error);
        throw error;
    }
}

/** Close a browser window */
async function closeBrowser(id: string): Promise<void> {
    try {
        await invoke('browser_close', { windowId: id });

        setState((state) => {
            const instances = new Map(state.instances);
            instances.delete(id);

            return {
                ...state,
                instances,
                activeInstanceId:
                    state.activeInstanceId === id
                        ? instances.size > 0
                            ? instances.keys().next().value ?? null
                            : null
                        : state.activeInstanceId,
            };
        });
    } catch (error) {
        console.error('[browserStore] Failed to close browser:', error);
        throw error;
    }
}

/** Set the active browser instance */
function setActiveInstance(id: string | null): void {
    setState((state) => ({
        ...state,
        activeInstanceId: id,
    }));
}

/** Navigate to a URL */
async function navigate(id: string, url: string): Promise<void> {
    try {
        const rawInstance = await invoke<{
            id: string;
            url: string;
            title: string;
            is_loading: boolean;
            can_go_back: boolean;
            can_go_forward: boolean;
        }>('browser_navigate', {
            windowId: id,
            url,
        });

        const instance = convertInstance(rawInstance);

        setState((state) => ({
            ...state,
            instances: new Map(state.instances).set(id, instance),
        }));
    } catch (error) {
        console.error('[browserStore] Navigation failed:', error);
        throw error;
    }
}

/** Go back in history */
async function goBack(id: string): Promise<void> {
    try {
        const rawInstance = await invoke<{
            id: string;
            url: string;
            title: string;
            is_loading: boolean;
            can_go_back: boolean;
            can_go_forward: boolean;
        }>('browser_back', { windowId: id });

        const instance = convertInstance(rawInstance);

        setState((state) => ({
            ...state,
            instances: new Map(state.instances).set(id, instance),
        }));
    } catch (error) {
        console.error('[browserStore] Go back failed:', error);
    }
}

/** Go forward in history */
async function goForward(id: string): Promise<void> {
    try {
        const rawInstance = await invoke<{
            id: string;
            url: string;
            title: string;
            is_loading: boolean;
            can_go_back: boolean;
            can_go_forward: boolean;
        }>('browser_forward', { windowId: id });

        const instance = convertInstance(rawInstance);

        setState((state) => ({
            ...state,
            instances: new Map(state.instances).set(id, instance),
        }));
    } catch (error) {
        console.error('[browserStore] Go forward failed:', error);
    }
}

/** Reload the current page */
async function reload(id: string): Promise<void> {
    try {
        await invoke('browser_reload', { windowId: id });

        // Mark as loading
        setState((state) => {
            const instances = new Map(state.instances);
            const instance = instances.get(id);
            if (instance) {
                instances.set(id, { ...instance, isLoading: true });
            }
            return { ...state, instances };
        });
    } catch (error) {
        console.error('[browserStore] Reload failed:', error);
    }
}

/** Update instance state (from events) */
function updateInstance(instance: BrowserInstance): void {
    setState((state) => ({
        ...state,
        instances: new Map(state.instances).set(instance.id, instance),
    }));
}

/** Remove instance (from events) */
function removeInstance(id: string): void {
    setState((state) => {
        const instances = new Map(state.instances);
        instances.delete(id);
        return {
            ...state,
            instances,
            activeInstanceId: state.activeInstanceId === id ? null : state.activeInstanceId,
        };
    });
}

/** Initialize event listeners */
async function initialize(): Promise<void> {
    if (currentState.isInitialized) return;

    // Listen for browser events from Rust
    listen<{
        id: string;
        url: string;
        title: string;
        is_loading: boolean;
        can_go_back: boolean;
        can_go_forward: boolean;
    }>('browser:opened', (event) => {
        const instance = convertInstance(event.payload);
        updateInstance(instance);
    });

    listen<{
        id: string;
        url: string;
        title: string;
        is_loading: boolean;
        can_go_back: boolean;
        can_go_forward: boolean;
    }>('browser:navigated', (event) => {
        const instance = convertInstance(event.payload);
        updateInstance(instance);
    });

    listen<string>('browser:closed', (event) => {
        removeInstance(event.payload);
    });

    listen<string>('browser:loading', (event) => {
        const id = event.payload;
        setState((state) => {
            const instances = new Map(state.instances);
            const instance = instances.get(id);
            if (instance) {
                instances.set(id, { ...instance, isLoading: true });
            }
            return { ...state, instances };
        });
    });

    listen<string>('browser:loaded', (event) => {
        const id = event.payload;
        setState((state) => {
            const instances = new Map(state.instances);
            const instance = instances.get(id);
            if (instance) {
                instances.set(id, { ...instance, isLoading: false });
            }
            return { ...state, instances };
        });
    });

    // Load existing instances
    try {
        const rawInstances = await invoke<Array<{
            id: string;
            url: string;
            title: string;
            is_loading: boolean;
            can_go_back: boolean;
            can_go_forward: boolean;
        }>>('browser_list_instances');

        const instances = new Map<string, BrowserInstance>();
        for (const raw of rawInstances) {
            const instance = convertInstance(raw);
            instances.set(instance.id, instance);
        }

        setState((state) => ({
            ...state,
            instances,
            isInitialized: true,
        }));
    } catch (error) {
        console.warn('[browserStore] Failed to load existing instances:', error);
        setState((state) => ({ ...state, isInitialized: true }));
    }
}

// Export actions
export const browserActions = {
    openBrowser,
    closeBrowser,
    setActiveInstance,
    navigate,
    goBack,
    goForward,
    reload,
    initialize,
    getState,
};

// React hook for browser state
export function useBrowserState(): BrowserState {
    return useSyncExternalStore(subscribe, getState, getState);
}

// Get active instance
export function useActiveInstance(): BrowserInstance | null {
    const state = useBrowserState();
    return state.activeInstanceId ? state.instances.get(state.activeInstanceId) ?? null : null;
}

// Get all instances as array
export function useBrowserInstances(): BrowserInstance[] {
    const state = useBrowserState();
    return Array.from(state.instances.values());
}

// Convenience export
export const useBrowserStore = {
    getState,
    subscribe,
};
