/**
 * Hook to listen for native macOS menu events
 * On macOS with Tauri, menu items emit events that this hook captures
 * and dispatches to the appropriate action handlers
 */

import { useEffect, useRef } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

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
        // Only listen in Tauri environment
        const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
        if (!isTauri) return;

        let unlisten: UnlistenFn | null = null;

        const setupListener = async () => {
            try {
                unlisten = await listen<string>('menu-action', (event) => {
                    const actionId = event.payload;
                    const handler = handlersRef.current[actionId];

                    if (handler) {
                        handler();
                    } else {
                        console.debug(`[NativeMenu] Unhandled menu action: ${actionId}`);
                    }
                });
            } catch (error) {
                console.warn('[NativeMenu] Failed to set up menu event listener:', error);
            }
        };

        setupListener();

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, []);
}

/**
 * Check if we should use native menu (macOS + Tauri)
 */
export function useNativeMenu(): boolean {
    const isMac = typeof navigator !== 'undefined' &&
        navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

    return isMac && isTauri;
}
