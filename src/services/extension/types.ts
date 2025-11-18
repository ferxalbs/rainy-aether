/**
 * Extension Runtime Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the extension
 * code execution system (Phase 2 of Extension System Implementation).
 */

// ============================================================================
// Message Passing Protocol
// ============================================================================

/**
 * Message types for communication between host and extension worker
 */
export enum ExtensionMessageType {
  // Lifecycle
  Initialize = 'initialize',
  Activate = 'activate',
  Deactivate = 'deactivate',

  // API Calls
  APICall = 'api_call',
  APIResponse = 'api_response',

  // Webview
  ResolveWebview = 'resolve_webview',
  WebviewResolved = 'webview_resolved',
  WebviewMessage = 'webview_message',

  // Module System
  LoadModule = 'load_module',
  ModuleLoaded = 'module_loaded',

  // Events
  Event = 'event',

  // Error Handling
  Error = 'error',

  // Logging
  Log = 'log',
}

/**
 * Base message structure
 */
export interface ExtensionMessage {
  type: ExtensionMessageType;
  id?: string; // Request ID for request/response pattern
  data: any;
}

/**
 * Initialize message data
 */
export interface InitializeMessageData {
  extensionId: string;
  extensionPath: string;
  manifest: any;
  storagePath: string;
  globalStoragePath: string;
  isTauriEnvironment: boolean; // Indicates if running in Tauri context
}

/**
 * Activate message data
 */
export interface ActivateMessageData {
  activationEvent: string;
}

/**
 * API call message data
 */
export interface APICallMessageData {
  namespace: string; // e.g., 'window', 'workspace'
  method: string;    // e.g., 'showInformationMessage'
  args: any[];
}

/**
 * API response message data
 */
export interface APIResponseMessageData {
  success: boolean;
  result?: any;
  error?: string;
}

// ============================================================================
// Extension Context
// ============================================================================

/**
 * Extension context provided to extension on activation
 */
export interface IExtensionContext {
  /**
   * Unique identifier for the extension
   */
  extensionId: string;

  /**
   * Extension path on disk
   */
  extensionPath: string;

  /**
   * Extension URI
   */
  extensionUri: string;

  /**
   * Storage path for this extension
   */
  storagePath: string;

  /**
   * Global storage path shared across workspaces
   */
  globalStoragePath: string;

  /**
   * Subscriptions that will be disposed when extension is deactivated
   */
  subscriptions: IDisposable[];

  /**
   * Workspace state (key-value storage)
   */
  workspaceState: IMemento;

  /**
   * Global state (key-value storage across workspaces)
   */
  globalState: IMemento;

  /**
   * Log output channel
   */
  logPath: string;
}

/**
 * Disposable pattern
 */
export interface IDisposable {
  dispose(): void;
}

/**
 * Memento interface for state storage
 */
export interface IMemento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Promise<void>;
  keys(): readonly string[];
}

// ============================================================================
// Module System
// ============================================================================

/**
 * Module metadata
 */
export interface ModuleInfo {
  id: string;
  filename: string;
  loaded: boolean;
  exports: any;
  children: ModuleInfo[];
  parent: ModuleInfo | null;
  require: (id: string) => any;
}

/**
 * Module cache entry
 */
export interface ModuleCacheEntry {
  module: ModuleInfo;
  code: string;
  exports: any;
}

/**
 * Module loader configuration
 */
export interface ModuleLoaderConfig {
  extensionPath: string;
  mainModulePath: string;
}

// ============================================================================
// VS Code API Shims
// ============================================================================

/**
 * VS Code namespace structure
 */
export interface VSCodeAPI {
  version: string;

  // Namespaces
  commands: any;
  window: VSCodeWindow;
  workspace: VSCodeWorkspace;
  languages: any;
  debug: any;
  scm: any;
  tasks: any;

  // Classes
  Uri: typeof VSCodeUri;
  Range: any;
  Position: any;
  Selection: any;
  Disposable: typeof Disposable;
  EventEmitter: any;

  // Enums
  DiagnosticSeverity: any;
  CompletionItemKind: any;
  SymbolKind: any;
  TextEditorRevealType: any;
}

/**
 * VS Code window namespace
 */
export interface VSCodeWindow {
  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showQuickPick(items: string[], options?: any): Promise<string | undefined>;
  showInputBox(options?: any): Promise<string | undefined>;
  createOutputChannel(name: string): any;
  registerWebviewViewProvider(viewId: string, provider: any, options?: any): IDisposable;
  activeTextEditor: any;
  visibleTextEditors: any[];
  onDidChangeActiveTextEditor: any;
  onDidChangeVisibleTextEditors: any;
  onDidChangeTextEditorSelection: any;
  onDidChangeTextEditorVisibleRanges: any;
}

/**
 * VS Code workspace namespace
 */
export interface VSCodeWorkspace {
  workspaceFolders: any[] | undefined;
  rootPath: string | undefined;
  name: string | undefined;

  fs: VSCodeFileSystem;

  getConfiguration(section?: string): any;
  onDidChangeConfiguration: any;
  onDidOpenTextDocument: any;
  onDidCloseTextDocument: any;
  onDidChangeTextDocument: any;
  onDidSaveTextDocument: any;

  openTextDocument(uri: any): Promise<any>;
  applyEdit(edit: any): Promise<boolean>;
}

/**
 * VS Code file system API
 */
export interface VSCodeFileSystem {
  readFile(uri: any): Promise<Uint8Array>;
  writeFile(uri: any, content: Uint8Array): Promise<void>;
  delete(uri: any, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void>;
  rename(source: any, target: any, options?: { overwrite?: boolean }): Promise<void>;
  copy(source: any, target: any, options?: { overwrite?: boolean }): Promise<void>;
  createDirectory(uri: any): Promise<void>;
  readDirectory(uri: any): Promise<[string, number][]>;
  stat(uri: any): Promise<any>;
}

/**
 * VS Code Uri class
 */
export class VSCodeUri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;

  constructor(
    scheme: string,
    authority: string,
    path: string,
    query: string,
    fragment: string
  ) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
    this.fsPath = path;
  }

  static file(path: string): VSCodeUri {
    return new VSCodeUri('file', '', path, '', '');
  }

  static parse(value: string): VSCodeUri {
    const match = value.match(/^(\w+):\/\/([^/]*)([^?#]*)\??([^#]*)#?(.*)$/);
    if (!match) {
      throw new Error(`Invalid URI: ${value}`);
    }
    return new VSCodeUri(match[1], match[2], match[3], match[4], match[5]);
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}${this.query ? '?' + this.query : ''}${this.fragment ? '#' + this.fragment : ''}`;
  }

  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): VSCodeUri {
    return new VSCodeUri(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment
    );
  }
}

/**
 * Disposable class
 */
export class Disposable implements IDisposable {
  private _callOnDispose?: () => void;

  constructor(callOnDispose: () => void) {
    this._callOnDispose = callOnDispose;
  }

  static from(...disposables: IDisposable[]): IDisposable {
    return new Disposable(() => {
      disposables.forEach(d => d.dispose());
    });
  }

  dispose(): void {
    if (this._callOnDispose) {
      this._callOnDispose();
      this._callOnDispose = undefined;
    }
  }
}

// ============================================================================
// Activation System
// ============================================================================

/**
 * Activation event types
 */
export enum ActivationEventType {
  // Always activate
  Star = '*',

  // Workspace-based
  WorkspaceContains = 'workspaceContains',

  // Language-based
  OnLanguage = 'onLanguage',

  // Command-based
  OnCommand = 'onCommand',

  // Debug-based
  OnDebug = 'onDebug',
  OnDebugResolve = 'onDebugResolve',
  OnDebugInitialConfigurations = 'onDebugInitialConfigurations',

  // View-based
  OnView = 'onView',

  // URI-based
  OnUri = 'onUri',

  // File system-based
  OnFileSystem = 'onFileSystem',

  // Authentication-based
  OnAuthenticationRequest = 'onAuthenticationRequest',

  // Custom
  OnCustomEditor = 'onCustomEditor',
  OnWebviewPanel = 'onWebviewPanel',
  OnStartupFinished = 'onStartupFinished',
}

/**
 * Parsed activation event
 */
export interface ParsedActivationEvent {
  type: ActivationEventType | string;
  value?: string;
  raw: string;
}

/**
 * Extension activation state
 */
export enum ExtensionActivationState {
  NotActivated = 'not_activated',
  Activating = 'activating',
  Activated = 'activated',
  Failed = 'failed',
  Deactivated = 'deactivated',
}

/**
 * Extension runtime state
 */
export interface ExtensionRuntimeState {
  extensionId: string;
  activationState: ExtensionActivationState;
  activationEvents: ParsedActivationEvent[];
  worker: Worker | null;
  context: IExtensionContext | null;
  error?: string;
  activatedAt?: number;
  deactivatedAt?: number;
}

// ============================================================================
// Sandbox Configuration
// ============================================================================

/**
 * Extension sandbox configuration
 */
export interface ExtensionSandboxConfig {
  /**
   * Extension ID
   */
  extensionId: string;

  /**
   * Extension path on disk
   */
  extensionPath: string;

  /**
   * Extension manifest
   */
  manifest: any;

  /**
   * Timeout for activation (ms)
   */
  activationTimeout?: number;

  /**
   * Memory limit (MB)
   */
  memoryLimit?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Extension error types
 */
export enum ExtensionErrorType {
  ActivationFailed = 'activation_failed',
  ModuleLoadFailed = 'module_load_failed',
  APICallFailed = 'api_call_failed',
  RuntimeError = 'runtime_error',
  Timeout = 'timeout',
  SandboxError = 'sandbox_error',
  Unknown = 'unknown',
}

/**
 * Extension error
 */
export interface ExtensionError {
  type: ExtensionErrorType;
  message: string;
  stack?: string;
  extensionId: string;
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  // Keep TypeScript happy with re-exports
};
