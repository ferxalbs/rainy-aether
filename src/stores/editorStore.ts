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
  getCurrentEditor() {
    return editorState.view;
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

  goToPosition(line: number, column: number) {
    const v = editorState.view;
    if (!v) return;
    if (!Number.isFinite(line) || !Number.isFinite(column)) return;

    try {
      const model = v.getModel();
      if (!model) return;
      const total = model.getLineCount();
      if (line < 1 || line > total) return;

      const position = { lineNumber: line, column: Math.max(1, column) };
      v.setPosition(position);
      v.revealPositionInCenter(position, 0); // 0 = immediate scroll
      v.focus();
    } catch (err) {
      console.error('goToPosition failed:', err);
    }
  },

  revealRange(startLine: number, startColumn: number, endLine: number, endColumn: number) {
    const v = editorState.view;
    if (!v) return;

    try {
      const model = v.getModel();
      if (!model) return;

      const range = {
        startLineNumber: startLine,
        startColumn: startColumn,
        endLineNumber: endLine,
        endColumn: endColumn,
      };

      v.setSelection(range);
      v.revealRangeInCenter(range, 0); // 0 = immediate scroll
      v.focus();
    } catch (err) {
      console.error('revealRange failed:', err);
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
  },

  // Clipboard actions
  cut() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.clipboardCutAction')?.run();
      } catch (error) {
        console.error('Cut failed:', error);
      }
    }
  },

  copy() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.clipboardCopyAction')?.run();
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  },

  paste() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.clipboardPasteAction')?.run();
      } catch (error) {
        console.error('Paste failed:', error);
      }
    }
  },

  // Line manipulation
  copyLineUp() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.copyLinesUpAction')?.run();
      } catch (error) {
        console.error('Copy line up failed:', error);
      }
    }
  },

  copyLineDown() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.copyLinesDownAction')?.run();
      } catch (error) {
        console.error('Copy line down failed:', error);
      }
    }
  },

  copyLinesUp() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.copyLinesUpAction')?.run();
      } catch (error) {
        console.error('Copy lines up failed:', error);
      }
    }
  },

  copyLinesDown() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.copyLinesDownAction')?.run();
      } catch (error) {
        console.error('Copy lines down failed:', error);
      }
    }
  },

  moveLinesUp() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.moveLinesUpAction')?.run();
      } catch (error) {
        console.error('Move lines up failed:', error);
      }
    }
  },

  moveLinesDown() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.moveLinesDownAction')?.run();
      } catch (error) {
        console.error('Move lines down failed:', error);
      }
    }
  },

  deleteLines() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.deleteLines')?.run();
      } catch (error) {
        console.error('Delete lines failed:', error);
      }
    }
  },

  selectLine() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('expandLineSelection')?.run();
      } catch (error) {
        console.error('Select line failed:', error);
      }
    }
  },

  // Search actions
  findPrevious() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.previousMatchFindAction')?.run();
      } catch (error) {
        console.error('Find previous failed:', error);
      }
    }
  },

  // Comment actions
  commentLine() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.commentLine')?.run();
      } catch (error) {
        console.error('Comment line failed:', error);
      }
    }
  },

  toggleBlockComment() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.blockComment')?.run();
      } catch (error) {
        console.error('Toggle block comment failed:', error);
      }
    }
  },

  // Selection actions
  expandSelection() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.smartSelect.expand')?.run();
      } catch (error) {
        console.error('Expand selection failed:', error);
      }
    }
  },

  shrinkSelection() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.smartSelect.shrink')?.run();
      } catch (error) {
        console.error('Shrink selection failed:', error);
      }
    }
  },

  // Multi-cursor actions
  addCursorAbove() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.insertCursorAbove')?.run();
      } catch (error) {
        console.error('Add cursor above failed:', error);
      }
    }
  },

  addCursorBelow() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.insertCursorBelow')?.run();
      } catch (error) {
        console.error('Add cursor below failed:', error);
      }
    }
  },

  addSelectionToNextFindMatch() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.addSelectionToNextFindMatch')?.run();
      } catch (error) {
        console.error('Add selection to next find match failed:', error);
      }
    }
  },

  selectAllMatches() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.selectHighlights')?.run();
      } catch (error) {
        console.error('Select all matches failed:', error);
      }
    }
  },

  // View actions
  toggleMinimap() {
    const v = editorState.view;
    if (v) {
      try {
        // Get current minimap state
        const model = v.getModel();
        if (!model) return;

        // Toggle minimap by updating options
        const currentOptions = v.getRawOptions();
        const currentMinimapEnabled = currentOptions.minimap?.enabled ?? true;

        v.updateOptions({
          minimap: {
            enabled: !currentMinimapEnabled
          }
        });
      } catch (error) {
        console.error('Toggle minimap failed:', error);
      }
    }
  },

  toggleBreadcrumbs() {
    // Note: Breadcrumbs are typically handled at the IDE level, not Monaco
    // This is a placeholder for IDE-level breadcrumb toggle
    console.log('Toggle breadcrumbs action called');
  },

  // Navigation actions
  goToSymbol() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.quickOutline')?.run();
      } catch (error) {
        console.error('Go to symbol failed:', error);
      }
    }
  },

  goToReferences() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('editor.action.goToReferences')?.run();
      } catch (error) {
        console.error('Go to references failed:', error);
      }
    }
  },

  goBack() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('workbench.action.navigateBack')?.run();
      } catch (error) {
        console.error('Go back failed:', error);
      }
    }
  },

  goForward() {
    const v = editorState.view;
    if (v) {
      try {
        v.getAction('workbench.action.navigateForward')?.run();
      } catch (error) {
        console.error('Go forward failed:', error);
      }
    }
  }
};

export { editorState };