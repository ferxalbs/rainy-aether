/**
 * Inline Diff Store
 *
 * Manages inline diff state for AI-powered code editing directly in the Monaco editor.
 * Provides real-time streaming of changes with visual green/red diff highlighting.
 */

import { useSyncExternalStore, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { editorActions } from './editorStore';
import { ideActions } from './ideStore';

// ============================================================================
// Types
// ============================================================================

/**
 * A single inline diff change
 */
export interface InlineDiffChange {
    /** Unique ID for this change */
    id: string;
    /** Type of change */
    type: 'insert' | 'delete' | 'replace';
    /** Range in the document */
    range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    /** New text (for insert/replace) */
    newText: string;
    /** Original text (for delete/replace) */
    oldText: string;
    /** Whether this change has been applied */
    applied: boolean;
}

/**
 * An inline diff session
 */
export interface InlineDiffSession {
    /** Session ID */
    id: string;
    /** File URI being edited */
    fileUri: string;
    /** Agent that initiated this session */
    agentId: string;
    /** Agent display name */
    agentName: string;
    /** Original file content before changes */
    originalContent: string;
    /** Description of the changes */
    description?: string;
    /** Session start time */
    startTime: number;
}

/**
 * Inline diff state
 */
export interface InlineDiffState {
    /** Active inline diff session */
    activeSession: InlineDiffSession | null;
    /** Pending changes waiting for user acceptance */
    pendingChanges: InlineDiffChange[];
    /** Whether streaming is in progress */
    isStreaming: boolean;
    /** Monaco decoration IDs */
    decorationIds: string[];
    /** Statistics */
    stats: {
        additions: number;
        deletions: number;
    };
}

// ============================================================================
// Internal State
// ============================================================================

let state: InlineDiffState = {
    activeSession: null,
    pendingChanges: [],
    isStreaming: false,
    decorationIds: [],
    stats: { additions: 0, deletions: 0 },
};

let cachedSnapshot: InlineDiffState = { ...state };
const listeners = new Set<() => void>();

// Microtask batching for listener notifications
let notifyScheduled = false;

function notifyListeners() {
    // Batch multiple rapid state updates into single notification via microtask
    if (notifyScheduled) return;
    notifyScheduled = true;

    queueMicrotask(() => {
        notifyScheduled = false;
        listeners.forEach(listener => {
            try {
                listener();
            } catch (e) {
                console.error('[inlineDiffStore] Listener error:', e);
            }
        });
    });
}

function setState(updater: (prev: InlineDiffState) => InlineDiffState) {
    state = updater(state);
    cachedSnapshot = {
        ...state,
        pendingChanges: [...state.pendingChanges],
        decorationIds: [...state.decorationIds],
        stats: { ...state.stats },
    };
    notifyListeners();
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot(): InlineDiffState {
    return cachedSnapshot;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Start a new inline diff session
 */
function startInlineDiff(options: {
    fileUri: string;
    agentId: string;
    agentName: string;
    originalContent: string;
    description?: string;
}): string {
    const sessionId = `inline-diff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: InlineDiffSession = {
        id: sessionId,
        fileUri: options.fileUri,
        agentId: options.agentId,
        agentName: options.agentName,
        originalContent: options.originalContent,
        description: options.description,
        startTime: Date.now(),
    };

    setState(prev => ({
        ...prev,
        activeSession: session,
        pendingChanges: [],
        isStreaming: true,
        decorationIds: [],
        stats: { additions: 0, deletions: 0 },
    }));

    console.log(`[inlineDiffStore] Started session ${sessionId} for ${options.fileUri}`);
    return sessionId;
}

/**
 * Stream a change to the current session
 */
function streamChange(change: Omit<InlineDiffChange, 'id' | 'applied'>): void {
    if (!state.activeSession) {
        console.warn('[inlineDiffStore] No active session for streaming change');
        return;
    }

    const changeId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fullChange: InlineDiffChange = {
        ...change,
        id: changeId,
        applied: false,
    };

    setState(prev => {
        const newStats = { ...prev.stats };
        if (change.type === 'insert') {
            newStats.additions += change.newText.split('\n').length;
        } else if (change.type === 'delete') {
            newStats.deletions += change.oldText.split('\n').length;
        } else if (change.type === 'replace') {
            newStats.additions += change.newText.split('\n').length;
            newStats.deletions += change.oldText.split('\n').length;
        }

        return {
            ...prev,
            pendingChanges: [...prev.pendingChanges, fullChange],
            stats: newStats,
        };
    });
}

/**
 * Stream multiple changes at once (BATCHED - single state update)
 * Use this for performance when applying many changes at once.
 * Reduces N state updates to just 1, preventing UI freezes on large diffs.
 */
function streamChangesBatch(changes: Omit<InlineDiffChange, 'id' | 'applied'>[]): void {
    if (!state.activeSession || changes.length === 0) {
        console.warn('[inlineDiffStore] No active session for batched streaming or empty changes');
        return;
    }

    setState(prev => {
        const newStats = { ...prev.stats };
        const newChanges: InlineDiffChange[] = [];

        for (const change of changes) {
            const changeId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            newChanges.push({ ...change, id: changeId, applied: false });

            if (change.type === 'insert') {
                newStats.additions += change.newText.split('\n').length;
            } else if (change.type === 'delete') {
                newStats.deletions += change.oldText.split('\n').length;
            } else if (change.type === 'replace') {
                newStats.additions += change.newText.split('\n').length;
                newStats.deletions += change.oldText.split('\n').length;
            }
        }

        return {
            ...prev,
            pendingChanges: [...prev.pendingChanges, ...newChanges],
            stats: newStats,
        };
    });

    console.log(`[inlineDiffStore] Batched ${changes.length} changes in single update`);
}

/**
 * Finish streaming (AI has completed generating changes)
 */
function finishStreaming(): void {
    setState(prev => ({
        ...prev,
        isStreaming: false,
    }));
    console.log('[inlineDiffStore] Streaming finished');
}

/**
 * Accept all pending changes and apply them to the file
 */
async function acceptAllChanges(): Promise<void> {
    if (!state.activeSession) {
        console.warn('[inlineDiffStore] No active session to accept');
        return;
    }

    const session = state.activeSession;
    const changes = state.pendingChanges;

    try {
        // For a full file replacement, we use the newText from the first (and typically only) change
        let newContent: string;

        if (changes.length === 1 && changes[0].type === 'replace') {
            // Full file replacement
            newContent = changes[0].newText;
        } else {
            // Multiple granular changes - apply them to the editor model
            const editor = editorActions.getCurrentEditor();
            if (editor) {
                const model = editor.getModel();
                if (model) {
                    // Apply changes in reverse order (from bottom to top) to preserve line numbers
                    const sortedChanges = [...changes].sort((a, b) =>
                        b.range.startLine - a.range.startLine || b.range.startColumn - a.range.startColumn
                    );

                    // Use Monaco's edit operations to apply changes
                    const edits = sortedChanges.map(change => ({
                        range: {
                            startLineNumber: change.range.startLine,
                            startColumn: change.range.startColumn,
                            endLineNumber: change.range.endLine,
                            endColumn: change.range.endColumn,
                        },
                        text: change.type === 'delete' ? '' : change.newText,
                    }));

                    // Apply all edits at once
                    model.pushEditOperations([], edits, () => null);
                    newContent = model.getValue();
                } else {
                    throw new Error('No model available');
                }
            } else {
                throw new Error('No editor available');
            }
        }

        // Save the file
        await invoke('save_file_content', {
            path: session.fileUri,
            content: newContent,
        });

        // Update the editor with the new content
        const editor = editorActions.getCurrentEditor();
        if (editor) {
            const model = editor.getModel();
            if (model && model.getValue() !== newContent) {
                model.setValue(newContent);
            }
        }

        // Update IDE state
        const openFiles = ideActions.getState().openFiles;
        const openFile = openFiles.find(f => f.path === session.fileUri);
        if (openFile) {
            ideActions.updateFileContent(openFile.id, newContent);
        }

        console.log(`[inlineDiffStore] Accepted ${changes.length} changes for ${session.fileUri}`);
    } catch (error) {
        console.error('[inlineDiffStore] Error accepting changes:', error);
        throw error;
    } finally {
        // Clear the session
        clearSession();
    }
}

/**
 * Reject all pending changes and restore original content
 */
function rejectAllChanges(): void {
    if (!state.activeSession) {
        console.warn('[inlineDiffStore] No active session to reject');
        return;
    }

    const session = state.activeSession;

    try {
        // Restore original content
        const editor = editorActions.getCurrentEditor();
        if (editor) {
            const model = editor.getModel();
            if (model && model.getValue() !== session.originalContent) {
                model.setValue(session.originalContent);
            }
        }

        console.log(`[inlineDiffStore] Rejected changes for ${session.fileUri}`);
    } finally {
        // Clear the session
        clearSession();
    }
}

/**
 * Clear the current session
 */
function clearSession(): void {
    setState(() => ({
        activeSession: null,
        pendingChanges: [],
        isStreaming: false,
        decorationIds: [],
        stats: { additions: 0, deletions: 0 },
    }));
}

/**
 * Update decoration IDs (called by InlineDiffController)
 */
function setDecorationIds(ids: string[]): void {
    setState(prev => ({
        ...prev,
        decorationIds: ids,
    }));
}

/**
 * Check if there's an active inline diff session
 */
function isActive(): boolean {
    return state.activeSession !== null;
}

/**
 * Check if the active session is for a specific file
 */
function isActiveForFile(fileUri: string): boolean {
    return state.activeSession?.fileUri === fileUri;
}

/**
 * Get the current state (for non-React usage)
 */
function getState(): InlineDiffState {
    return state;
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Use inline diff state (full state - use sparingly, causes re-render on any change)
 */
export function useInlineDiffState(): InlineDiffState {
    return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Use inline diff with selector for granular subscriptions
 * Only re-renders when selected value changes
 */
export function useInlineDiffSelector<T>(
    selector: (state: InlineDiffState) => T,
    isEqual: (a: T, b: T) => boolean = Object.is
): T {
    const selectorRef = useRef(selector);
    const isEqualRef = useRef(isEqual);
    selectorRef.current = selector;
    isEqualRef.current = isEqual;

    const cachedValueRef = useRef<{ value: T } | null>(null);

    const getSnapshotWithSelector = useCallback(() => {
        const newValue = selectorRef.current(getSnapshot());
        if (cachedValueRef.current === null || !isEqualRef.current(cachedValueRef.current.value, newValue)) {
            cachedValueRef.current = { value: newValue };
        }
        return cachedValueRef.current.value;
    }, []);

    return useSyncExternalStore(subscribe, getSnapshotWithSelector);
}

/**
 * Use active session only (memoized)
 */
export function useActiveInlineDiffSession(): InlineDiffSession | null {
    return useInlineDiffSelector(
        state => state.activeSession,
        (a, b) => a?.id === b?.id
    );
}

/**
 * Use pending changes count only (doesn't re-render on change content, just count)
 */
export function usePendingChangesCount(): number {
    return useInlineDiffSelector(state => state.pendingChanges.length);
}

/**
 * Use streaming status only
 */
export function useIsStreaming(): boolean {
    return useInlineDiffSelector(state => state.isStreaming);
}

/**
 * Use stats only
 */
export function useInlineDiffStats(): { additions: number; deletions: number } {
    return useInlineDiffSelector(
        state => state.stats,
        (a, b) => a.additions === b.additions && a.deletions === b.deletions
    );
}

/**
 * Check if there's an active session for a specific file URI
 */
export function useIsInlineDiffActiveForFile(fileUri: string | undefined): boolean {
    return useInlineDiffSelector(
        state => {
            if (!fileUri || !state.activeSession) return false;
            const sessionUri = state.activeSession.fileUri.replace(/\\/g, '/');
            const targetUri = fileUri.replace(/\\/g, '/');
            return sessionUri === targetUri ||
                sessionUri.endsWith(`/${targetUri}`) ||
                targetUri.endsWith(`/${sessionUri.split('/').pop() || ''}`);
        }
    );
}

/**
 * Use pending changes (use sparingly - re-renders when any change is added)
 */
export function usePendingChanges(): InlineDiffChange[] {
    const state = useInlineDiffState();
    return state.pendingChanges;
}

// ============================================================================
// Exports
// ============================================================================

export const inlineDiffActions = {
    startInlineDiff,
    streamChange,
    streamChangesBatch,
    finishStreaming,
    acceptAllChanges,
    rejectAllChanges,
    clearSession,
    setDecorationIds,
    isActive,
    isActiveForFile,
    getState,
};

// Subscribe function for external listeners
export function subscribeToInlineDiff(listener: () => void): () => void {
    return subscribe(listener);
}
