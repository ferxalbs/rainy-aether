/**
 * LSP Service Types
 * Type definitions for the Language Server Protocol integration
 */

import type {
  CompletionItem,
  Diagnostic,
  Hover,
  Location,
  SignatureHelp,
  DocumentSymbol,
  WorkspaceEdit,
  Range,
} from 'vscode-languageserver-types';

export type {
  CompletionItem,
  Diagnostic,
  Hover,
  Location,
  SignatureHelp,
  DocumentSymbol,
  WorkspaceEdit,
  Range,
};

/**
 * Language Server configuration
 */
export interface LanguageServerConfig {
  /** Unique identifier for this language server */
  id: string;

  /** Display name */
  name: string;

  /** Languages this server supports (file extensions) */
  languages: string[];

  /** Command to start the language server */
  command: string;

  /** Arguments to pass to the command */
  args?: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** Initialization options */
  initializationOptions?: unknown;
}

/**
 * LSP Client State
 */
export enum LSPClientState {
  Stopped = 'stopped',
  Starting = 'starting',
  Running = 'running',
  Error = 'error',
}

/**
 * LSP capabilities that we support
 */
export interface LSPCapabilities {
  completionProvider?: boolean;
  hoverProvider?: boolean;
  signatureHelpProvider?: boolean;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentSymbolProvider?: boolean;
  documentFormattingProvider?: boolean;
  documentRangeFormattingProvider?: boolean;
  renameProvider?: boolean;
  codeActionProvider?: boolean;
  diagnosticProvider?: boolean;
}

/**
 * Document information tracked by LSP
 */
export interface LSPDocument {
  uri: string;
  languageId: string;
  version: number;
  content: string;
}

/**
 * LSP Service Events
 */
export interface LSPServiceEvents {
  onDiagnostics: (uri: string, diagnostics: Diagnostic[]) => void;
  onStateChange: (serverId: string, state: LSPClientState) => void;
}
