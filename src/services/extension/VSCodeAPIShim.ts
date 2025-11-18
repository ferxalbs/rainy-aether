/**
 * VS Code API Shim
 *
 * Provides a minimal implementation of the VS Code Extension API.
 * This allows extensions to run in our environment by providing compatible
 * API interfaces, even if some features are simplified or not fully supported.
 */

import {
  VSCodeAPI,
  VSCodeWindow,
  VSCodeWorkspace,
  VSCodeFileSystem,
  VSCodeUri,
  Disposable,
  IExtensionContext,
} from './types';

/**
 * Message callback for API calls to the host
 */
type APICallCallback = (namespace: string, method: string, args: any[]) => Promise<any>;

/**
 * Thenable - represents a value that can be synchronous or asynchronous
 */
type Thenable<T> = T | Promise<T>;

/**
 * WebviewViewProvider interface
 * Extensions should implement this to provide webview content
 */
export interface WebviewViewProvider {
  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): void | Thenable<void>;
}

/**
 * WebviewView interface
 */
export interface WebviewView {
  readonly viewType: string;
  readonly webview: Webview;
  title?: string;
  description?: string;
  readonly visible: boolean;
  readonly onDidDispose: any;
  readonly onDidChangeVisibility: any;
  show(preserveFocus?: boolean): void;
}

/**
 * Webview interface
 */
export interface Webview {
  html: string;
  options: WebviewOptions;
  readonly onDidReceiveMessage: any;
  postMessage(message: any): Thenable<boolean>;
  asWebviewUri?(localResource: VSCodeUri): VSCodeUri;
  readonly cspSource?: string;
}

/**
 * WebviewOptions interface
 */
export interface WebviewOptions {
  enableScripts?: boolean;
  enableForms?: boolean;
  localResourceRoots?: readonly VSCodeUri[];
  portMapping?: readonly WebviewPortMapping[];
}

/**
 * WebviewPortMapping interface
 */
export interface WebviewPortMapping {
  webviewPort: number;
  extensionHostPort: number;
}

/**
 * WebviewViewResolveContext interface
 */
export interface WebviewViewResolveContext {
  readonly state: any;
}

/**
 * CancellationToken interface
 */
export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly onCancellationRequested: any;
}

/**
 * Create VS Code API shim
 */
export function createVSCodeAPI(
  _context: IExtensionContext,
  apiCall: APICallCallback
): VSCodeAPI {
  // Create window namespace
  const window = createWindowAPI(apiCall);

  // Create workspace namespace
  const workspace = createWorkspaceAPI(apiCall);

  // Create languages namespace (placeholder)
  const languages = createLanguagesAPI(apiCall);

  // Create commands namespace (placeholder)
  const commands = createCommandsAPI(apiCall);

  // Create API object
  const vscode: VSCodeAPI = {
    version: '1.75.0', // Simulated VS Code version

    // Namespaces
    commands,
    window,
    workspace,
    languages,
    debug: {}, // Placeholder
    scm: {}, // Placeholder
    tasks: {}, // Placeholder

    // Classes
    Uri: VSCodeUri,
    Range: createRangeClass(),
    Position: createPositionClass(),
    Selection: createSelectionClass(),
    Disposable,
    EventEmitter: createEventEmitterClass(),
    TreeItem: createTreeItemClass(),
    TreeDataProvider: createTreeDataProviderClass(),
    CancellationTokenSource: createCancellationTokenSourceClass(),
    MarkdownString: createMarkdownStringClass(),
    ThemeIcon: createThemeIconClass(),
    ThemeColor: createThemeColorClass(),
    StatusBarItem: createStatusBarItemClass(),
    QuickPickItem: createQuickPickItemClass(),
    CodeLens: createCodeLensClass(),
    Command: createCommandClass(),
    Diagnostic: createDiagnosticClass(),
    DiagnosticCollection: createDiagnosticCollectionClass(),
    Location: createLocationClass(),
    WorkspaceEdit: createWorkspaceEditClass(),
    TextEdit: createTextEditClass(),
    WebviewPanel: createWebviewPanelClass(),
    SnippetString: createSnippetStringClass(),
    ParameterInformation: createParameterInformationClass(),
    SignatureInformation: createSignatureInformationClass(),
    SignatureHelp: createSignatureHelpClass(),
    CompletionItem: createCompletionItemClass(),
    CompletionList: createCompletionListClass(),
    Hover: createHoverClass(),
    DocumentLink: createDocumentLinkClass(),
    Color: createColorClass(),
    ColorInformation: createColorInformationClass(),
    ColorPresentation: createColorPresentationClass(),
    FoldingRange: createFoldingRangeClass(),
    SelectionRange: createSelectionRangeClass(),
    CallHierarchyItem: createCallHierarchyItemClass(),
    SemanticTokensLegend: createSemanticTokensLegendClass(),
    SemanticTokensBuilder: createSemanticTokensBuilderClass(),

    // Enums
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    },
    CompletionItemKind: {
      Text: 0,
      Method: 1,
      Function: 2,
      Constructor: 3,
      Field: 4,
      Variable: 5,
      Class: 6,
      Interface: 7,
      Module: 8,
      Property: 9,
      Unit: 10,
      Value: 11,
      Enum: 12,
      Keyword: 13,
      Snippet: 14,
      Color: 15,
      File: 16,
      Reference: 17,
      Folder: 18,
    },
    SymbolKind: {
      File: 0,
      Module: 1,
      Namespace: 2,
      Package: 3,
      Class: 4,
      Method: 5,
      Property: 6,
      Field: 7,
      Constructor: 8,
      Enum: 9,
      Interface: 10,
      Function: 11,
      Variable: 12,
      Constant: 13,
      String: 14,
      Number: 15,
      Boolean: 16,
      Array: 17,
    },
    SymbolTag: {
      Deprecated: 1,
    },
    TextEditorRevealType: {
      Default: 0,
      InCenter: 1,
      InCenterIfOutsideViewport: 2,
      AtTop: 3,
    },
    TreeItemCollapsibleState: {
      None: 0,
      Collapsed: 1,
      Expanded: 2,
    },
    OverviewRulerLane: {
      Left: 1,
      Center: 2,
      Right: 4,
      Full: 7,
    },
    DecorationRangeBehavior: {
      OpenOpen: 0,
      ClosedClosed: 1,
      OpenClosed: 2,
      ClosedOpen: 3,
    },
    ViewColumn: {
      Active: -1,
      Beside: -2,
      One: 1,
      Two: 2,
      Three: 3,
      Four: 4,
      Five: 5,
      Six: 6,
      Seven: 7,
      Eight: 8,
      Nine: 9,
    },
    ProgressLocation: {
      SourceControl: 1,
      Window: 10,
      Notification: 15,
    },
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
      WorkspaceFolder: 3,
    },
    FileType: {
      Unknown: 0,
      File: 1,
      Directory: 2,
      SymbolicLink: 64,
    },
    ExtensionMode: {
      Production: 1,
      Development: 2,
      Test: 3,
    },
    UIKind: {
      Desktop: 1,
      Web: 2,
    },
    ExtensionKind: {
      UI: 1,
      Workspace: 2,
    },
    ColorThemeKind: {
      Light: 1,
      Dark: 2,
      HighContrast: 3,
      HighContrastLight: 4,
    },
    StatusBarAlignment: {
      Left: 1,
      Right: 2,
    },
    EndOfLine: {
      LF: 1,
      CRLF: 2,
    },
    TextDocumentSaveReason: {
      Manual: 1,
      AfterDelay: 2,
      FocusOut: 3,
    },
    QuickPickItemKind: {
      Separator: -1,
      Default: 0,
    },
    FoldingRangeKind: {
      Comment: 1,
      Imports: 2,
      Region: 3,
    },
    SignatureHelpTriggerKind: {
      Invoke: 1,
      TriggerCharacter: 2,
      ContentChange: 3,
    },
    CompletionTriggerKind: {
      Invoke: 0,
      TriggerCharacter: 1,
      TriggerForIncompleteCompletions: 2,
    },
    InsertTextFormat: {
      PlainText: 1,
      Snippet: 2,
    },
    DocumentHighlightKind: {
      Text: 0,
      Read: 1,
      Write: 2,
    },
    SymbolType: {
      File: 0,
      Module: 1,
      Namespace: 2,
      Package: 3,
      Class: 4,
      Method: 5,
      Property: 6,
      Field: 7,
      Constructor: 8,
      Enum: 9,
      Interface: 10,
      Function: 11,
      Variable: 12,
      Constant: 13,
      String: 14,
      Number: 15,
      Boolean: 16,
      Array: 17,
      Object: 18,
      Key: 19,
      Null: 20,
      EnumMember: 21,
      Struct: 22,
      Event: 23,
      Operator: 24,
      TypeParameter: 25,
    },
  };

  return vscode;
}

/**
 * Create window namespace API
 */
function createWindowAPI(apiCall: APICallCallback): VSCodeWindow {
  return {
    async showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
      return await apiCall('window', 'showInformationMessage', [message, ...items]);
    },

    async showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
      return await apiCall('window', 'showWarningMessage', [message, ...items]);
    },

    async showErrorMessage(message: string, ...items: string[]): Promise<string | undefined> {
      return await apiCall('window', 'showErrorMessage', [message, ...items]);
    },

    async showQuickPick(items: string[], options?: any): Promise<string | undefined> {
      return await apiCall('window', 'showQuickPick', [items, options]);
    },

    async showInputBox(options?: any): Promise<string | undefined> {
      return await apiCall('window', 'showInputBox', [options]);
    },

    createOutputChannel(name: string): any {
      // Return a minimal output channel
      return {
        name,
        append: (value: string) => {
          console.log(`[Output:${name}]`, value);
        },
        appendLine: (value: string) => {
          console.log(`[Output:${name}]`, value);
        },
        clear: () => {
          // No-op
        },
        show: () => {
          // No-op
        },
        hide: () => {
          // No-op
        },
        dispose: () => {
          // No-op
        },
      };
    },

    activeTextEditor: undefined,
    visibleTextEditors: [],

    onDidChangeActiveTextEditor: createEvent(),
    onDidChangeVisibleTextEditors: createEvent(),
    onDidChangeTextEditorSelection: createEvent(),
    onDidChangeTextEditorVisibleRanges: createEvent(),

    /**
     * Create a webview panel
     */
    createWebviewPanel(
      viewType: string,
      title: string,
      showOptions: any,
      options?: any
    ): any {
      const WebviewPanelClass = createWebviewPanelClass();
      const viewColumn = typeof showOptions === 'number' ? showOptions : (showOptions?.viewColumn ?? 1);
      return new WebviewPanelClass(viewType, title, viewColumn, options || {});
    },

    /**
     * Register a webview view provider
     * This is called by extensions like Cline to provide their UI
     */
    registerWebviewViewProvider(viewId: string, provider: any, options?: any): Disposable {
      // Store provider in worker-level storage (defined in extension.worker.ts)
      // Access the global storage that persists across worker messages
      const workerGlobal = self as any;
      if (!workerGlobal.__rainyAether_webviewProviders) {
        workerGlobal.__rainyAether_webviewProviders = new Map();
      }
      workerGlobal.__rainyAether_webviewProviders.set(viewId, provider);

      console.log(`[VSCodeAPI] Registered webview provider for: ${viewId}`);

      // Notify host that we have a provider ready
      apiCall('window', 'registerWebviewViewProvider', [viewId, options]).catch((error) => {
        console.error(`[VSCodeAPI] Failed to register webview view provider for ${viewId}:`, error);
      });

      // Return disposable
      return new Disposable(() => {
        workerGlobal.__rainyAether_webviewProviders?.delete(viewId);
        apiCall('window', 'disposeWebviewViewProvider', [viewId]).catch(() => {
          // Ignore errors on disposal
        });
      });
    },
  };
}

/**
 * Create workspace namespace API
 */
function createWorkspaceAPI(apiCall: APICallCallback): VSCodeWorkspace {
  return {
    workspaceFolders: undefined,
    rootPath: undefined,
    name: undefined,

    fs: createFileSystemAPI(apiCall),

    getConfiguration(_section?: string): any {
      // Return a minimal configuration object
      return {
        get: (_key: string, defaultValue?: any) => defaultValue,
        has: (_key: string) => false,
        inspect: (_key: string) => undefined,
        update: async (_key: string, _value: any) => {
          // No-op
        },
      };
    },

    onDidChangeConfiguration: createEvent(),
    onDidOpenTextDocument: createEvent(),
    onDidCloseTextDocument: createEvent(),
    onDidChangeTextDocument: createEvent(),
    onDidSaveTextDocument: createEvent(),

    async openTextDocument(uri: any): Promise<any> {
      return await apiCall('workspace', 'openTextDocument', [uri]);
    },

    async applyEdit(edit: any): Promise<boolean> {
      return await apiCall('workspace', 'applyEdit', [edit]);
    },
  };
}

/**
 * Create file system API
 */
function createFileSystemAPI(apiCall: APICallCallback): VSCodeFileSystem {
  return {
    async readFile(uri: any): Promise<Uint8Array> {
      const result = await apiCall('workspace.fs', 'readFile', [uri]);
      return new Uint8Array(result);
    },

    async writeFile(uri: any, content: Uint8Array): Promise<void> {
      await apiCall('workspace.fs', 'writeFile', [uri, Array.from(content)]);
    },

    async delete(uri: any, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void> {
      await apiCall('workspace.fs', 'delete', [uri, options]);
    },

    async rename(source: any, target: any, options?: { overwrite?: boolean }): Promise<void> {
      await apiCall('workspace.fs', 'rename', [source, target, options]);
    },

    async copy(source: any, target: any, options?: { overwrite?: boolean }): Promise<void> {
      await apiCall('workspace.fs', 'copy', [source, target, options]);
    },

    async createDirectory(uri: any): Promise<void> {
      await apiCall('workspace.fs', 'createDirectory', [uri]);
    },

    async readDirectory(uri: any): Promise<[string, number][]> {
      return await apiCall('workspace.fs', 'readDirectory', [uri]);
    },

    async stat(uri: any): Promise<any> {
      return await apiCall('workspace.fs', 'stat', [uri]);
    },
  };
}

/**
 * Create languages namespace API (placeholder)
 */
function createLanguagesAPI(_apiCall: APICallCallback): any {
  return {
    registerCompletionItemProvider: () => {
      return { dispose: () => {} };
    },
    registerHoverProvider: () => {
      return { dispose: () => {} };
    },
    registerDefinitionProvider: () => {
      return { dispose: () => {} };
    },
    registerReferenceProvider: () => {
      return { dispose: () => {} };
    },
    registerDocumentFormattingEditProvider: () => {
      return { dispose: () => {} };
    },
    registerCodeActionsProvider: () => {
      return { dispose: () => {} };
    },
  };
}

/**
 * Create commands namespace API (placeholder)
 */
function createCommandsAPI(apiCall: APICallCallback): any {
  const commands = new Map<string, Function>();

  return {
    registerCommand: (command: string, callback: Function) => {
      commands.set(command, callback);
      return { dispose: () => commands.delete(command) };
    },

    executeCommand: async (command: string, ...args: any[]) => {
      const handler = commands.get(command);
      if (handler) {
        return await handler(...args);
      }
      return await apiCall('commands', 'executeCommand', [command, ...args]);
    },

    getCommands: async (_filterInternal?: boolean) => {
      return Array.from(commands.keys());
    },
  };
}

/**
 * Create event helper
 */
function createEvent(): any {
  const listeners: Function[] = [];
  const disposedListeners = new WeakSet<Function>();

  const event = (listener: Function) => {
    listeners.push(listener);
    let isDisposed = false;

    return {
      dispose: () => {
        if (isDisposed) {
          console.warn('[VSCodeAPI] Event listener already disposed');
          return;
        }
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
        disposedListeners.add(listener);
        isDisposed = true;
      },
    };
  };

  event.fire = (...args: any[]) => {
    // Create a copy to avoid issues if listeners dispose themselves during iteration
    const listenersCopy = [...listeners];
    listenersCopy.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('[VSCodeAPI] Event listener error:', error);
      }
    });
  };

  // Add a method to clear all listeners (for cleanup)
  event.clear = () => {
    listeners.length = 0;
  };

  return event;
}

/**
 * Create Position class
 */
function createPositionClass() {
  return class Position {
    line: number;
    character: number;

    constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }

    isBefore(other: Position): boolean {
      return this.line < other.line || (this.line === other.line && this.character < other.character);
    }

    isBeforeOrEqual(other: Position): boolean {
      return this.line < other.line || (this.line === other.line && this.character <= other.character);
    }

    isAfter(other: Position): boolean {
      return this.line > other.line || (this.line === other.line && this.character > other.character);
    }

    isAfterOrEqual(other: Position): boolean {
      return this.line > other.line || (this.line === other.line && this.character >= other.character);
    }

    isEqual(other: Position): boolean {
      return this.line === other.line && this.character === other.character;
    }

    compareTo(other: Position): number {
      if (this.line < other.line) return -1;
      if (this.line > other.line) return 1;
      if (this.character < other.character) return -1;
      if (this.character > other.character) return 1;
      return 0;
    }

    translate(lineDelta?: number, characterDelta?: number): Position {
      return new Position(
        this.line + (lineDelta || 0),
        this.character + (characterDelta || 0)
      );
    }

    with(line?: number, character?: number): Position {
      return new Position(line ?? this.line, character ?? this.character);
    }
  };
}

/**
 * Create Range class
 */
function createRangeClass() {
  const PositionClass = createPositionClass();

  return class Range {
    start: any;
    end: any;

    constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
    constructor(start: any, end: any);
    constructor(
      startOrStartLine: any,
      endOrStartCharacter?: any,
      endLine?: number,
      endCharacter?: number
    ) {
      if (typeof startOrStartLine === 'number') {
        this.start = new PositionClass(startOrStartLine, endOrStartCharacter);
        this.end = new PositionClass(endLine!, endCharacter!);
      } else {
        this.start = startOrStartLine;
        this.end = endOrStartCharacter;
      }
    }

    isEmpty(): boolean {
      return this.start.isEqual(this.end);
    }

    isSingleLine(): boolean {
      return this.start.line === this.end.line;
    }

    contains(positionOrRange: any): boolean {
      if (positionOrRange instanceof PositionClass) {
        return this.start.isBeforeOrEqual(positionOrRange) && this.end.isAfterOrEqual(positionOrRange);
      } else {
        return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
      }
    }

    isEqual(other: any): boolean {
      return this.start.isEqual(other.start) && this.end.isEqual(other.end);
    }

    intersection(other: any): any | undefined {
      const start = this.start.isAfter(other.start) ? this.start : other.start;
      const end = this.end.isBefore(other.end) ? this.end : other.end;
      if (start.isAfter(end)) {
        return undefined;
      }
      return new Range(start, end);
    }

    union(other: any): any {
      const start = this.start.isBefore(other.start) ? this.start : other.start;
      const end = this.end.isAfter(other.end) ? this.end : other.end;
      return new Range(start, end);
    }

    with(start?: any, end?: any): any {
      return new Range(start ?? this.start, end ?? this.end);
    }
  };
}

/**
 * Create Selection class
 */
function createSelectionClass() {
  const RangeClass = createRangeClass();

  return class Selection extends RangeClass {
    anchor: any;
    active: any;

    constructor(anchorLine: number, anchorCharacter: number, activeLine: number, activeCharacter: number);
    constructor(anchor: any, active: any);
    constructor(
      anchorOrAnchorLine: any,
      activeOrAnchorCharacter?: any,
      activeLine?: number,
      activeCharacter?: number
    ) {
      if (typeof anchorOrAnchorLine === 'number') {
        const PositionClass = createPositionClass();
        const anchor = new PositionClass(anchorOrAnchorLine, activeOrAnchorCharacter);
        const active = new PositionClass(activeLine!, activeCharacter!);
        super(anchor, active);
        this.anchor = anchor;
        this.active = active;
      } else {
        super(anchorOrAnchorLine, activeOrAnchorCharacter);
        this.anchor = anchorOrAnchorLine;
        this.active = activeOrAnchorCharacter;
      }
    }

    isReversed(): boolean {
      return this.anchor.isAfter(this.active);
    }
  };
}

/**
 * Create EventEmitter class
 */
function createEventEmitterClass() {
  return class EventEmitter<T> {
    private listeners: ((e: T) => void)[] = [];

    get event(): any {
      return (listener: (e: T) => void) => {
        this.listeners.push(listener);
        return {
          dispose: () => {
            const index = this.listeners.indexOf(listener);
            if (index !== -1) {
              this.listeners.splice(index, 1);
            }
          },
        };
      };
    }

    fire(data: T): void {
      this.listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('[EventEmitter] Listener error:', error);
        }
      });
    }

    dispose(): void {
      this.listeners = [];
    }
  };
}

/**
 * Create TreeItem class
 */
function createTreeItemClass() {
  return class TreeItem {
    label?: string | any;
    id?: string;
    iconPath?: any;
    description?: string | boolean;
    resourceUri?: any;
    tooltip?: string | any;
    command?: any;
    collapsibleState?: number;
    contextValue?: string;
    accessibilityInformation?: any;

    constructor(label: string | any, collapsibleState?: number);
    constructor(resourceUri: any, collapsibleState?: number);
    constructor(labelOrUri: string | any, collapsibleState?: number) {
      if (typeof labelOrUri === 'string') {
        this.label = labelOrUri;
      } else if (labelOrUri && typeof labelOrUri === 'object' && 'path' in labelOrUri) {
        this.resourceUri = labelOrUri;
      } else {
        this.label = labelOrUri;
      }
      this.collapsibleState = collapsibleState;
    }
  };
}

/**
 * Create CancellationTokenSource class
 */
function createCancellationTokenSourceClass() {
  return class CancellationTokenSource {
    private _token: CancellationToken | undefined = undefined;
    private _isCancelled = false;
    private _emitter: any;

    constructor() {
      const EventEmitterClass = createEventEmitterClass();
      this._emitter = new EventEmitterClass();
    }

    get token(): CancellationToken {
      if (!this._token) {
        this._token = {
          isCancellationRequested: this._isCancelled,
          onCancellationRequested: this._emitter.event,
        };
      }
      return this._token;
    }

    cancel(): void {
      if (!this._isCancelled) {
        this._isCancelled = true;
        if (this._token) {
          (this._token as any).isCancellationRequested = true;
        }
        this._emitter.fire(undefined);
      }
    }

    dispose(): void {
      this.cancel();
      this._emitter.dispose();
    }
  };
}

/**
 * Create MarkdownString class
 */
function createMarkdownStringClass() {
  return class MarkdownString {
    value: string;
    isTrusted?: boolean | { readonly enabledCommands: readonly string[] };
    supportThemeIcons?: boolean;
    supportHtml?: boolean;
    baseUri?: any;

    constructor(value?: string, supportThemeIcons?: boolean) {
      this.value = value || '';
      this.supportThemeIcons = supportThemeIcons;
    }

    appendText(value: string): MarkdownString {
      this.value += value
        .replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&')
        .replace(/\n/g, '\n\n');
      return this;
    }

    appendMarkdown(value: string): MarkdownString {
      this.value += value;
      return this;
    }

    appendCodeblock(value: string, language?: string): MarkdownString {
      this.value += '\n```';
      if (language) {
        this.value += language;
      }
      this.value += '\n' + value + '\n```\n';
      return this;
    }
  };
}

/**
 * Create ThemeIcon class
 */
function createThemeIconClass() {
  return class ThemeIcon {
    readonly id: string;
    readonly color?: any;

    constructor(id: string, color?: any) {
      this.id = id;
      this.color = color;
    }

    static File = new (class ThemeIcon {
      readonly id = 'file';
    })();

    static Folder = new (class ThemeIcon {
      readonly id = 'folder';
    })();
  };
}

/**
 * Create ThemeColor class
 */
function createThemeColorClass() {
  return class ThemeColor {
    readonly id: string;

    constructor(id: string) {
      this.id = id;
    }
  };
}

/**
 * Create TreeDataProvider base class
 * Extensions can extend this or implement the interface
 */
function createTreeDataProviderClass() {
  const EventEmitterClass = createEventEmitterClass();

  return class TreeDataProvider {
    private _onDidChangeTreeData: any;

    constructor() {
      this._onDidChangeTreeData = new EventEmitterClass();
    }

    get onDidChangeTreeData() {
      return this._onDidChangeTreeData.event;
    }

    refresh(): void {
      this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: any): any {
      // Subclasses should override
      return element;
    }

    getChildren(_element?: any): any[] | Promise<any[]> {
      // Subclasses should override
      return [];
    }

    getParent?(_element: any): any | Promise<any> {
      // Optional method
      return null;
    }

    resolveTreeItem?(item: any, _element: any): any | Promise<any> {
      // Optional method
      return item;
    }
  };
}

/**
 * Create StatusBarItem class
 */
function createStatusBarItemClass() {
  return class StatusBarItem {
    id?: string;
    alignment: number = 1;
    priority?: number;
    text: string = '';
    tooltip?: string | any;
    color?: string | any;
    backgroundColor?: any;
    command?: string | any;
    accessibilityInformation?: any;

    show(): void {
      // No-op in our implementation
    }

    hide(): void {
      // No-op in our implementation
    }

    dispose(): void {
      // No-op in our implementation
    }
  };
}

/**
 * Create QuickPickItem class
 */
function createQuickPickItemClass() {
  return class QuickPickItem {
    label: string = '';
    description?: string;
    detail?: string;
    picked?: boolean;
    alwaysShow?: boolean;
    buttons?: readonly any[];
  };
}

/**
 * Create CodeLens class
 */
function createCodeLensClass() {
  const RangeClass = createRangeClass();

  return class CodeLens {
    range: any;
    command?: any;
    isResolved: boolean = false;

    constructor(range: any, command?: any) {
      this.range = range;
      this.command = command;
      this.isResolved = !!command;
    }
  };
}

/**
 * Create Command class/interface
 */
function createCommandClass() {
  return class Command {
    title: string;
    command: string;
    tooltip?: string;
    arguments?: any[];

    constructor(title: string, command: string, ...args: any[]) {
      this.title = title;
      this.command = command;
      this.arguments = args;
    }
  };
}

/**
 * Create Diagnostic class
 */
function createDiagnosticClass() {
  const RangeClass = createRangeClass();

  return class Diagnostic {
    range: any;
    message: string;
    severity: number;
    source?: string;
    code?: string | number | { value: string | number; target: any };
    relatedInformation?: any[];
    tags?: number[];

    constructor(range: any, message: string, severity: number = 0) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  };
}

/**
 * Create DiagnosticCollection class
 */
function createDiagnosticCollectionClass() {
  return class DiagnosticCollection {
    name: string;
    private diagnostics: Map<string, any[]> = new Map();

    constructor(name: string) {
      this.name = name;
    }

    set(uri: any, diagnostics: any[] | undefined): void;
    set(entries: [any, any[] | undefined][]): void;
    set(uriOrEntries: any, diagnostics?: any[]): void {
      if (Array.isArray(uriOrEntries)) {
        // Batch set
        uriOrEntries.forEach(([uri, diags]) => {
          const uriStr = uri.toString();
          if (diags === undefined) {
            this.diagnostics.delete(uriStr);
          } else {
            this.diagnostics.set(uriStr, diags);
          }
        });
      } else {
        // Single set
        const uriStr = uriOrEntries.toString();
        if (diagnostics === undefined) {
          this.diagnostics.delete(uriStr);
        } else {
          this.diagnostics.set(uriStr, diagnostics);
        }
      }
    }

    delete(uri: any): void {
      this.diagnostics.delete(uri.toString());
    }

    clear(): void {
      this.diagnostics.clear();
    }

    forEach(callback: (uri: any, diagnostics: any[], collection: DiagnosticCollection) => void): void {
      this.diagnostics.forEach((diags, uriStr) => {
        const VSCodeUriClass = VSCodeUri;
        callback(VSCodeUriClass.parse(uriStr), diags, this);
      });
    }

    get(uri: any): any[] | undefined {
      return this.diagnostics.get(uri.toString());
    }

    has(uri: any): boolean {
      return this.diagnostics.has(uri.toString());
    }

    dispose(): void {
      this.diagnostics.clear();
    }
  };
}

/**
 * Create Location class
 */
function createLocationClass() {
  const RangeClass = createRangeClass();

  return class Location {
    uri: any;
    range: any;

    constructor(uri: any, rangeOrPosition: any) {
      this.uri = uri;
      if (rangeOrPosition.line !== undefined) {
        // It's a Position, create a range from it
        const PositionClass = createPositionClass();
        this.range = new RangeClass(rangeOrPosition, rangeOrPosition);
      } else {
        // It's already a Range
        this.range = rangeOrPosition;
      }
    }
  };
}

/**
 * Create TextEdit class
 */
function createTextEditClass() {
  const RangeClass = createRangeClass();

  return class TextEdit {
    range: any;
    newText: string;
    newEol?: number;

    constructor(range: any, newText: string) {
      this.range = range;
      this.newText = newText;
    }

    static replace(range: any, newText: string): TextEdit {
      return new TextEdit(range, newText);
    }

    static insert(position: any, newText: string): TextEdit {
      const range = new RangeClass(position, position);
      return new TextEdit(range, newText);
    }

    static delete(range: any): TextEdit {
      return new TextEdit(range, '');
    }

    static setEndOfLine(eol: number): TextEdit {
      const edit = new TextEdit(null as any, '');
      edit.newEol = eol;
      return edit;
    }
  };
}

/**
 * Create WorkspaceEdit class
 */
function createWorkspaceEditClass() {
  return class WorkspaceEdit {
    private _edits: Map<string, any[]> = new Map();
    private _resourceEdits: any[] = [];

    get size(): number {
      return this._edits.size + this._resourceEdits.length;
    }

    replace(uri: any, range: any, newText: string): void {
      const TextEditClass = createTextEditClass();
      this.set(uri, [TextEditClass.replace(range, newText)]);
    }

    insert(uri: any, position: any, newText: string): void {
      const TextEditClass = createTextEditClass();
      this.set(uri, [TextEditClass.insert(position, newText)]);
    }

    delete(uri: any, range: any): void {
      const TextEditClass = createTextEditClass();
      this.set(uri, [TextEditClass.delete(range)]);
    }

    has(uri: any): boolean {
      return this._edits.has(uri.toString());
    }

    set(uri: any, edits: any[]): void {
      this._edits.set(uri.toString(), edits);
    }

    get(uri: any): any[] {
      return this._edits.get(uri.toString()) || [];
    }

    createFile(uri: any, options?: { overwrite?: boolean; ignoreIfExists?: boolean }): void {
      this._resourceEdits.push({
        type: 'create',
        uri,
        options,
      });
    }

    deleteFile(uri: any, options?: { recursive?: boolean; ignoreIfNotExists?: boolean }): void {
      this._resourceEdits.push({
        type: 'delete',
        uri,
        options,
      });
    }

    renameFile(oldUri: any, newUri: any, options?: { overwrite?: boolean; ignoreIfExists?: boolean }): void {
      this._resourceEdits.push({
        type: 'rename',
        oldUri,
        newUri,
        options,
      });
    }

    entries(): [any, any[]][] {
      const result: [any, any[]][] = [];
      this._edits.forEach((edits, uriStr) => {
        const VSCodeUriClass = VSCodeUri;
        result.push([VSCodeUriClass.parse(uriStr), edits]);
      });
      return result;
    }
  };
}

/**
 * Create WebviewPanel class
 */
function createWebviewPanelClass() {
  return class WebviewPanel {
    readonly viewType: string;
    readonly webview: any;
    title: string;
    iconPath?: any;
    readonly viewColumn?: number;
    readonly active: boolean = true;
    readonly visible: boolean = true;
    readonly onDidDispose: any;
    readonly onDidChangeViewState: any;
    readonly options: any;

    constructor(viewType: string, title: string, viewColumn: number, options: any = {}) {
      this.viewType = viewType;
      this.title = title;
      this.viewColumn = viewColumn;
      this.options = options;

      // Create webview object
      this.webview = {
        html: '',
        options: options.enableScripts ? { enableScripts: true } : {},
        onDidReceiveMessage: createEvent(),
        postMessage: async (_message: any) => true,
        asWebviewUri: (uri: any) => uri,
        cspSource: "'self'",
      };

      // Create events
      this.onDidDispose = createEvent();
      this.onDidChangeViewState = createEvent();
    }

    reveal(_viewColumn?: number, _preserveFocus?: boolean): void {
      // No-op in our implementation
    }

    dispose(): void {
      (this.onDidDispose as any).fire();
    }
  };
}

/**
 * Create SnippetString class
 */
function createSnippetStringClass() {
  return class SnippetString {
    value: string;

    constructor(value?: string) {
      this.value = value || '';
    }

    appendText(string: string): SnippetString {
      this.value += string.replace(/\$|}/g, '\\$&');
      return this;
    }

    appendTabstop(number: number = 0): SnippetString {
      this.value += '$' + number;
      return this;
    }

    appendPlaceholder(value: string | ((snippet: SnippetString) => void), number: number = 0): SnippetString {
      if (typeof value === 'function') {
        const nested = new SnippetString();
        value(nested);
        this.value += '${' + number + ':' + nested.value + '}';
      } else {
        this.value += '${' + number + ':' + value + '}';
      }
      return this;
    }

    appendChoice(values: string[], number: number = 0): SnippetString {
      this.value += '${' + number + '|' + values.join(',') + '|}';
      return this;
    }

    appendVariable(name: string, defaultValue: string | ((snippet: SnippetString) => void)): SnippetString {
      if (typeof defaultValue === 'function') {
        const nested = new SnippetString();
        defaultValue(nested);
        this.value += '${' + name + ':' + nested.value + '}';
      } else {
        this.value += '${' + name + ':' + defaultValue + '}';
      }
      return this;
    }
  };
}

/**
 * Create ParameterInformation class
 */
function createParameterInformationClass() {
  return class ParameterInformation {
    label: string | [number, number];
    documentation?: string | any;

    constructor(label: string | [number, number], documentation?: string | any) {
      this.label = label;
      this.documentation = documentation;
    }
  };
}

/**
 * Create SignatureInformation class
 */
function createSignatureInformationClass() {
  return class SignatureInformation {
    label: string;
    documentation?: string | any;
    parameters: any[];
    activeParameter?: number;

    constructor(label: string, documentation?: string | any) {
      this.label = label;
      this.documentation = documentation;
      this.parameters = [];
    }
  };
}

/**
 * Create SignatureHelp class
 */
function createSignatureHelpClass() {
  return class SignatureHelp {
    signatures: any[];
    activeSignature: number;
    activeParameter: number;

    constructor() {
      this.signatures = [];
      this.activeSignature = 0;
      this.activeParameter = 0;
    }
  };
}

/**
 * Create CompletionItem class
 */
function createCompletionItemClass() {
  return class CompletionItem {
    label: string | any;
    kind?: number;
    tags?: number[];
    detail?: string;
    documentation?: string | any;
    sortText?: string;
    filterText?: string;
    preselect?: boolean;
    insertText?: string | any;
    range?: any;
    commitCharacters?: string[];
    keepWhitespace?: boolean;
    additionalTextEdits?: any[];
    command?: any;

    constructor(label: string | any, kind?: number) {
      this.label = label;
      this.kind = kind;
    }
  };
}

/**
 * Create CompletionList class
 */
function createCompletionListClass() {
  return class CompletionList {
    isIncomplete: boolean;
    items: any[];

    constructor(items: any[] = [], isIncomplete: boolean = false) {
      this.items = items;
      this.isIncomplete = isIncomplete;
    }
  };
}

/**
 * Create Hover class
 */
function createHoverClass() {
  return class Hover {
    contents: any[];
    range?: any;

    constructor(contents: any | any[], range?: any) {
      this.contents = Array.isArray(contents) ? contents : [contents];
      this.range = range;
    }
  };
}

/**
 * Create DocumentLink class
 */
function createDocumentLinkClass() {
  return class DocumentLink {
    range: any;
    target?: any;
    tooltip?: string;

    constructor(range: any, target?: any) {
      this.range = range;
      this.target = target;
    }
  };
}

/**
 * Create Color class
 */
function createColorClass() {
  return class Color {
    readonly red: number;
    readonly green: number;
    readonly blue: number;
    readonly alpha: number;

    constructor(red: number, green: number, blue: number, alpha: number) {
      this.red = red;
      this.green = green;
      this.blue = blue;
      this.alpha = alpha;
    }
  };
}

/**
 * Create ColorInformation class
 */
function createColorInformationClass() {
  return class ColorInformation {
    range: any;
    color: any;

    constructor(range: any, color: any) {
      this.range = range;
      this.color = color;
    }
  };
}

/**
 * Create ColorPresentation class
 */
function createColorPresentationClass() {
  return class ColorPresentation {
    label: string;
    textEdit?: any;
    additionalTextEdits?: any[];

    constructor(label: string) {
      this.label = label;
    }
  };
}

/**
 * Create FoldingRange class
 */
function createFoldingRangeClass() {
  return class FoldingRange {
    start: number;
    end: number;
    kind?: number;

    constructor(start: number, end: number, kind?: number) {
      this.start = start;
      this.end = end;
      this.kind = kind;
    }
  };
}

/**
 * Create SelectionRange class
 */
function createSelectionRangeClass() {
  return class SelectionRange {
    range: any;
    parent?: any;

    constructor(range: any, parent?: any) {
      this.range = range;
      this.parent = parent;
    }
  };
}

/**
 * Create CallHierarchyItem class
 */
function createCallHierarchyItemClass() {
  return class CallHierarchyItem {
    kind: number;
    name: string;
    detail?: string;
    uri: any;
    range: any;
    selectionRange: any;
    tags?: number[];

    constructor(kind: number, name: string, detail: string, uri: any, range: any, selectionRange: any) {
      this.kind = kind;
      this.name = name;
      this.detail = detail;
      this.uri = uri;
      this.range = range;
      this.selectionRange = selectionRange;
    }
  };
}

/**
 * Create SemanticTokensLegend class
 */
function createSemanticTokensLegendClass() {
  return class SemanticTokensLegend {
    readonly tokenTypes: string[];
    readonly tokenModifiers: string[];

    constructor(tokenTypes: string[], tokenModifiers: string[] = []) {
      this.tokenTypes = tokenTypes;
      this.tokenModifiers = tokenModifiers;
    }
  };
}

/**
 * Create SemanticTokensBuilder class
 */
function createSemanticTokensBuilderClass() {
  return class SemanticTokensBuilder {
    private _data: number[] = [];
    private _prevLine: number = 0;
    private _prevChar: number = 0;

    push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number = 0): void {
      const deltaLine = line - this._prevLine;
      const deltaChar = deltaLine === 0 ? char - this._prevChar : char;

      this._data.push(deltaLine, deltaChar, length, tokenType, tokenModifiers);

      this._prevLine = line;
      this._prevChar = char;
    }

    build(): any {
      return {
        data: new Uint32Array(this._data),
      };
    }
  };
}
