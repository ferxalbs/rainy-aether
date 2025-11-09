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
 */
class CodeActionService {
  /**
   * Get code actions for a specific marker
   */
  async getCodeActionsForMarker(marker: IMarker): Promise<CodeActionList> {
    const editor = editorState.view;
    if (!editor) {
      return { actions: [], dispose: () => {} };
    }

    const model = editor.getModel();
    if (!model) {
      return { actions: [], dispose: () => {} };
    }

    // Create Monaco range from marker
    const range = new monaco.Range(
      marker.startLineNumber,
      marker.startColumn,
      marker.endLineNumber,
      marker.endColumn
    );

    // Create marker data for context
    const markerData: monaco.editor.IMarkerData = {
      severity: marker.severity,
      message: marker.message,
      startLineNumber: marker.startLineNumber,
      startColumn: marker.startColumn,
      endLineNumber: marker.endLineNumber,
      endColumn: marker.endColumn,
      code: marker.code,
      source: marker.source,
    };

    try {
      // Get code actions from Monaco
      const codeActions = await monaco.languages.getCodeActions(
        model,
        range,
        {
          type: monaco.languages.CodeActionTriggerType.Manual,
          filter: { include: [monaco.languages.CodeActionKind.QuickFix] },
        },
        monaco.CancellationToken.None
      );

      if (!codeActions || !codeActions.actions) {
        return { actions: [], dispose: () => {} };
      }

      // Convert Monaco code actions to our interface
      const actions: ICodeAction[] = codeActions.actions.map((action) => ({
        title: action.title,
        kind: action.kind,
        diagnostics: action.diagnostics,
        edit: action.edit,
        command: action.command,
        isPreferred: action.isPreferred,
        disabled: action.disabled,
      }));

      // Return actions with dispose function
      return {
        actions,
        dispose: () => {
          if (codeActions.dispose) {
            codeActions.dispose();
          }
        },
      };
    } catch (error) {
      console.error('[CodeActionService] Failed to get code actions:', error);
      return { actions: [], dispose: () => {} };
    }
  }

  /**
   * Apply a code action
   */
  async applyCodeAction(action: ICodeAction): Promise<boolean> {
    const editor = editorState.view;
    if (!editor) {
      console.error('[CodeActionService] No editor available');
      return false;
    }

    const model = editor.getModel();
    if (!model) {
      console.error('[CodeActionService] No model available');
      return false;
    }

    try {
      // Apply workspace edit if present
      if (action.edit) {
        await this.applyWorkspaceEdit(action.edit, model);
      }

      // Execute command if present
      if (action.command) {
        await this.executeCommand(action.command, editor);
      }

      return true;
    } catch (error) {
      console.error('[CodeActionService] Failed to apply code action:', error);
      return false;
    }
  }

  /**
   * Apply workspace edit to the model
   */
  private async applyWorkspaceEdit(
    edit: monaco.languages.WorkspaceEdit,
    model: monaco.editor.ITextModel
  ): Promise<void> {
    if (!edit.edits || edit.edits.length === 0) {
      return;
    }

    const editor = editorState.view;
    if (!editor) return;

    // Apply edits using Monaco's edit builder
    editor.executeEdits(
      'codeAction',
      edit.edits.map((e) => {
        if ('resource' in e) {
          // TextEdit with resource
          const textEdit = e as monaco.languages.IWorkspaceTextEdit;
          return {
            range: textEdit.textEdit.range,
            text: textEdit.textEdit.text,
            forceMoveMarkers: true,
          };
        } else {
          // FileEdit (create/delete/rename file)
          console.warn('[CodeActionService] File edits not yet supported:', e);
          return null;
        }
      }).filter((e): e is monaco.editor.IIdentifiedSingleEditOperation => e !== null)
    );
  }

  /**
   * Execute a command
   */
  private async executeCommand(
    command: monaco.languages.Command,
    editor: monaco.editor.IStandaloneCodeEditor
  ): Promise<void> {
    try {
      // Try to execute the command using Monaco's command service
      const action = editor.getAction(command.id);
      if (action) {
        await action.run();
      } else {
        console.warn('[CodeActionService] Command not found:', command.id);
      }
    } catch (error) {
      console.error('[CodeActionService] Failed to execute command:', error);
    }
  }

  /**
   * Get all available code actions at current cursor position
   */
  async getCodeActionsAtCursor(): Promise<CodeActionList> {
    const editor = editorState.view;
    if (!editor) {
      return { actions: [], dispose: () => {} };
    }

    const model = editor.getModel();
    const position = editor.getPosition();

    if (!model || !position) {
      return { actions: [], dispose: () => {} };
    }

    try {
      // Get code actions at cursor position
      const codeActions = await monaco.languages.getCodeActions(
        model,
        new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        {
          type: monaco.languages.CodeActionTriggerType.Manual,
        },
        monaco.CancellationToken.None
      );

      if (!codeActions || !codeActions.actions) {
        return { actions: [], dispose: () => {} };
      }

      const actions: ICodeAction[] = codeActions.actions.map((action) => ({
        title: action.title,
        kind: action.kind,
        diagnostics: action.diagnostics,
        edit: action.edit,
        command: action.command,
        isPreferred: action.isPreferred,
        disabled: action.disabled,
      }));

      return {
        actions,
        dispose: () => {
          if (codeActions.dispose) {
            codeActions.dispose();
          }
        },
      };
    } catch (error) {
      console.error('[CodeActionService] Failed to get code actions at cursor:', error);
      return { actions: [], dispose: () => {} };
    }
  }

  /**
   * Check if code actions are available for a marker
   */
  async hasCodeActions(marker: IMarker): Promise<boolean> {
    const result = await this.getCodeActionsForMarker(marker);
    const hasActions = result.actions.length > 0;
    result.dispose();
    return hasActions;
  }

  /**
   * Get preferred code action (if available)
   */
  async getPreferredCodeAction(marker: IMarker): Promise<ICodeAction | null> {
    const result = await this.getCodeActionsForMarker(marker);
    const preferred = result.actions.find((action) => action.isPreferred);
    result.dispose();
    return preferred || null;
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
