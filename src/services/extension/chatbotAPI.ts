/**
 * Chatbot Extension API
 *
 * VS Code-compatible API for chatbot and webview-based extensions.
 * Provides access to editor, workspace, and diff preview capabilities.
 */

import { invoke } from '@tauri-apps/api/core';
import { webviewActions } from '@/stores/webviewStore';
import { editorActions } from '@/stores/editorStore';
import { ideActions } from '@/stores/ideStore';
import { diffActions } from '@/stores/diffStore';
import * as monaco from 'monaco-editor';

// ============================================================================
// Types
// ============================================================================

export interface WebviewOptions {
  enableScripts?: boolean;
  retainContextWhenHidden?: boolean;
  localResourceRoots?: string[];
}

export interface WebviewView {
  readonly webview: Webview;
  readonly viewType: string;
  title?: string;
  description?: string;
  visible: boolean;

  show(preserveFocus?: boolean): void;
  dispose(): void;
}

export interface Webview {
  html: string;
  options: WebviewOptions;

  postMessage(message: unknown): Promise<boolean>;
  onDidReceiveMessage(handler: (message: unknown) => void): { dispose(): void };
}

export interface WebviewViewProvider {
  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): void | Promise<void>;
}

export interface WebviewViewResolveContext {
  readonly state: unknown | undefined;
}

export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  onCancellationRequested(handler: () => void): { dispose(): void };
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  character: number;
}

export interface TextDocument {
  uri: string;
  fileName: string;
  languageId: string;
  version: number;
  getText(): string;
  lineAt(line: number): TextLine;
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
}

export interface TextLine {
  lineNumber: number;
  text: string;
  range: Range;
  rangeIncludingLineBreak: Range;
  firstNonWhitespaceCharacterIndex: number;
  isEmptyOrWhitespace: boolean;
}

export interface WorkspaceEdit {
  has(uri: string): boolean;
  set(uri: string, edits: TextEdit[]): void;
  get(uri: string): TextEdit[];
  delete(uri: string): void;
}

// ============================================================================
// Window API
// ============================================================================

/**
 * Register a webview view provider for the sidebar
 */
export function registerWebviewViewProvider(
  viewId: string,
  provider: WebviewViewProvider,
  options?: {
    webviewOptions?: {
      retainContextWhenHidden?: boolean;
    };
  }
): { dispose(): void } {
  // Create the webview panel
  const panel = webviewActions.createWebviewPanel({
    viewId,
    extensionId: 'current-extension', // This will be set by extension context
    title: viewId,
    enableScripts: true,
    retainContextWhenHidden: options?.webviewOptions?.retainContextWhenHidden ?? false,
  });

  // Create webview view object
  const webviewView: WebviewView = {
    webview: createWebview(viewId),
    viewType: viewId,
    title: undefined,
    description: undefined,
    visible: false,

    show(preserveFocus?: boolean) {
      webviewActions.showWebview(viewId);
      this.visible = true;
    },

    dispose() {
      webviewActions.disposeWebview(viewId);
    },
  };

  // Create resolve context
  const context: WebviewViewResolveContext = {
    state: undefined, // Could load persisted state here
  };

  // Create cancellation token (dummy for now)
  const token: CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  };

  // Call provider to set up the webview
  Promise.resolve(provider.resolveWebviewView(webviewView, context, token)).catch(error => {
    console.error(`[chatbotAPI] Error resolving webview view ${viewId}:`, error);
  });

  // Return disposable
  return {
    dispose() {
      webviewActions.disposeWebview(viewId);
    },
  };
}

/**
 * Create a webview object for a panel
 */
function createWebview(viewId: string): Webview {
  return {
    get html() {
      const panel = webviewActions.getWebviewPanel(viewId);
      return panel?.html || '';
    },

    set html(value: string) {
      webviewActions.updateWebviewHtml(viewId, value);
    },

    get options() {
      const panel = webviewActions.getWebviewPanel(viewId);
      return {
        enableScripts: panel?.enableScripts ?? true,
        retainContextWhenHidden: panel?.retainContextWhenHidden ?? false,
      };
    },

    set options(value: WebviewOptions) {
      // Update panel options (would need to extend store for this)
      console.log('[chatbotAPI] Setting webview options:', value);
    },

    async postMessage(message: unknown): Promise<boolean> {
      try {
        webviewActions.postMessageToWebview(viewId, message);
        return true;
      } catch (error) {
        console.error(`[chatbotAPI] Error posting message to ${viewId}:`, error);
        return false;
      }
    },

    onDidReceiveMessage(handler: (message: unknown) => void) {
      const dispose = webviewActions.onDidReceiveMessage(viewId, handler);
      return { dispose };
    },
  };
}

/**
 * Show a text document in the editor
 */
export async function showTextDocument(uri: string, options?: {
  preserveFocus?: boolean;
  preview?: boolean;
  selection?: Range;
}): Promise<void> {
  try {
    // Open the file
    await ideActions.openFile(uri);

    // If selection is provided, navigate to it
    if (options?.selection) {
      const editor = editorActions.getCurrentEditor();
      if (editor) {
        const { start } = options.selection;
        editor.setPosition({
          lineNumber: start.line + 1, // Monaco uses 1-based line numbers
          column: start.character + 1,
        });
        editor.revealLineInCenter(start.line + 1);

        // Set selection if range is provided
        const { end } = options.selection;
        editor.setSelection({
          startLineNumber: start.line + 1,
          startColumn: start.character + 1,
          endLineNumber: end.line + 1,
          endColumn: end.character + 1,
        });
      }
    }

    // Focus editor if needed
    if (!options?.preserveFocus) {
      editorActions.getCurrentEditor()?.focus();
    }
  } catch (error) {
    console.error('[chatbotAPI] Error showing text document:', error);
    throw error;
  }
}

/**
 * Show an information message
 */
export async function showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
  // TODO: Implement message dialog
  console.log('[chatbotAPI] Info:', message, items);
  return undefined;
}

/**
 * Show a warning message
 */
export async function showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
  // TODO: Implement message dialog
  console.warn('[chatbotAPI] Warning:', message, items);
  return undefined;
}

/**
 * Show an error message
 */
export async function showErrorMessage(message: string, ...items: string[]): Promise<string | undefined> {
  // TODO: Implement message dialog
  console.error('[chatbotAPI] Error:', message, items);
  return undefined;
}

// ============================================================================
// Workspace API
// ============================================================================

/**
 * Read a file from the workspace
 */
export async function readFile(uri: string): Promise<Uint8Array> {
  try {
    const content = await invoke<string>('get_file_content', { path: uri });
    return new TextEncoder().encode(content);
  } catch (error) {
    console.error('[chatbotAPI] Error reading file:', error);
    throw error;
  }
}

/**
 * Write a file to the workspace
 */
export async function writeFile(uri: string, content: Uint8Array): Promise<void> {
  try {
    const text = new TextDecoder().decode(content);
    await invoke('save_file_content', { path: uri, content: text });
  } catch (error) {
    console.error('[chatbotAPI] Error writing file:', error);
    throw error;
  }
}

/**
 * Delete a file from the workspace
 */
export async function deleteFile(uri: string): Promise<void> {
  try {
    await invoke('delete_file', { path: uri });
  } catch (error) {
    console.error('[chatbotAPI] Error deleting file:', error);
    throw error;
  }
}

/**
 * Create a directory in the workspace
 */
export async function createDirectory(uri: string): Promise<void> {
  try {
    await invoke('create_directory', { path: uri });
  } catch (error) {
    console.error('[chatbotAPI] Error creating directory:', error);
    throw error;
  }
}

/**
 * Get workspace folder
 */
export function getWorkspaceFolder(): string | undefined {
  // Access the store state directly (not in a React component)
  const state = ideActions.getState();
  return state.workspace?.path;
}

/**
 * Apply a workspace edit
 */
export async function applyEdit(edit: WorkspaceEdit): Promise<boolean> {
  try {
    // This will be used by the diff preview system
    // For now, just log it
    console.log('[chatbotAPI] Applying workspace edit:', edit);
    return true;
  } catch (error) {
    console.error('[chatbotAPI] Error applying edit:', error);
    return false;
  }
}

// ============================================================================
// Editor API
// ============================================================================

/**
 * Get the active text editor's content
 */
export function getActiveTextEditorContent(): string | undefined {
  const editor = editorActions.getCurrentEditor();
  if (!editor) return undefined;

  const model = editor.getModel();
  return model?.getValue();
}

/**
 * Get the active text editor's selection
 */
export function getActiveSelection(): Range | undefined {
  const editor = editorActions.getCurrentEditor();
  if (!editor) return undefined;

  const selection = editor.getSelection();
  if (!selection) return undefined;

  return {
    start: {
      line: selection.startLineNumber - 1, // Convert to 0-based
      character: selection.startColumn - 1,
    },
    end: {
      line: selection.endLineNumber - 1,
      character: selection.endColumn - 1,
    },
  };
}

/**
 * Insert text at the current cursor position
 */
export function insertText(text: string): void {
  const editor = editorActions.getCurrentEditor();
  if (!editor) return;

  const position = editor.getPosition();
  if (!position) return;

  editor.executeEdits('chatbot-extension', [
    {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      text,
    },
  ]);
}

/**
 * Replace text in a range
 */
export function replaceRange(range: Range, text: string): void {
  const editor = editorActions.getCurrentEditor();
  if (!editor) return;

  editor.executeEdits('chatbot-extension', [
    {
      range: new monaco.Range(
        range.start.line + 1, // Convert to 1-based
        range.start.character + 1,
        range.end.line + 1,
        range.end.character + 1
      ),
      text,
    },
  ]);
}

/**
 * Replace the entire editor content
 */
export function replaceAllContent(text: string): void {
  const editor = editorActions.getCurrentEditor();
  if (!editor) return;

  const model = editor.getModel();
  if (!model) return;

  const fullRange = model.getFullModelRange();
  editor.executeEdits('chatbot-extension', [
    {
      range: fullRange,
      text,
    },
  ]);
}

/**
 * Get current cursor position
 */
export function getCursorPosition(): Position | undefined {
  const editor = editorActions.getCurrentEditor();
  if (!editor) return undefined;

  const position = editor.getPosition();
  if (!position) return undefined;

  return {
    line: position.lineNumber - 1, // Convert to 0-based
    character: position.column - 1,
  };
}

/**
 * Set cursor position
 */
export function setCursorPosition(position: Position): void {
  const editor = editorActions.getCurrentEditor();
  if (!editor) return;

  editor.setPosition({
    lineNumber: position.line + 1, // Convert to 1-based
    column: position.character + 1,
  });
  editor.revealLineInCenter(position.line + 1);
}

// ============================================================================
// Diff Preview API (Killer Feature!)
// ============================================================================

/**
 * Options for showing a diff
 */
export interface ShowDiffOptions {
  /** File URI */
  uri: string;

  /** Original content */
  originalContent: string;

  /** Modified content */
  modifiedContent: string;

  /** Title for the diff */
  title?: string;

  /** Description of the change */
  description?: string;

  /** Whether to show side-by-side or inline */
  viewMode?: 'split' | 'inline';

  /** Callback when diff is accepted */
  onAccept?: () => void;

  /** Callback when diff is rejected */
  onReject?: () => void;
}

/**
 * Options for streaming diff updates
 */
export interface StreamingDiffOptions {
  /** File URI */
  uri: string;

  /** Original content */
  originalContent: string;

  /** Title for the diff */
  title?: string;

  /** Description of the change */
  description?: string;

  /** Callback for each chunk of modified content */
  onChunk?: (chunk: string) => void;

  /** Callback when streaming completes */
  onComplete?: (finalContent: string) => void;

  /** Callback when streaming errors */
  onError?: (error: Error) => void;

  /** Callback when diff is accepted */
  onAccept?: () => void;

  /** Callback when diff is rejected */
  onReject?: () => void;
}

/**
 * Show a diff preview for a single file
 */
export function showDiff(options: ShowDiffOptions): string {
  const diffSetId = diffActions.createDiffSet({
    title: options.title || `Diff: ${getFileNameFromUri(options.uri)}`,
    viewMode: options.viewMode || 'split',
  });

  diffActions.addFileDiff(diffSetId, {
    uri: options.uri,
    originalContent: options.originalContent,
    modifiedContent: options.modifiedContent,
    changes: [], // Could compute granular changes if needed
    isStreaming: false,
    metadata: {
      description: options.description,
    },
  });

  return diffSetId;
}

/**
 * Show a diff preview with streaming updates (KILLER FEATURE!)
 *
 * This allows chatbots to show code changes in real-time as they generate.
 *
 * @example
 * ```ts
 * const stream = showStreamingDiff({
 *   uri: '/path/to/file.ts',
 *   originalContent: currentContent,
 *   title: 'AI Code Generation',
 *   onChunk: (chunk) => {
 *     console.log('Received chunk:', chunk);
 *   },
 *   onComplete: (finalContent) => {
 *     console.log('Streaming complete!');
 *   },
 * });
 *
 * // Stream content
 * stream.update('partial content...');
 * stream.update('more content...');
 * stream.complete('final complete content');
 * ```
 */
export function showStreamingDiff(options: StreamingDiffOptions): {
  diffSetId: string;
  update: (content: string) => void;
  complete: (finalContent: string) => void;
  error: (error: Error) => void;
  cancel: () => void;
} {
  const diffSetId = diffActions.createDiffSet({
    title: options.title || `Streaming Diff: ${getFileNameFromUri(options.uri)}`,
    viewMode: 'split',
  });

  diffActions.addFileDiff(diffSetId, {
    uri: options.uri,
    originalContent: options.originalContent,
    modifiedContent: '', // Will be updated as we stream
    changes: [],
    isStreaming: true,
    metadata: {
      description: options.description,
    },
  });

  return {
    diffSetId,

    /**
     * Update the diff with new content
     */
    update(content: string) {
      diffActions.updateFileDiff(diffSetId, options.uri, {
        modifiedContent: content,
        isStreaming: true,
      });

      options.onChunk?.(content);
    },

    /**
     * Mark streaming as complete
     */
    complete(finalContent: string) {
      diffActions.updateFileDiff(diffSetId, options.uri, {
        modifiedContent: finalContent,
        isStreaming: false,
      });

      options.onComplete?.(finalContent);
    },

    /**
     * Handle streaming error
     */
    error(error: Error) {
      diffActions.updateFileDiff(diffSetId, options.uri, {
        isStreaming: false,
      });

      options.onError?.(error);
    },

    /**
     * Cancel streaming
     */
    cancel() {
      diffActions.closeDiffSet(diffSetId);
    },
  };
}

/**
 * Show multiple diffs at once
 */
export function showDiffSet(diffs: ShowDiffOptions[], title?: string): string {
  const diffSetId = diffActions.createDiffSet({
    title: title || 'Multiple File Changes',
    viewMode: 'split',
  });

  for (const diff of diffs) {
    diffActions.addFileDiff(diffSetId, {
      uri: diff.uri,
      originalContent: diff.originalContent,
      modifiedContent: diff.modifiedContent,
      changes: [],
      isStreaming: false,
      metadata: {
        description: diff.description,
      },
    });
  }

  return diffSetId;
}

/**
 * Close a diff set
 */
export function closeDiff(diffSetId: string): void {
  diffActions.closeDiffSet(diffSetId);
}

/**
 * Accept a diff (apply changes)
 */
export async function acceptDiff(diffSetId: string, uri?: string): Promise<void> {
  if (uri) {
    await diffActions.acceptFileDiff(diffSetId, uri);
  } else {
    await diffActions.acceptAllDiffs(diffSetId);
  }
}

/**
 * Reject a diff (discard changes)
 */
export function rejectDiff(diffSetId: string, uri?: string): void {
  if (uri) {
    diffActions.rejectFileDiff(diffSetId, uri);
  } else {
    diffActions.rejectAllDiffs(diffSetId);
  }
}

/**
 * Helper: Get filename from URI
 */
function getFileNameFromUri(uri: string): string {
  return uri.split('/').pop() || uri;
}

// ============================================================================
// Exports
// ============================================================================

export const chatbotAPI = {
  // Window API
  registerWebviewViewProvider,
  showTextDocument,
  showInformationMessage,
  showWarningMessage,
  showErrorMessage,

  // Workspace API
  readFile,
  writeFile,
  deleteFile,
  createDirectory,
  getWorkspaceFolder,
  applyEdit,

  // Editor API
  getActiveTextEditorContent,
  getActiveSelection,
  insertText,
  replaceRange,
  replaceAllContent,
  getCursorPosition,
  setCursorPosition,

  // Diff Preview API (Killer Feature!)
  showDiff,
  showStreamingDiff,
  showDiffSet,
  closeDiff,
  acceptDiff,
  rejectDiff,
};
