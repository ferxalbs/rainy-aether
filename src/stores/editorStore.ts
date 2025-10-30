import { useSyncExternalStore } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { undo, redo, selectAll, indentMore, indentLess } from "@codemirror/commands";
import { openSearchPanel, findNext, replaceAll } from "@codemirror/search";

interface EditorCapabilities {
  toggleWrap?: (enabled?: boolean) => void;
}

interface EditorState {
  view: EditorView | null;
  wrapEnabled: boolean;
  capabilities: EditorCapabilities | null;
}

const editorState: EditorState = {
  view: null,
  wrapEnabled: true,
  capabilities: null,
};

type EditorStateListener = () => void;

const listeners = new Set<EditorStateListener>();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Editor state listener error:", error);
    }
  });
};

const updateEditorState = (partial: Partial<EditorState>) => {
  Object.assign(editorState, partial);
  notify();
};

const subscribe = (listener: EditorStateListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => ({ ...editorState });

export const useEditorState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const editorActions = {
  registerView(view: EditorView, capabilities?: EditorCapabilities) {
    updateEditorState({ view, wrapEnabled: true, capabilities: capabilities || null });
  },
  unregisterView(view: EditorView) {
    if (editorState.view === view) {
      updateEditorState({ view: null, wrapEnabled: true, capabilities: null });
    }
  },
  setWrapEnabled(enabled: boolean) {
    updateEditorState({ wrapEnabled: enabled });
  },
  getWrapEnabled() {
    return editorState.wrapEnabled;
  },

  undo() {
    const v = editorState.view; if (v) undo(v);
  },
  redo() {
    const v = editorState.view; if (v) redo(v);
  },
  openSearchPanel() {
    const v = editorState.view; if (v) openSearchPanel(v);
  },
  findNext() {
    const v = editorState.view; if (v) findNext(v);
  },
  replaceAll() {
    const v = editorState.view; if (v) replaceAll(v);
  },
  toggleWrap() {
    const v = editorState.view; const cap = editorState.capabilities;
    if (!v || !cap?.toggleWrap) return;
    const next = !editorState.wrapEnabled;
    cap.toggleWrap(next);
    editorActions.setWrapEnabled(next);
  },

  selectAll() {
    const v = editorState.view; if (v) selectAll(v);
  },

  indentMore() {
    const v = editorState.view; if (v) indentMore(v);
  },

  indentLess() {
    const v = editorState.view; if (v) indentLess(v);
  },

  goToLine(line: number) {
    const v = editorState.view; if (!v) return;
    if (!Number.isFinite(line)) return;
    const total = v.state.doc.lines;
    if (line < 1 || line > total) return;
    try {
      const target = v.state.doc.line(line);
      v.dispatch({ selection: EditorSelection.cursor(target.from), scrollIntoView: true });
    } catch (err) {
      console.error('goToLine failed:', err);
    }
  }
};

export { editorState };