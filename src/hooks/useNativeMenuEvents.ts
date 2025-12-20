/**
 * Hook to listen for native macOS menu events
 * On macOS with Tauri, menu items emit events that this hook captures
 * and dispatches to the appropriate action handlers
 */

import { useEffect, useRef, useState } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';

export interface MenuEventHandlers {
    // File menu
    'file:open-project'?: () => void;
    'file:quick-open'?: () => void;
    'file:close-project'?: () => void;
    'file:new-file'?: () => void;
    'file:new-file-in-project'?: () => void;
    'file:new-folder'?: () => void;
    'file:close-editor'?: () => void;
    'file:close-all'?: () => void;
    'file:save'?: () => void;
    'file:save-as'?: () => void;
    'file:save-all'?: () => void;
    'file:reveal-file'?: () => void;
    'file:reveal-workspace'?: () => void;
    'file:toggle-autosave'?: () => void;

    // Edit menu
    'edit:undo'?: () => void;
    'edit:redo'?: () => void;
    'edit:copy-line-up'?: () => void;
    'edit:copy-line-down'?: () => void;
    'edit:move-line-up'?: () => void;
    'edit:move-line-down'?: () => void;
    'edit:find'?: () => void;
    'edit:find-next'?: () => void;
    'edit:find-previous'?: () => void;
    'edit:replace'?: () => void;
    'edit:go-to-line'?: () => void;
    'edit:indent'?: () => void;
    'edit:outdent'?: () => void;
    'edit:comment-line'?: () => void;
    'edit:block-comment'?: () => void;
    'edit:toggle-wrap'?: () => void;

    // View menu
    'view:command-palette'?: () => void;
    'view:quick-open'?: () => void;
    'view:toggle-sidebar'?: () => void;
    'view:toggle-zen-mode'?: () => void;
    'view:toggle-fullscreen'?: () => void;
    'view:toggle-minimap'?: () => void;
    'view:toggle-breadcrumbs'?: () => void;
    'view:explorer'?: () => void;
    'view:search'?: () => void;
    'view:git'?: () => void;
    'view:extensions'?: () => void;
    'view:terminal'?: () => void;
    'view:problems'?: () => void;
    'view:output'?: () => void;
    'view:color-theme'?: () => void;
    'view:toggle-theme'?: () => void;

    // Selection menu
    'selection:select-all'?: () => void;
    'selection:expand'?: () => void;
    'selection:shrink'?: () => void;
    'selection:copy-line-up'?: () => void;
    'selection:copy-line-down'?: () => void;
    'selection:move-line-up'?: () => void;
    'selection:move-line-down'?: () => void;
    'selection:add-cursor-above'?: () => void;
    'selection:add-cursor-below'?: () => void;
    'selection:add-next-occurrence'?: () => void;
    'selection:select-all-occurrences'?: () => void;
    'selection:select-line'?: () => void;
    'selection:delete-line'?: () => void;

    // Go menu
    'go:definition'?: () => void;
    'go:type-definition'?: () => void;
    'go:references'?: () => void;
    'go:line'?: () => void;
    'go:symbol'?: () => void;
    'go:file'?: () => void;
    'go:next-editor'?: () => void;
    'go:prev-editor'?: () => void;
    'go:back'?: () => void;
    'go:forward'?: () => void;

    // Git menu
    'git:clone'?: () => void;
    'git:refresh'?: () => void;
    'git:open-source-control'?: () => void;

    // Extensions menu
    'extensions:marketplace'?: () => void;
    'extensions:manage'?: () => void;

    // Terminal menu
    'terminal:new'?: () => void;
    'terminal:kill'?: () => void;
    'terminal:toggle'?: () => void;
    'terminal:toggle-search'?: () => void;
    'terminal:external'?: () => void;

    // Window menu
    'window:new'?: () => void;
    'window:toggle-fullscreen'?: () => void;
    'window:center'?: () => void;
    'window:reload'?: () => void;

    // Help menu
    'help:commands'?: () => void;
    'help:getting-started'?: () => void;
    'help:documentation'?: () => void;
    'help:release-notes'?: () => void;
    'help:keyboard-shortcuts'?: () => void;
    'help:report-issue'?: () => void;
    'help:github'?: () => void;
    'help:website'?: () => void;
    'help:about'?: () => void;

    // App menu (macOS)
    'app:settings'?: () => void;

    // Allow additional handlers
    [key: string]: (() => void) | undefined;
}

/**
 * Robust Tauri environment detection using official API
 * We use the isTauri function from @tauri-apps/api/core in Tauri v2
 */
function isTauriEnv(): boolean {
    try {
        // Use the official isTauri function from Tauri v2
        return isTauri();
    } catch {
        // Fallback to manual checking
        try {
            if (typeof window === 'undefined') return false;
            const w = window as unknown as Record<string, unknown>;
            const byGlobal = Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__ || w.__TAURI_METADATA__);
            const byUA = typeof navigator !== 'undefined' && /\bTauri\b/i.test(navigator.userAgent || '');
            return byGlobal || byUA;
        } catch {
            return false;
        }
    }
}

/**
 * Detect if running on macOS
 */
function isMacOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    // Check navigator.platform (deprecated but widely supported)
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) return true;
    // Check userAgentData (modern API)
    if ((navigator as any).userAgentData?.platform === 'macOS') return true;
    // Check userAgent as fallback
    if (/Macintosh|Mac OS X/i.test(navigator.userAgent || '')) return true;
    return false;
}

/**
 * Hook to listen for native menu events from macOS
 * @param handlers Object mapping menu action IDs to handler functions
 */
export function useNativeMenuEvents(handlers: MenuEventHandlers): void {
    const handlersRef = useRef(handlers);

    // Keep handlers ref updated
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        // Only set up listener in Tauri environment
        if (!isTauriEnv()) {
            console.debug('[NativeMenu] Not in Tauri environment, skipping menu event listener');
            return;
        }

        let unlisten: UnlistenFn | null = null;
        let cancelled = false;

        const setupListener = async () => {
            try {
                console.log('[NativeMenu] Setting up menu-action event listener...');
                unlisten = await listen<string>('menu-action', (event) => {
                    const actionId = event.payload;
                    console.log('[NativeMenu] Received menu action:', actionId);

                    const handler = handlersRef.current[actionId];

                    if (handler) {
                        console.log('[NativeMenu] Executing handler for:', actionId);
                        try {
                            handler();
                        } catch (error) {
                            console.error('[NativeMenu] Handler error for', actionId, ':', error);
                        }
                    } else {
                        console.warn(`[NativeMenu] No handler found for action: ${actionId}`);
                    }
                });

                if (!cancelled) {
                    console.log('[NativeMenu] ✓ Menu event listener registered successfully');
                }
            } catch (error) {
                console.error('[NativeMenu] Failed to set up menu event listener:', error);
            }
        };

        setupListener();

        return () => {
            cancelled = true;
            if (unlisten) {
                unlisten();
                console.log('[NativeMenu] Menu event listener cleanup complete');
            }
        };
    }, []);
}

/**
 * Check if we should use native menu (macOS + Tauri)
 * Uses proper React state to ensure consistent rendering
 */
export function useNativeMenu(): boolean {
    // Calculate once at mount time to avoid hydration issues
    const [useNative] = useState(() => {
        const isMac = isMacOS();
        const isTauri = isTauriEnv();
        const result = isMac && isTauri;

        console.log('[NativeMenu] Platform detection:', { isMac, isTauri, useNative: result });

        return result;
    });

    return useNative;
}
