/**
 * Diff Store
 *
 * Manages diff previews for chatbot extensions, including live streaming updates.
 * This is a killer feature that allows AI to show code changes in real-time.
 */

import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { editorActions } from './editorStore';
import { ideActions } from './ideStore';

/**
 * Diff change type
 */
export type DiffChangeType = 'insert' | 'delete' | 'replace';

/**
 * A single diff change
 */
export interface DiffChange {
  /** Type of change */
  type: DiffChangeType;

  /** Start line (0-based) */
  startLine: number;

  /** Start column (0-based) */
  startColumn: number;

  /** End line (0-based) */
  endLine: number;

  /** End column (0-based) */
  endColumn: number;

  /** New text to insert/replace */
  newText: string;

  /** Original text (for display purposes) */
  originalText?: string;
}

/**
 * File diff
 */
export interface FileDiff {
  /** File path */
  uri: string;

  /** Original content */
  originalContent: string;

  /** Modified content (may be partial during streaming) */
  modifiedContent: string;

  /** Individual changes (for granular diff) */
  changes: DiffChange[];

  /** Whether this diff is being streamed */
  isStreaming: boolean;

  /** Whether the diff has been accepted */
  isAccepted: boolean;

  /** Whether the diff has been rejected */
  isRejected: boolean;

  /** Timestamp when the diff was created */
  createdAt: number;

  /** Extension that created this diff */
  extensionId?: string;

  /** Metadata */
  metadata?: {
    description?: string;
    aiModel?: string;
    tokens?: number;
  };
}

/**
 * Diff set (multiple files)
 */
export interface DiffSet {
  /** Unique ID for this diff set */
  id: string;

  /** Title/description */
  title: string;

  /** File diffs */
  diffs: Map<string, FileDiff>;

  /** Currently active diff file */
  activeUri: string | null;

  /** Whether to show side-by-side or inline */
  viewMode: 'split' | 'inline';

  /** Whether all diffs have been accepted */
  allAccepted: boolean;

  /** Whether all diffs have been rejected */
  allRejected: boolean;
}

/**
 * Diff state
 */
export interface DiffState {
  /** Active diff sets */
  diffSets: Map<string, DiffSet>;

  /** Currently active diff set */
  activeDiffSetId: string | null;

  /** Diff panel visibility */
  isDiffPanelOpen: boolean;

  /** Diff panel position */
  panelPosition: 'bottom' | 'right';

  /** Panel size (percentage) */
  panelSize: number;
}

// Internal state
let state: DiffState = {
  diffSets: new Map(),
  activeDiffSetId: null,
  isDiffPanelOpen: false,
  panelPosition: 'right',
  panelSize: 50,
};

// Cached snapshot for React
let cachedSnapshot: DiffState = { ...state };

// Listeners for state changes
const listeners = new Set<() => void>();

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  listeners.forEach(listener => listener());
}

/**
 * Update state immutably
 */
function setState(updater: (prev: DiffState) => DiffState) {
  state = updater(state);
  cachedSnapshot = {
    ...state,
    diffSets: new Map(state.diffSets),
  };
  notifyListeners();
}

/**
 * Subscribe to state changes
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get current state snapshot
 */
function getSnapshot(): DiffState {
  return cachedSnapshot;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Create a new diff set
 */
function createDiffSet(options: {
  id?: string;
  title: string;
  viewMode?: 'split' | 'inline';
}): string {
  const id = options.id || `diff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const diffSet: DiffSet = {
    id,
    title: options.title,
    diffs: new Map(),
    activeUri: null,
    viewMode: options.viewMode || 'split',
    allAccepted: false,
    allRejected: false,
  };

  setState(prev => ({
    ...prev,
    diffSets: new Map(prev.diffSets).set(id, diffSet),
    activeDiffSetId: id,
    isDiffPanelOpen: true,
  }));

  return id;
}

/**
 * Add a file diff to a diff set
 */
function addFileDiff(diffSetId: string, fileDiff: Omit<FileDiff, 'createdAt' | 'isAccepted' | 'isRejected'>): void {
  setState(prev => {
    const diffSet = prev.diffSets.get(diffSetId);
    if (!diffSet) {
      console.warn(`[diffStore] Diff set ${diffSetId} not found`);
      return prev;
    }

    const completedFileDiff: FileDiff = {
      ...fileDiff,
      createdAt: Date.now(),
      isAccepted: false,
      isRejected: false,
    };

    const newDiffs = new Map(diffSet.diffs);
    newDiffs.set(fileDiff.uri, completedFileDiff);

    const updatedDiffSet: DiffSet = {
      ...diffSet,
      diffs: newDiffs,
      activeUri: diffSet.activeUri || fileDiff.uri,
    };

    const newDiffSets = new Map(prev.diffSets);
    newDiffSets.set(diffSetId, updatedDiffSet);

    return {
      ...prev,
      diffSets: newDiffSets,
    };
  });
}

/**
 * Update a file diff (used for streaming updates)
 */
function updateFileDiff(
  diffSetId: string,
  uri: string,
  updates: Partial<FileDiff>
): void {
  setState(prev => {
    const diffSet = prev.diffSets.get(diffSetId);
    if (!diffSet) return prev;

    const existingDiff = diffSet.diffs.get(uri);
    if (!existingDiff) return prev;

    const updatedDiff: FileDiff = {
      ...existingDiff,
      ...updates,
    };

    const newDiffs = new Map(diffSet.diffs);
    newDiffs.set(uri, updatedDiff);

    const updatedDiffSet: DiffSet = {
      ...diffSet,
      diffs: newDiffs,
    };

    const newDiffSets = new Map(prev.diffSets);
    newDiffSets.set(diffSetId, updatedDiffSet);

    return {
      ...prev,
      diffSets: newDiffSets,
    };
  });
}

/**
 * Accept a file diff (apply changes)
 */
async function acceptFileDiff(diffSetId: string, uri: string): Promise<void> {
  const diffSet = state.diffSets.get(diffSetId);
  if (!diffSet) {
    throw new Error(`Diff set ${diffSetId} not found`);
  }

  const fileDiff = diffSet.diffs.get(uri);
  if (!fileDiff) {
    throw new Error(`File diff for ${uri} not found`);
  }

  try {
    // Save the modified content to the file
    await invoke('save_file_content', {
      path: uri,
      content: fileDiff.modifiedContent,
    });

    // Update the file in the editor if it's open
    const openFiles = ideActions.getState().openFiles;
    const openFile = openFiles.find(f => f.path === uri);

    if (openFile) {
      // Update the content in the IDE
      ideActions.updateFileContent(openFile.id, fileDiff.modifiedContent);

      // If this file is active, refresh the editor
      if (ideActions.getState().activeFileId === openFile.id) {
        const editor = editorActions.getCurrentEditor();
        if (editor) {
          const model = editor.getModel();
          if (model && model.getValue() !== fileDiff.modifiedContent) {
            model.setValue(fileDiff.modifiedContent);
          }
        }
      }
    }

    // Mark diff as accepted
    updateFileDiff(diffSetId, uri, { isAccepted: true, isRejected: false });

    // Check if all diffs in the set are accepted
    const allAccepted = Array.from(diffSet.diffs.values()).every(
      d => d.uri === uri || d.isAccepted
    );

    if (allAccepted) {
      setState(prev => {
        const currentDiffSet = prev.diffSets.get(diffSetId);
        if (!currentDiffSet) return prev;

        const updatedDiffSet: DiffSet = {
          ...currentDiffSet,
          allAccepted: true,
        };

        const newDiffSets = new Map(prev.diffSets);
        newDiffSets.set(diffSetId, updatedDiffSet);

        return {
          ...prev,
          diffSets: newDiffSets,
        };
      });
    }
  } catch (error) {
    console.error(`[diffStore] Error accepting diff for ${uri}:`, error);
    throw error;
  }
}

/**
 * Reject a file diff (discard changes)
 */
function rejectFileDiff(diffSetId: string, uri: string): void {
  updateFileDiff(diffSetId, uri, { isRejected: true, isAccepted: false });

  // Check if all diffs in the set are rejected
  const diffSet = state.diffSets.get(diffSetId);
  if (!diffSet) return;

  const allRejected = Array.from(diffSet.diffs.values()).every(
    d => d.uri === uri || d.isRejected
  );

  if (allRejected) {
    setState(prev => {
      const currentDiffSet = prev.diffSets.get(diffSetId);
      if (!currentDiffSet) return prev;

      const updatedDiffSet: DiffSet = {
        ...currentDiffSet,
        allRejected: true,
      };

      const newDiffSets = new Map(prev.diffSets);
      newDiffSets.set(diffSetId, updatedDiffSet);

      return {
        ...prev,
        diffSets: newDiffSets,
      };
    });
  }
}

/**
 * Accept all diffs in a diff set
 */
async function acceptAllDiffs(diffSetId: string): Promise<void> {
  const diffSet = state.diffSets.get(diffSetId);
  if (!diffSet) {
    throw new Error(`Diff set ${diffSetId} not found`);
  }

  const errors: Array<{ uri: string; error: unknown }> = [];

  for (const [uri, fileDiff] of diffSet.diffs) {
    if (fileDiff.isAccepted || fileDiff.isRejected) continue;

    try {
      await acceptFileDiff(diffSetId, uri);
    } catch (error) {
      errors.push({ uri, error });
    }
  }

  if (errors.length > 0) {
    console.error('[diffStore] Errors accepting diffs:', errors);
    throw new Error(`Failed to accept ${errors.length} diff(s)`);
  }
}

/**
 * Reject all diffs in a diff set
 */
function rejectAllDiffs(diffSetId: string): void {
  const diffSet = state.diffSets.get(diffSetId);
  if (!diffSet) return;

  for (const uri of diffSet.diffs.keys()) {
    rejectFileDiff(diffSetId, uri);
  }
}

/**
 * Set active file in diff set
 */
function setActiveDiffFile(diffSetId: string, uri: string): void {
  setState(prev => {
    const diffSet = prev.diffSets.get(diffSetId);
    if (!diffSet) return prev;

    const updatedDiffSet: DiffSet = {
      ...diffSet,
      activeUri: uri,
    };

    const newDiffSets = new Map(prev.diffSets);
    newDiffSets.set(diffSetId, updatedDiffSet);

    return {
      ...prev,
      diffSets: newDiffSets,
    };
  });
}

/**
 * Close a diff set
 */
function closeDiffSet(diffSetId: string): void {
  setState(prev => {
    const newDiffSets = new Map(prev.diffSets);
    newDiffSets.delete(diffSetId);

    let newActiveDiffSetId = prev.activeDiffSetId;
    if (prev.activeDiffSetId === diffSetId) {
      // Set active to another diff set if available
      const remaining = Array.from(newDiffSets.keys());
      newActiveDiffSetId = remaining.length > 0 ? remaining[0] : null;
    }

    return {
      ...prev,
      diffSets: newDiffSets,
      activeDiffSetId: newActiveDiffSetId,
      isDiffPanelOpen: newDiffSets.size > 0 && prev.isDiffPanelOpen,
    };
  });
}

/**
 * Set active diff set
 */
function setActiveDiffSet(diffSetId: string | null): void {
  setState(prev => ({
    ...prev,
    activeDiffSetId: diffSetId,
    isDiffPanelOpen: diffSetId !== null,
  }));
}

/**
 * Toggle diff panel visibility
 */
function toggleDiffPanel(): void {
  setState(prev => ({
    ...prev,
    isDiffPanelOpen: !prev.isDiffPanelOpen,
  }));
}

/**
 * Set diff panel position
 */
function setDiffPanelPosition(position: 'bottom' | 'right'): void {
  setState(prev => ({
    ...prev,
    panelPosition: position,
  }));
}

/**
 * Set diff panel size
 */
function setDiffPanelSize(size: number): void {
  setState(prev => ({
    ...prev,
    panelSize: Math.max(20, Math.min(80, size)),
  }));
}

/**
 * Get diff set by ID
 */
function getDiffSet(diffSetId: string): DiffSet | undefined {
  return state.diffSets.get(diffSetId);
}

/**
 * Get file diff
 */
function getFileDiff(diffSetId: string, uri: string): FileDiff | undefined {
  const diffSet = state.diffSets.get(diffSetId);
  return diffSet?.diffs.get(uri);
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Use diff store state
 */
export function useDiffState(): DiffState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Use active diff set
 */
export function useActiveDiffSet(): DiffSet | undefined {
  const state = useDiffState();
  if (!state.activeDiffSetId) return undefined;
  return state.diffSets.get(state.activeDiffSetId);
}

/**
 * Use specific diff set
 */
export function useDiffSet(diffSetId: string): DiffSet | undefined {
  const state = useDiffState();
  return state.diffSets.get(diffSetId);
}

/**
 * Use file diff
 */
export function useFileDiff(diffSetId: string, uri: string): FileDiff | undefined {
  const diffSet = useDiffSet(diffSetId);
  return diffSet?.diffs.get(uri);
}

// ============================================================================
// Exports
// ============================================================================

export const diffActions = {
  createDiffSet,
  addFileDiff,
  updateFileDiff,
  acceptFileDiff,
  rejectFileDiff,
  acceptAllDiffs,
  rejectAllDiffs,
  setActiveDiffFile,
  closeDiffSet,
  setActiveDiffSet,
  toggleDiffPanel,
  setDiffPanelPosition,
  setDiffPanelSize,
  getDiffSet,
  getFileDiff,
};
