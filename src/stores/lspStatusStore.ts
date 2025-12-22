/**
 * LSP Status Store
 * Tracks the status of language servers for UI display
 * Uses useSyncExternalStore pattern (same as notificationStore)
 */

import { useSyncExternalStore } from 'react';

/**
 * LSP Server Status
 */
export type LSPServerStatus = 'stopped' | 'starting' | 'running' | 'error' | 'unavailable';

/**
 * LSP Server Info
 */
export interface LSPServerInfo {
    serverId: string;
    name: string;
    status: LSPServerStatus;
    languages: string[];
    error?: string;
    lastUpdated: number;
}

/**
 * LSP Status State
 */
interface LSPStatusState {
    servers: Map<string, LSPServerInfo>;
    activeLanguage: string | null;
}

let state: LSPStatusState = {
    servers: new Map(),
    activeLanguage: null,
};

const listeners = new Set<() => void>();

function notifyListeners(): void {
    listeners.forEach((listener) => listener());
}

/**
 * LSP Status Actions
 */
export const lspStatusActions = {
    /**
     * Set server status
     */
    setServerStatus(serverId: string, status: LSPServerStatus, error?: string): void {
        const server = state.servers.get(serverId);
        if (server) {
            const newServers = new Map(state.servers);
            newServers.set(serverId, {
                ...server,
                status,
                error: error || undefined,
                lastUpdated: Date.now(),
            });
            state = { ...state, servers: newServers };
            notifyListeners();
        }
    },

    /**
     * Register a server
     */
    registerServer(serverId: string, name: string, languages: string[]): void {
        const newServers = new Map(state.servers);
        newServers.set(serverId, {
            serverId,
            name,
            status: 'stopped',
            languages,
            lastUpdated: Date.now(),
        });
        state = { ...state, servers: newServers };
        notifyListeners();
    },

    /**
     * Unregister a server
     */
    unregisterServer(serverId: string): void {
        const newServers = new Map(state.servers);
        newServers.delete(serverId);
        state = { ...state, servers: newServers };
        notifyListeners();
    },

    /**
     * Set active language
     */
    setActiveLanguage(language: string | null): void {
        state = { ...state, activeLanguage: language };
        notifyListeners();
    },

    /**
     * Get server for language
     */
    getServerForLanguage(language: string): LSPServerInfo | null {
        for (const server of state.servers.values()) {
            if (server.languages.includes(language)) {
                return server;
            }
        }
        return null;
    },

    /**
     * Get active server status
     */
    getActiveServerStatus(): LSPServerInfo | null {
        if (!state.activeLanguage) return null;
        return lspStatusActions.getServerForLanguage(state.activeLanguage);
    },

    /**
     * Get all servers
     */
    getAllServers(): LSPServerInfo[] {
        return Array.from(state.servers.values());
    },

    /**
     * Clear all
     */
    clearAll(): void {
        state = { servers: new Map(), activeLanguage: null };
        notifyListeners();
    },
};

/**
 * React hook to use LSP status store
 */
export function useLSPStatusStore(): LSPStatusState {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => state
    );
}

/**
 * Get LSP status display info for status bar
 */
export function getLSPStatusDisplay(server: LSPServerInfo | null): {
    icon: 'check' | 'loading' | 'error' | 'off';
    label: string;
    tooltip: string;
} {
    if (!server) {
        return {
            icon: 'off',
            label: '',
            tooltip: 'No language server for this file type',
        };
    }

    switch (server.status) {
        case 'running':
            return {
                icon: 'check',
                label: server.name,
                tooltip: `${server.name} is running`,
            };
        case 'starting':
            return {
                icon: 'loading',
                label: server.name,
                tooltip: `${server.name} is starting...`,
            };
        case 'error':
            return {
                icon: 'error',
                label: server.name,
                tooltip: server.error || `${server.name} encountered an error`,
            };
        case 'unavailable':
            return {
                icon: 'off',
                label: server.name,
                tooltip: `${server.name} is not installed`,
            };
        case 'stopped':
        default:
            return {
                icon: 'off',
                label: server.name,
                tooltip: `${server.name} is stopped`,
            };
    }
}

/**
 * Monaco built-in language services (always available)
 */
export const MONACO_BUILTIN_LANGUAGES = [
    'typescript',
    'javascript',
    'typescriptreact',
    'javascriptreact',
    'json',
    'html',
    'css',
    'scss',
    'less',
];

/**
 * Check if a language has Monaco built-in support
 */
export function hasMonacoBuiltinSupport(language: string): boolean {
    return MONACO_BUILTIN_LANGUAGES.includes(language);
}
