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

let editorState: EditorState = {
  view: null,
  wrapEnabled: true,
  capabilities: null,
};

let cachedSnapshot: EditorState = { ...editorState };

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
  editorState = { ...editorState, ...partial };
  cachedSnapshot = editorState;
  notify();
};

const subscribe = (listener: EditorStateListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

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
  },

  // Code navigation actions
  goToDefinition() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.revealDefinition')?.run();
      } catch (error) {
        console.error('Go to definition failed:', error);
      }
    }
  },

  peekDefinition() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.peekDefinition')?.run();
      } catch (error) {
        console.error('Peek definition failed:', error);
      }
    }
  },

  goToTypeDefinition() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.goToTypeDefinition')?.run();
      } catch (error) {
        console.error('Go to type definition failed:', error);
      }
    }
  },

  goToImplementation() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.goToImplementation')?.run();
      } catch (error) {
        console.error('Go to implementation failed:', error);
      }
    }
  },

  findAllReferences() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.goToReferences')?.run();
      } catch (error) {
        console.error('Find all references failed:', error);
      }
    }
  },

  renameSymbol() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.rename')?.run();
      } catch (error) {
        console.error('Rename symbol failed:', error);
      }
    }
  },

  showOutline() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.quickOutline')?.run();
      } catch (error) {
        console.error('Show outline failed:', error);
      }
    }
  },

  formatDocument() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.formatDocument')?.run();
      } catch (error) {
        console.error('Format document failed:', error);
      }
    }
  },

  toggleComment() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.commentLine')?.run();
      } catch (error) {
        console.error('Toggle comment failed:', error);
      }
    }
  }
};

export { editorState };