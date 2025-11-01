import { useSyncExternalStore } from "react";
import type * as monaco from "monaco-editor";

interface EditorCapabilities {
  toggleWrap?: (enabled?: boolean) => void;
}

interface EditorState {
  view: monaco.editor.IStandaloneCodeEditor | null;
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

const getSnapshot = () => editorState;

export const useEditorState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const editorActions = {
  registerView(view: monaco.editor.IStandaloneCodeEditor, capabilities?: EditorCapabilities) {
    updateEditorState({ view, wrapEnabled: true, capabilities: capabilities || null });
  },
  unregisterView(view: monaco.editor.IStandaloneCodeEditor) {
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
    const v = editorState.view; 
    if (v) {
      try {
        v.trigger('keyboard', 'undo', null);
      } catch (error) {
        console.error('Undo failed:', error);
      }
    }
  },
  redo() {
    const v = editorState.view; 
    if (v) {
      try {
        v.trigger('keyboard', 'redo', null);
      } catch (error) {
        console.error('Redo failed:', error);
      }
    }
  },
  openSearchPanel() {
    const v = editorState.view; 
    if (v) {
      try {
        v.getAction('editor.action.find')?.run();
      } catch (error) {
        console.error('Open search panel failed:', error);
      }
    }
  },
  findNext() {
    const v = editorState.view; 
    if (v) {
      try {
        v.getAction('editor.action.nextMatchFindAction')?.run();
      } catch (error) {
        console.error('Find next failed:', error);
      }
    }
  },
  replaceAll() {
    const v = editorState.view; 
    if (v) {
      try {
        v.getAction('editor.action.startFindReplaceAction')?.run();
      } catch (error) {
        console.error('Replace all failed:', error);
      }
    }
  },
  toggleWrap() {
    const v = editorState.view; const cap = editorState.capabilities;
    if (!v || !cap?.toggleWrap) return;
    try {
      const next = !editorState.wrapEnabled;
      cap.toggleWrap(next);
      editorActions.setWrapEnabled(next);
    } catch (error) {
      console.error('Toggle wrap failed:', error);
    }
  },

  selectAll() {
    const v = editorState.view; 
    if (v) {
      try {
        const model = v.getModel();
        if (model) {
          v.setSelection(model.getFullModelRange());
        }
      } catch (error) {
        console.error('Select all failed:', error);
      }
    }
  },

  indentMore() {
    const v = editorState.view; 
    if (v) {
      try {
        v.trigger('keyboard', 'type', { text: '  ' });
      } catch (error) {
        console.error('Indent more failed:', error);
      }
    }
  },

  indentLess() {
    const v = editorState.view; 
    if (v) {
      try {
        v.trigger('keyboard', 'outdent', null);
      } catch (error) {
        console.error('Indent less failed:', error);
      }
    }
  },

  goToLine(line: number) {
    const v = editorState.view; 
    if (!v) return;
    if (!Number.isFinite(line)) return;
    
    try {
      const model = v.getModel();
      if (!model) return;
      const total = model.getLineCount();
      if (line < 1 || line > total) return;
      
      const position = { lineNumber: line, column: 1 };
      v.setPosition(position);
      v.revealPositionInCenter(position);
      v.focus();
    } catch (err) {
      console.error('goToLine failed:', err);
    }
  },

  layout() {
    const v = editorState.view; 
    if (v) {
      try {
        v.layout();
        v.focus();
      } catch (error) {
        console.error('Layout failed:', error);
      }
    }
  }
};

export { editorState };