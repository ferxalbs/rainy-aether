/**
 * Extension API Types and Interfaces
 *
 * This file defines the complete Extension API that extensions can use
 * to interact with the Rainy Code IDE.
 */

import type { editor, languages, Position, Range, IDisposable } from 'monaco-editor';

// ============================================================================
// Extension Capabilities and Permissions
// ============================================================================

export enum ExtensionCapability {
  // File System
  READ_FILES = 'fs:read',
  WRITE_FILES = 'fs:write',
  WATCH_FILES = 'fs:watch',

  // Editor
  EDIT_TEXT = 'editor:edit',
  READ_TEXT = 'editor:read',
  CURSOR_POSITION = 'editor:cursor',
  DECORATIONS = 'editor:decorations',

  // Language Features
  COMPLETIONS = 'language:completions',
  DIAGNOSTICS = 'language:diagnostics',
  HOVER = 'language:hover',
  DEFINITIONS = 'language:definitions',
  REFERENCES = 'language:references',
  FORMATTING = 'language:formatting',
  CODE_ACTIONS = 'language:codeActions',
  RENAME = 'language:rename',
  SYMBOLS = 'language:symbols',

  // UI
  STATUS_BAR = 'ui:statusBar',
  NOTIFICATIONS = 'ui:notifications',
  QUICK_PICK = 'ui:quickPick',
  INPUT_BOX = 'ui:inputBox',
  PANELS = 'ui:panels',
  WEBVIEWS = 'ui:webviews',

  // Terminal
  TERMINAL_CREATE = 'terminal:create',
  TERMINAL_WRITE = 'terminal:write',
  TERMINAL_READ = 'terminal:read',

  // Commands
  REGISTER_COMMANDS = 'commands:register',
  EXECUTE_COMMANDS = 'commands:execute',

  // Network
  HTTP_REQUEST = 'network:http',
  WEBSOCKET = 'network:websocket',

  // Storage
  GLOBAL_STATE = 'storage:global',
  WORKSPACE_STATE = 'storage:workspace',
  SECRETS = 'storage:secrets',

  // Git
  GIT_READ = 'git:read',
  GIT_WRITE = 'git:write',

  // Process
  SPAWN_PROCESS = 'process:spawn',

  // Debug
  DEBUG_ADAPTER = 'debug:adapter',
  BREAKPOINTS = 'debug:breakpoints',
}

export interface ExtensionPermissions {
  capabilities: ExtensionCapability[];

  // Optional: Restrict file access to specific patterns
  fileAccess?: {
    allow?: string[]; // glob patterns
    deny?: string[];
  };

  // Optional: Network restrictions
  networkAccess?: {
    allowedDomains?: string[];
    deniedDomains?: string[];
  };
}

// ============================================================================
// Extension Manifest (Enhanced)
// ============================================================================

export interface ExtensionPackageJson {
  // Required fields
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  engines: {
    rainycode?: string; // Semantic version range
    vscode?: string; // For VS Code compatibility
  };

  // Extension type
  extensionKind?: 'ui' | 'workspace' | 'hybrid';

  // Activation
  activationEvents?: string[];
  main?: string; // Entry point for Node.js-like extensions
  browser?: string; // Entry point for browser-compatible extensions

  // Capabilities and permissions
  permissions?: ExtensionPermissions;

  // Contributions
  contributes?: {
    languages?: LanguageContribution[];
    grammars?: GrammarContribution[];
    themes?: ThemeContribution[];
    snippets?: SnippetContribution[];
    commands?: CommandContribution[];
    keybindings?: KeybindingContribution[];
    menus?: MenuContribution[];
    configuration?: ConfigurationContribution;
    icons?: IconContribution[];
    views?: ViewContribution[];
    viewsContainers?: ViewsContainerContribution[];
    problemMatchers?: ProblemMatcherContribution[];
    debuggers?: DebuggerContribution[];
    breakpoints?: BreakpointContribution[];
    grammars?: GrammarContribution[];
    taskDefinitions?: TaskDefinitionContribution[];
  };

  // Dependencies
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  extensionDependencies?: string[];
  extensionPack?: string[];

  // Metadata
  categories?: string[];
  keywords?: string[];
  license?: string;
  icon?: string;
  galleryBanner?: {
    color?: string;
    theme?: 'dark' | 'light';
  };
  preview?: boolean;
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
  };
  homepage?: string;

  // Sponsors
  sponsor?: {
    url: string;
  };

  // Pricing
  pricing?: 'Free' | 'Trial' | 'Paid';
}

// ============================================================================
// Contribution Types
// ============================================================================

export interface LanguageContribution {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  filenamePatterns?: string[];
  firstLine?: string;
  configuration?: string; // Path to language configuration JSON
  icon?: {
    light: string;
    dark: string;
  };
}

export interface GrammarContribution {
  language: string;
  scopeName: string;
  path: string; // Path to TextMate grammar
  embeddedLanguages?: Record<string, string>;
  tokenTypes?: Record<string, string>;
  injectTo?: string[];
}

export interface ThemeContribution {
  id: string;
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  path: string;
}

export interface SnippetContribution {
  language: string;
  path: string;
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string | { light: string; dark: string };
  enablement?: string; // When clause
}

export interface KeybindingContribution {
  key: string;
  command: string;
  when?: string;
  mac?: string;
  linux?: string;
  win?: string;
}

export interface MenuContribution {
  [location: string]: Array<{
    command: string;
    when?: string;
    group?: string;
    alt?: string;
  }>;
}

export interface ConfigurationContribution {
  title?: string;
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  description: string;
  enum?: any[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  items?: any;
  properties?: Record<string, ConfigurationProperty>;
  scope?: 'application' | 'window' | 'resource' | 'language-overridable' | 'machine' | 'machine-overridable';
  order?: number;
  deprecationMessage?: string;
  markdownDescription?: string;
}

export interface IconContribution {
  [id: string]: {
    description: string;
    default: {
      fontPath: string;
      fontCharacter: string;
    };
  };
}

export interface ViewContribution {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
  visibility?: 'visible' | 'hidden' | 'collapsed';
}

export interface ViewsContainerContribution {
  [location: string]: Array<{
    id: string;
    title: string;
    icon: string;
  }>;
}

export interface ProblemMatcherContribution {
  name: string;
  owner?: string;
  source?: string;
  severity?: 'error' | 'warning' | 'info';
  fileLocation?: 'absolute' | 'relative' | string[];
  pattern: ProblemPattern | ProblemPattern[];
  background?: {
    activeOnStart?: boolean;
    beginsPattern?: string;
    endsPattern?: string;
  };
}

export interface ProblemPattern {
  regexp: string;
  file?: number;
  location?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity?: number;
  code?: number;
  message?: number;
  loop?: boolean;
}

export interface DebuggerContribution {
  type: string;
  label: string;
  program?: string;
  runtime?: string;
  configurationAttributes?: Record<string, any>;
  initialConfigurations?: any[];
  configurationSnippets?: any[];
  variables?: Record<string, string>;
}

export interface BreakpointContribution {
  language: string;
}

export interface TaskDefinitionContribution {
  type: string;
  required?: string[];
  properties?: Record<string, ConfigurationProperty>;
}

// ============================================================================
// Extension Context API
// ============================================================================

export interface ExtensionContext {
  // Extension info
  readonly extensionId: string;
  readonly extensionPath: string;
  readonly extensionUri: string;
  readonly isActive: boolean;

  // Storage
  readonly globalState: Memento;
  readonly workspaceState: Memento;
  readonly secrets: SecretStorage;
  readonly storageUri: string | undefined;
  readonly globalStorageUri: string;
  readonly logUri: string;

  // Utilities
  readonly subscriptions: IDisposable[];
  readonly extensionMode: ExtensionMode;
  readonly environmentVariableCollection: EnvironmentVariableCollection;

  // Path utilities
  asAbsolutePath(relativePath: string): string;
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Promise<void>;
  keys(): readonly string[];
}

export interface SecretStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  onDidChange: Event<SecretStorageChangeEvent>;
}

export interface SecretStorageChangeEvent {
  key: string;
}

export interface EnvironmentVariableCollection {
  persistent: boolean;
  replace(variable: string, value: string): void;
  append(variable: string, value: string): void;
  prepend(variable: string, value: string): void;
  get(variable: string): EnvironmentVariableMutator | undefined;
  forEach(callback: (variable: string, mutator: EnvironmentVariableMutator) => void): void;
  delete(variable: string): void;
  clear(): void;
}

export interface EnvironmentVariableMutator {
  readonly value: string;
  readonly type: EnvironmentVariableMutatorType;
}

export enum EnvironmentVariableMutatorType {
  Replace = 1,
  Append = 2,
  Prepend = 3,
}

// ============================================================================
// Event System
// ============================================================================

export interface Event<T> {
  (listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[]): IDisposable;
}

export interface EventEmitter<T> {
  readonly event: Event<T>;
  fire(data: T): void;
  dispose(): void;
}

// ============================================================================
// Commands API
// ============================================================================

export interface CommandsAPI {
  registerCommand(command: string, callback: (...args: any[]) => any): IDisposable;
  registerTextEditorCommand(command: string, callback: (textEditor: any, edit: any, ...args: any[]) => void): IDisposable;
  executeCommand<T = unknown>(command: string, ...rest: any[]): Promise<T>;
  getCommands(filterInternal?: boolean): Promise<string[]>;
}

// ============================================================================
// Workspace API
// ============================================================================

export interface WorkspaceAPI {
  readonly rootPath: string | undefined;
  readonly workspaceFolders: readonly WorkspaceFolder[] | undefined;
  readonly name: string | undefined;

  readonly onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
  readonly onDidOpenTextDocument: Event<TextDocument>;
  readonly onDidCloseTextDocument: Event<TextDocument>;
  readonly onDidChangeTextDocument: Event<TextDocumentChangeEvent>;
  readonly onDidSaveTextDocument: Event<TextDocument>;
  readonly onWillSaveTextDocument: Event<TextDocumentWillSaveEvent>;

  getWorkspaceFolder(uri: string): WorkspaceFolder | undefined;
  asRelativePath(pathOrUri: string, includeWorkspaceFolder?: boolean): string;
  findFiles(include: string, exclude?: string, maxResults?: number): Promise<string[]>;
  openTextDocument(uri: string): Promise<TextDocument>;
  applyEdit(edit: WorkspaceEdit): Promise<boolean>;

  readonly fs: FileSystemAPI;
}

export interface WorkspaceFolder {
  readonly uri: string;
  readonly name: string;
  readonly index: number;
}

export interface WorkspaceFoldersChangeEvent {
  readonly added: readonly WorkspaceFolder[];
  readonly removed: readonly WorkspaceFolder[];
}

export interface TextDocument {
  readonly uri: string;
  readonly fileName: string;
  readonly isUntitled: boolean;
  readonly languageId: string;
  readonly version: number;
  readonly isDirty: boolean;
  readonly isClosed: boolean;
  readonly lineCount: number;

  save(): Promise<boolean>;
  lineAt(line: number): TextLine;
  offsetAt(position: Position): number;
  positionAt(offset: number): Position;
  getText(range?: Range): string;
  getWordRangeAtPosition(position: Position, regex?: RegExp): Range | undefined;
  validateRange(range: Range): Range;
  validatePosition(position: Position): Position;
}

export interface TextLine {
  readonly lineNumber: number;
  readonly text: string;
  readonly range: Range;
  readonly rangeIncludingLineBreak: Range;
  readonly firstNonWhitespaceCharacterIndex: number;
  readonly isEmptyOrWhitespace: boolean;
}

export interface TextDocumentChangeEvent {
  readonly document: TextDocument;
  readonly contentChanges: readonly TextDocumentContentChangeEvent[];
}

export interface TextDocumentContentChangeEvent {
  readonly range: Range;
  readonly rangeOffset: number;
  readonly rangeLength: number;
  readonly text: string;
}

export interface TextDocumentWillSaveEvent {
  readonly document: TextDocument;
  readonly reason: TextDocumentSaveReason;
  waitUntil(thenable: Promise<any>): void;
}

export enum TextDocumentSaveReason {
  Manual = 1,
  AfterDelay = 2,
  FocusOut = 3,
}

export interface WorkspaceEdit {
  size: number;
  replace(uri: string, range: Range, newText: string): void;
  insert(uri: string, position: Position, newText: string): void;
  delete(uri: string, range: Range): void;
  has(uri: string): boolean;
  set(uri: string, edits: TextEdit[]): void;
  get(uri: string): TextEdit[];
  createFile(uri: string, options?: { overwrite?: boolean; ignoreIfExists?: boolean }): void;
  deleteFile(uri: string, options?: { recursive?: boolean; ignoreIfNotExists?: boolean }): void;
  renameFile(oldUri: string, newUri: string, options?: { overwrite?: boolean; ignoreIfExists?: boolean }): void;
}

export interface TextEdit {
  range: Range;
  newText: string;
  newEol?: EndOfLine;
}

export enum EndOfLine {
  LF = 1,
  CRLF = 2,
}

// ============================================================================
// File System API
// ============================================================================

export interface FileSystemAPI {
  stat(uri: string): Promise<FileStat>;
  readDirectory(uri: string): Promise<[string, FileType][]>;
  createDirectory(uri: string): Promise<void>;
  readFile(uri: string): Promise<Uint8Array>;
  writeFile(uri: string, content: Uint8Array): Promise<void>;
  delete(uri: string, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void>;
  rename(source: string, target: string, options?: { overwrite?: boolean }): Promise<void>;
  copy(source: string, target: string, options?: { overwrite?: boolean }): Promise<void>;
}

export interface FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

// ============================================================================
// Languages API
// ============================================================================

export interface LanguagesAPI {
  getLanguages(): Promise<string[]>;
  setTextDocumentLanguage(document: TextDocument, languageId: string): Promise<TextDocument>;

  // Providers
  registerCompletionItemProvider(selector: DocumentSelector, provider: CompletionItemProvider, ...triggerCharacters: string[]): IDisposable;
  registerHoverProvider(selector: DocumentSelector, provider: HoverProvider): IDisposable;
  registerDefinitionProvider(selector: DocumentSelector, provider: DefinitionProvider): IDisposable;
  registerReferenceProvider(selector: DocumentSelector, provider: ReferenceProvider): IDisposable;
  registerDocumentFormattingEditProvider(selector: DocumentSelector, provider: DocumentFormattingEditProvider): IDisposable;
  registerDocumentRangeFormattingEditProvider(selector: DocumentSelector, provider: DocumentRangeFormattingEditProvider): IDisposable;
  registerRenameProvider(selector: DocumentSelector, provider: RenameProvider): IDisposable;
  registerCodeActionsProvider(selector: DocumentSelector, provider: CodeActionProvider, metadata?: CodeActionProviderMetadata): IDisposable;
  registerDocumentSymbolProvider(selector: DocumentSelector, provider: DocumentSymbolProvider): IDisposable;
  registerWorkspaceSymbolProvider(provider: WorkspaceSymbolProvider): IDisposable;
  registerSignatureHelpProvider(selector: DocumentSelector, provider: SignatureHelpProvider, ...triggerCharacters: string[]): IDisposable;
  registerDocumentHighlightProvider(selector: DocumentSelector, provider: DocumentHighlightProvider): IDisposable;
  registerCodeLensProvider(selector: DocumentSelector, provider: CodeLensProvider): IDisposable;
  registerDocumentLinkProvider(selector: DocumentSelector, provider: DocumentLinkProvider): IDisposable;
  registerColorProvider(selector: DocumentSelector, provider: DocumentColorProvider): IDisposable;
  registerFoldingRangeProvider(selector: DocumentSelector, provider: FoldingRangeProvider): IDisposable;
  registerSelectionRangeProvider(selector: DocumentSelector, provider: SelectionRangeProvider): IDisposable;
  registerCallHierarchyProvider(selector: DocumentSelector, provider: CallHierarchyProvider): IDisposable;
  registerTypeHierarchyProvider(selector: DocumentSelector, provider: TypeHierarchyProvider): IDisposable;

  // Diagnostics
  createDiagnosticCollection(name?: string): DiagnosticCollection;
  getDiagnostics(uri: string): Diagnostic[];
  getDiagnostics(): [string, Diagnostic[]][];

  readonly onDidChangeDiagnostics: Event<DiagnosticChangeEvent>;
}

export type DocumentSelector = string | DocumentFilter | Array<string | DocumentFilter>;

export interface DocumentFilter {
  language?: string;
  scheme?: string;
  pattern?: string;
}

export interface CompletionItemProvider {
  provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<CompletionList | CompletionItem[]>;
  resolveCompletionItem?(item: CompletionItem, token: CancellationToken): Promise<CompletionItem>;
}

export interface HoverProvider {
  provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | null>;
}

export interface DefinitionProvider {
  provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[]>;
}

export interface ReferenceProvider {
  provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]>;
}

export interface DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): Promise<TextEdit[]>;
}

export interface DocumentRangeFormattingEditProvider {
  provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, options: FormattingOptions, token: CancellationToken): Promise<TextEdit[]>;
}

export interface RenameProvider {
  provideRenameEdits(document: TextDocument, position: Position, newName: string, token: CancellationToken): Promise<WorkspaceEdit>;
  prepareRename?(document: TextDocument, position: Position, token: CancellationToken): Promise<Range | { range: Range; placeholder: string }>;
}

export interface CodeActionProvider {
  provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext, token: CancellationToken): Promise<(Command | CodeAction)[]>;
  resolveCodeAction?(codeAction: CodeAction, token: CancellationToken): Promise<CodeAction>;
}

export interface DocumentSymbolProvider {
  provideDocumentSymbols(document: TextDocument, token: CancellationToken): Promise<SymbolInformation[] | DocumentSymbol[]>;
}

export interface WorkspaceSymbolProvider {
  provideWorkspaceSymbols(query: string, token: CancellationToken): Promise<SymbolInformation[]>;
  resolveWorkspaceSymbol?(symbol: SymbolInformation, token: CancellationToken): Promise<SymbolInformation>;
}

export interface SignatureHelpProvider {
  provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken, context: SignatureHelpContext): Promise<SignatureHelp>;
}

export interface DocumentHighlightProvider {
  provideDocumentHighlights(document: TextDocument, position: Position, token: CancellationToken): Promise<DocumentHighlight[]>;
}

export interface CodeLensProvider {
  provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]>;
  resolveCodeLens?(codeLens: CodeLens, token: CancellationToken): Promise<CodeLens>;
}

export interface DocumentLinkProvider {
  provideDocumentLinks(document: TextDocument, token: CancellationToken): Promise<DocumentLink[]>;
  resolveDocumentLink?(link: DocumentLink, token: CancellationToken): Promise<DocumentLink>;
}

export interface DocumentColorProvider {
  provideDocumentColors(document: TextDocument, token: CancellationToken): Promise<ColorInformation[]>;
  provideColorPresentations(color: Color, context: { document: TextDocument; range: Range }, token: CancellationToken): Promise<ColorPresentation[]>;
}

export interface FoldingRangeProvider {
  provideFoldingRanges(document: TextDocument, context: FoldingContext, token: CancellationToken): Promise<FoldingRange[]>;
}

export interface SelectionRangeProvider {
  provideSelectionRanges(document: TextDocument, positions: Position[], token: CancellationToken): Promise<SelectionRange[]>;
}

export interface CallHierarchyProvider {
  prepareCallHierarchy(document: TextDocument, position: Position, token: CancellationToken): Promise<CallHierarchyItem[]>;
  provideCallHierarchyIncomingCalls(item: CallHierarchyItem, token: CancellationToken): Promise<CallHierarchyIncomingCall[]>;
  provideCallHierarchyOutgoingCalls(item: CallHierarchyItem, token: CancellationToken): Promise<CallHierarchyOutgoingCall[]>;
}

export interface TypeHierarchyProvider {
  prepareTypeHierarchy(document: TextDocument, position: Position, token: CancellationToken): Promise<TypeHierarchyItem[]>;
  provideTypeHierarchySupertypes(item: TypeHierarchyItem, token: CancellationToken): Promise<TypeHierarchyItem[]>;
  provideTypeHierarchySubtypes(item: TypeHierarchyItem, token: CancellationToken): Promise<TypeHierarchyItem[]>;
}

export interface DiagnosticCollection extends IDisposable {
  readonly name: string;
  set(uri: string, diagnostics: Diagnostic[] | undefined): void;
  delete(uri: string): void;
  clear(): void;
  forEach(callback: (uri: string, diagnostics: Diagnostic[], collection: DiagnosticCollection) => void): void;
  get(uri: string): Diagnostic[] | undefined;
  has(uri: string): boolean;
}

export interface Diagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  source?: string;
  code?: string | number;
  relatedInformation?: DiagnosticRelatedInformation[];
  tags?: DiagnosticTag[];
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2,
}

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface DiagnosticChangeEvent {
  readonly uris: readonly string[];
}

// Supporting types for providers
export interface CompletionContext {
  triggerKind: CompletionTriggerKind;
  triggerCharacter?: string;
}

export enum CompletionTriggerKind {
  Invoke = 0,
  TriggerCharacter = 1,
  TriggerForIncompleteCompletions = 2,
}

export interface CompletionList {
  isIncomplete: boolean;
  items: CompletionItem[];
}

export interface CompletionItem {
  label: string;
  kind?: CompletionItemKind;
  tags?: CompletionItemTag[];
  detail?: string;
  documentation?: string | MarkdownString;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  insertText?: string | SnippetString;
  range?: Range;
  commitCharacters?: string[];
  keepWhitespace?: boolean;
  additionalTextEdits?: TextEdit[];
  command?: Command;
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  File = 16,
  Reference = 17,
  Folder = 18,
  EnumMember = 19,
  Constant = 20,
  Struct = 21,
  Event = 22,
  Operator = 23,
  TypeParameter = 24,
}

export enum CompletionItemTag {
  Deprecated = 1,
}

export interface Hover {
  contents: MarkdownString | MarkdownString[];
  range?: Range;
}

export class MarkdownString {
  value: string;
  isTrusted?: boolean;
  supportThemeIcons?: boolean;
  supportHtml?: boolean;
  baseUri?: string;

  constructor(value?: string, supportThemeIcons?: boolean);
  appendText(value: string): MarkdownString;
  appendMarkdown(value: string): MarkdownString;
  appendCodeblock(value: string, language?: string): MarkdownString;
}

export type Definition = Location | Location[];

export interface DefinitionLink {
  originSelectionRange?: Range;
  targetUri: string;
  targetRange: Range;
  targetSelectionRange?: Range;
}

export interface ReferenceContext {
  includeDeclaration: boolean;
}

export interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
  [key: string]: boolean | number | string;
}

export interface CodeActionContext {
  diagnostics: readonly Diagnostic[];
  only?: CodeActionKind;
  triggerKind?: CodeActionTriggerKind;
}

export class CodeActionKind {
  static readonly Empty: CodeActionKind;
  static readonly QuickFix: CodeActionKind;
  static readonly Refactor: CodeActionKind;
  static readonly RefactorExtract: CodeActionKind;
  static readonly RefactorInline: CodeActionKind;
  static readonly RefactorRewrite: CodeActionKind;
  static readonly Source: CodeActionKind;
  static readonly SourceOrganizeImports: CodeActionKind;
  static readonly SourceFixAll: CodeActionKind;

  readonly value: string;

  private constructor(value: string);
  append(parts: string): CodeActionKind;
  intersects(other: CodeActionKind): boolean;
  contains(other: CodeActionKind): boolean;
}

export enum CodeActionTriggerKind {
  Invoke = 1,
  Automatic = 2,
}

export interface CodeAction {
  title: string;
  command?: Command;
  edit?: WorkspaceEdit;
  diagnostics?: Diagnostic[];
  kind?: CodeActionKind;
  isPreferred?: boolean;
  disabled?: {
    reason: string;
  };
}

export interface Command {
  title: string;
  command: string;
  tooltip?: string;
  arguments?: any[];
}

export interface CodeActionProviderMetadata {
  providedCodeActionKinds?: readonly CodeActionKind[];
  documentation?: Array<{
    kind: CodeActionKind;
    command: Command;
  }>;
}

export interface SymbolInformation {
  name: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  containerName?: string;
  location: Location;
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
  EnumMember = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export enum SymbolTag {
  Deprecated = 1,
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string | MarkdownString;
  parameters: ParameterInformation[];
  activeParameter?: number;
}

export interface ParameterInformation {
  label: string | [number, number];
  documentation?: string | MarkdownString;
}

export interface SignatureHelpContext {
  triggerKind: SignatureHelpTriggerKind;
  triggerCharacter?: string;
  isRetrigger: boolean;
  activeSignatureHelp?: SignatureHelp;
}

export enum SignatureHelpTriggerKind {
  Invoke = 1,
  TriggerCharacter = 2,
  ContentChange = 3,
}

export interface DocumentHighlight {
  range: Range;
  kind?: DocumentHighlightKind;
}

export enum DocumentHighlightKind {
  Text = 0,
  Read = 1,
  Write = 2,
}

export interface CodeLens {
  range: Range;
  command?: Command;
  isResolved: boolean;
}

export interface DocumentLink {
  range: Range;
  target?: string;
  tooltip?: string;
}

export interface ColorInformation {
  range: Range;
  color: Color;
}

export interface Color {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export interface ColorPresentation {
  label: string;
  textEdit?: TextEdit;
  additionalTextEdits?: TextEdit[];
}

export interface FoldingRange {
  start: number;
  end: number;
  kind?: FoldingRangeKind;
}

export enum FoldingRangeKind {
  Comment = 1,
  Imports = 2,
  Region = 3,
}

export interface FoldingContext {
}

export interface SelectionRange {
  range: Range;
  parent?: SelectionRange;
}

export interface CallHierarchyItem {
  name: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  detail?: string;
  uri: string;
  range: Range;
  selectionRange: Range;
}

export interface CallHierarchyIncomingCall {
  from: CallHierarchyItem;
  fromRanges: Range[];
}

export interface CallHierarchyOutgoingCall {
  to: CallHierarchyItem;
  fromRanges: Range[];
}

export interface TypeHierarchyItem {
  name: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  detail?: string;
  uri: string;
  range: Range;
  selectionRange: Range;
}

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested: Event<any>;
}

export class SnippetString {
  value: string;

  constructor(value?: string);
  appendText(string: string): SnippetString;
  appendTabstop(number?: number): SnippetString;
  appendPlaceholder(value: string | ((snippet: SnippetString) => any), number?: number): SnippetString;
  appendChoice(values: string[], number?: number): SnippetString;
  appendVariable(name: string, defaultValue: string | ((snippet: SnippetString) => any)): SnippetString;
}

// ============================================================================
// UI API
// ============================================================================

export interface WindowAPI {
  readonly activeTextEditor: TextEditor | undefined;
  readonly visibleTextEditors: readonly TextEditor[];
  readonly terminals: readonly Terminal[];
  readonly activeTerminal: Terminal | undefined;

  readonly onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
  readonly onDidChangeVisibleTextEditors: Event<readonly TextEditor[]>;
  readonly onDidChangeTextEditorSelection: Event<TextEditorSelectionChangeEvent>;
  readonly onDidChangeTextEditorVisibleRanges: Event<TextEditorVisibleRangesChangeEvent>;
  readonly onDidChangeTextEditorOptions: Event<TextEditorOptionsChangeEvent>;
  readonly onDidChangeActiveTerminal: Event<Terminal | undefined>;
  readonly onDidOpenTerminal: Event<Terminal>;
  readonly onDidCloseTerminal: Event<Terminal>;

  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showQuickPick(items: string[] | Promise<string[]>, options?: QuickPickOptions): Promise<string | undefined>;
  showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
  createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;
  createOutputChannel(name: string): OutputChannel;
  createTerminal(options?: TerminalOptions): Terminal;
  createWebviewPanel(viewType: string, title: string, showOptions: ViewColumn | { viewColumn: ViewColumn; preserveFocus?: boolean }, options?: WebviewPanelOptions & WebviewOptions): WebviewPanel;
  registerWebviewPanelSerializer(viewType: string, serializer: WebviewPanelSerializer): IDisposable;
}

export interface TextEditor {
  readonly document: TextDocument;
  selection: Selection;
  selections: Selection[];
  visibleRanges: readonly Range[];
  options: TextEditorOptions;
  viewColumn?: ViewColumn;

  edit(callback: (editBuilder: TextEditorEdit) => void): Promise<boolean>;
  insertSnippet(snippet: SnippetString, location?: Position | Range | readonly Position[] | readonly Range[]): Promise<boolean>;
  setDecorations(decorationType: TextEditorDecorationType, rangesOrOptions: readonly Range[] | readonly DecorationOptions[]): void;
  revealRange(range: Range, revealType?: TextEditorRevealType): void;
  show(column?: ViewColumn): void;
  hide(): void;
}

export interface Selection {
  anchor: Position;
  active: Position;
  isReversed: boolean;
  isEmpty: boolean;
  isSingleLine: boolean;
  start: Position;
  end: Position;

  contains(positionOrRange: Position | Range): boolean;
  isEqual(other: Selection): boolean;
  intersection(other: Range): Range | undefined;
  union(other: Range): Range;
  with(change: { start?: Position; end?: Position }): Range;
}

export interface TextEditorOptions {
  tabSize?: number | string;
  insertSpaces?: boolean | string;
  cursorStyle?: TextEditorCursorStyle;
  lineNumbers?: TextEditorLineNumbersStyle;
}

export enum TextEditorCursorStyle {
  Line = 1,
  Block = 2,
  Underline = 3,
  LineThin = 4,
  BlockOutline = 5,
  UnderlineThin = 6,
}

export enum TextEditorLineNumbersStyle {
  Off = 0,
  On = 1,
  Relative = 2,
}

export interface TextEditorEdit {
  replace(location: Position | Range | Selection, value: string): void;
  insert(location: Position, value: string): void;
  delete(location: Range | Selection): void;
  setEndOfLine(endOfLine: EndOfLine): void;
}

export interface TextEditorDecorationType extends IDisposable {
  readonly key: string;
}

export interface DecorationOptions {
  range: Range;
  hoverMessage?: MarkdownString | MarkdownString[];
  renderOptions?: DecorationInstanceRenderOptions;
}

export interface DecorationInstanceRenderOptions {
  before?: ThemableDecorationAttachmentRenderOptions;
  after?: ThemableDecorationAttachmentRenderOptions;
}

export interface ThemableDecorationAttachmentRenderOptions {
  contentText?: string;
  contentIconPath?: string;
  border?: string;
  borderColor?: string;
  fontStyle?: string;
  fontWeight?: string;
  textDecoration?: string;
  color?: string;
  backgroundColor?: string;
  margin?: string;
  width?: string;
  height?: string;
}

export enum TextEditorRevealType {
  Default = 0,
  InCenter = 1,
  InCenterIfOutsideViewport = 2,
  AtTop = 3,
}

export interface TextEditorSelectionChangeEvent {
  readonly textEditor: TextEditor;
  readonly selections: readonly Selection[];
  readonly kind?: TextEditorSelectionChangeKind;
}

export enum TextEditorSelectionChangeKind {
  Keyboard = 1,
  Mouse = 2,
  Command = 3,
}

export interface TextEditorVisibleRangesChangeEvent {
  readonly textEditor: TextEditor;
  readonly visibleRanges: readonly Range[];
}

export interface TextEditorOptionsChangeEvent {
  readonly textEditor: TextEditor;
  readonly options: TextEditorOptions;
}

export interface QuickPickOptions {
  title?: string;
  placeHolder?: string;
  canPickMany?: boolean;
  ignoreFocusOut?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
}

export interface InputBoxOptions {
  title?: string;
  value?: string;
  valueSelection?: [number, number];
  prompt?: string;
  placeHolder?: string;
  password?: boolean;
  ignoreFocusOut?: boolean;
  validateInput?(value: string): string | undefined | null | Promise<string | undefined | null>;
}

export interface StatusBarItem extends IDisposable {
  readonly id: string;
  readonly alignment: StatusBarAlignment;
  readonly priority?: number;

  text: string;
  tooltip?: string | MarkdownString;
  color?: string;
  backgroundColor?: string;
  command?: string | Command;
  name?: string;

  show(): void;
  hide(): void;
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export interface OutputChannel extends IDisposable {
  readonly name: string;

  append(value: string): void;
  appendLine(value: string): void;
  replace(value: string): void;
  clear(): void;
  show(preserveFocus?: boolean): void;
  hide(): void;
}

export interface Terminal {
  readonly name: string;
  readonly processId: Promise<number | undefined>;
  readonly creationOptions: Readonly<TerminalOptions>;
  readonly exitStatus: TerminalExitStatus | undefined;

  sendText(text: string, shouldExecute?: boolean): void;
  show(preserveFocus?: boolean): void;
  hide(): void;
  dispose(): void;
}

export interface TerminalOptions {
  name?: string;
  shellPath?: string;
  shellArgs?: string | string[];
  cwd?: string;
  env?: { [key: string]: string | null | undefined };
  strictEnv?: boolean;
  hideFromUser?: boolean;
  message?: string;
  iconPath?: string | { light: string; dark: string };
  color?: string;
}

export interface TerminalExitStatus {
  readonly code: number | undefined;
  readonly reason: TerminalExitReason;
}

export enum TerminalExitReason {
  Unknown = 0,
  Shutdown = 1,
  Process = 2,
  User = 3,
  Extension = 4,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
}

export interface WebviewPanel {
  readonly viewType: string;
  readonly webview: Webview;
  readonly options: WebviewPanelOptions;
  title: string;
  iconPath?: string | { light: string; dark: string };
  readonly active: boolean;
  readonly visible: boolean;
  readonly viewColumn?: ViewColumn;

  readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;
  readonly onDidDispose: Event<void>;

  reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
  dispose(): void;
}

export interface Webview {
  options: WebviewOptions;
  html: string;

  readonly onDidReceiveMessage: Event<any>;

  postMessage(message: any): Promise<boolean>;
  asWebviewUri(localResource: string): string;
  readonly cspSource: string;
}

export interface WebviewOptions {
  enableScripts?: boolean;
  enableForms?: boolean;
  enableCommandUris?: boolean;
  localResourceRoots?: readonly string[];
  portMapping?: readonly WebviewPortMapping[];
}

export interface WebviewPortMapping {
  webviewPort: number;
  extensionHostPort: number;
}

export interface WebviewPanelOptions {
  enableFindWidget?: boolean;
  retainContextWhenHidden?: boolean;
}

export interface WebviewPanelSerializer {
  deserializeWebviewPanel(webviewPanel: WebviewPanel, state: any): Promise<void>;
}

export interface WebviewPanelOnDidChangeViewStateEvent {
  readonly webviewPanel: WebviewPanel;
}

// ============================================================================
// Extension Activation
// ============================================================================

export interface ExtensionExports {
  [key: string]: any;
}

export type ActivateFunction = (context: ExtensionContext) => Promise<ExtensionExports | void> | ExtensionExports | void;
export type DeactivateFunction = () => Promise<void> | void;

// ============================================================================
// Complete Extension API (namespace-style)
// ============================================================================

export interface RainyCodeAPI {
  readonly commands: CommandsAPI;
  readonly workspace: WorkspaceAPI;
  readonly languages: LanguagesAPI;
  readonly window: WindowAPI;
  readonly env: EnvironmentAPI;
  readonly extensions: ExtensionsAPI;

  // Version info
  readonly version: string;
}

export interface EnvironmentAPI {
  readonly appName: string;
  readonly appRoot: string;
  readonly language: string;
  readonly machineId: string;
  readonly sessionId: string;
  readonly remoteName: string | undefined;
  readonly shell: string;
  readonly uiKind: UIKind;

  readonly clipboard: Clipboard;
  readonly isNewAppInstall: boolean;
  readonly isTelemetryEnabled: boolean;

  openExternal(target: string): Promise<boolean>;
  asExternalUri(target: string): Promise<string>;
}

export enum UIKind {
  Desktop = 1,
  Web = 2,
}

export interface Clipboard {
  readText(): Promise<string>;
  writeText(value: string): Promise<void>;
}

export interface ExtensionsAPI {
  readonly all: readonly Extension<any>[];

  getExtension<T = any>(extensionId: string): Extension<T> | undefined;
  readonly onDidChange: Event<void>;
}

export interface Extension<T> {
  readonly id: string;
  readonly extensionUri: string;
  readonly extensionPath: string;
  readonly isActive: boolean;
  readonly packageJSON: ExtensionPackageJson;
  readonly extensionKind: ExtensionKind;
  readonly exports: T;

  activate(): Promise<T>;
}

export enum ExtensionKind {
  UI = 1,
  Workspace = 2,
}
