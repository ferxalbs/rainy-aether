import * as monaco from 'monaco-editor';
import { editorState } from '../stores/editorStore';
import { IMarker } from './markerService';

/**
 * Code Action Kind (Monaco types)
 */
export enum CodeActionKind {
  QuickFix = 'quickfix',
  Refactor = 'refactor',
  RefactorExtract = 'refactor.extract',
  RefactorInline = 'refactor.inline',
  RefactorRewrite = 'refactor.rewrite',
  Source = 'source',
  SourceOrganizeImports = 'source.organizeImports',
  SourceFixAll = 'source.fixAll',
}

/**
 * Code Action interface
 */
export interface ICodeAction {
  title: string;
  kind?: string;
  diagnostics?: monaco.editor.IMarkerData[];
  edit?: monaco.languages.WorkspaceEdit;
  command?: monaco.languages.Command;
  isPreferred?: boolean;
  disabled?: string;
}

/**
 * Code Action Provider Result
 */
export interface CodeActionList {
  actions: ICodeAction[];
  dispose: () => void;
}

/**
 * Code Actions Service
 * Provides quick fixes and code actions for diagnostics
 *
 * NOTE: Monaco's code action API is limited compared to VS Code.
 * Quick fixes are automatically shown by Monaco in the editor.
 * This service provides a way to programmatically query and apply them.
 */
class CodeActionService {
  /**
   * Get code actions for a specific marker
   *
   * Note: Monaco doesn't have a direct API to get code actions.
   * Code actions are provided by language services and shown automatically.
   * This is a best-effort implementation that triggers the editor's command.
   */
  async getCodeActionsForMarker(_marker: IMarker): Promise<CodeActionList> {
    const editor = editorState.view;
    if (!editor) {
      return { actions: [], dispose: () => {} };
    }

    const model = editor.getModel();
    if (!model) {
      return { actions: [], dispose: () => {} };
    }

    try {
      // Monaco doesn't expose getCodeActions directly in the public API
      // Code actions are shown through the editor's context menu and lightbulb
      // We return empty for now - the UI should use the editor's built-in quick fix
      console.warn('[CodeActionService] Monaco does not expose code actions API publicly');
      return { actions: [], dispose: () => {} };
    } catch (error) {
      console.error('[CodeActionService] Failed to get code actions:', error);
      return { actions: [], dispose: () => {} };
    }
  }

  /**
   * Apply a code action
   * This is theoretical - Monaco handles code actions internally
   */
  async applyCodeAction(_action: ICodeAction): Promise<boolean> {
    console.warn('[CodeActionService] Monaco handles code action application internally');
    return false;
  }

  /**
   * Get all available code actions at current cursor position
   * Triggers Monaco's built-in quick fix UI
   */
  async getCodeActionsAtCursor(): Promise<CodeActionList> {
    const editor = editorState.view;
    if (!editor) {
      return { actions: [], dispose: () => {} };
    }

    try {
      // Trigger Monaco's built-in quick fix command
      const action = editor.getAction('editor.action.quickFix');
      if (action) {
        await action.run();
      }

      return { actions: [], dispose: () => {} };
    } catch (error) {
      console.error('[CodeActionService] Failed to trigger quick fix:', error);
      return { actions: [], dispose: () => {} };
    }
  }

  /**
   * Check if code actions are available for a marker
   * Always returns false since we can't query Monaco's code actions
   */
  async hasCodeActions(_marker: IMarker): Promise<boolean> {
    return false;
  }

  /**
   * Get preferred code action (if available)
   */
  async getPreferredCodeAction(_marker: IMarker): Promise<ICodeAction | null> {
    return null;
  }

  /**
   * Trigger Monaco's built-in quick fix UI at a specific position
   * This is the recommended way to show quick fixes
   */
  async showQuickFixAtPosition(lineNumber: number, column: number): Promise<void> {
    const editor = editorState.view;
    if (!editor) {
      return;
    }

    try {
      // Set cursor position
      editor.setPosition({ lineNumber, column });

      // Focus editor
      editor.focus();

      // Trigger quick fix command
      const action = editor.getAction('editor.action.quickFix');
      if (action) {
        await action.run();
      } else {
        console.warn('[CodeActionService] Quick fix action not available');
      }
    } catch (error) {
      console.error('[CodeActionService] Failed to show quick fix:', error);
    }
  }
}

// Singleton instance
let codeActionServiceInstance: CodeActionService | null = null;

/**
 * Get the singleton CodeActionService instance
 */
export function getCodeActionService(): CodeActionService {
  if (!codeActionServiceInstance) {
    codeActionServiceInstance = new CodeActionService();
  }
  return codeActionServiceInstance;
}

export default CodeActionService;
