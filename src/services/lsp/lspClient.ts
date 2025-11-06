/**
 * LSP Client Implementation
 * Manages connection to a Language Server and handles LSP protocol communication
 */

import {
  type LanguageServerConfig,
  LSPClientState,
  type LSPCapabilities,
  type LSPDocument,
  type Diagnostic,
  type CompletionItem,
  type Hover,
  type Location,
  type SignatureHelp,
  type DocumentSymbol,
  type Range,
  type WorkspaceEdit,
} from './types';
import { ConnectionManager, ConnectionState, createConnectionManager } from './ConnectionManager';

/**
 * LSP Initialize Parameters
 */
interface InitializeParams {
  processId: number | null;
  clientInfo?: {
    name: string;
    version?: string;
  };
  rootUri: string | null;
  capabilities: {
    workspace?: {
      applyEdit?: boolean;
      workspaceEdit?: {
        documentChanges?: boolean;
      };
      didChangeConfiguration?: {
        dynamicRegistration?: boolean;
      };
      didChangeWatchedFiles?: {
        dynamicRegistration?: boolean;
      };
      symbol?: {
        dynamicRegistration?: boolean;
      };
      executeCommand?: {
        dynamicRegistration?: boolean;
      };
    };
    textDocument?: {
      synchronization?: {
        dynamicRegistration?: boolean;
        willSave?: boolean;
        willSaveWaitUntil?: boolean;
        didSave?: boolean;
      };
      completion?: {
        dynamicRegistration?: boolean;
        completionItem?: {
          snippetSupport?: boolean;
          commitCharactersSupport?: boolean;
          documentationFormat?: string[];
          deprecatedSupport?: boolean;
          preselectSupport?: boolean;
        };
        contextSupport?: boolean;
      };
      hover?: {
        dynamicRegistration?: boolean;
        contentFormat?: string[];
      };
      signatureHelp?: {
        dynamicRegistration?: boolean;
        signatureInformation?: {
          documentationFormat?: string[];
          parameterInformation?: {
            labelOffsetSupport?: boolean;
          };
        };
      };
      definition?: {
        dynamicRegistration?: boolean;
        linkSupport?: boolean;
      };
      references?: {
        dynamicRegistration?: boolean;
      };
      documentHighlight?: {
        dynamicRegistration?: boolean;
      };
      documentSymbol?: {
        dynamicRegistration?: boolean;
        hierarchicalDocumentSymbolSupport?: boolean;
      };
      codeAction?: {
        dynamicRegistration?: boolean;
        codeActionLiteralSupport?: {
          codeActionKind?: {
            valueSet?: string[];
          };
        };
      };
      formatting?: {
        dynamicRegistration?: boolean;
      };
      rangeFormatting?: {
        dynamicRegistration?: boolean;
      };
      rename?: {
        dynamicRegistration?: boolean;
        prepareSupport?: boolean;
      };
      publishDiagnostics?: {
        relatedInformation?: boolean;
        tagSupport?: {
          valueSet?: number[];
        };
      };
    };
  };
  initializationOptions?: unknown;
}

/**
 * LSP Initialize Result
 */
interface InitializeResult {
  capabilities: {
    textDocumentSync?: number | {
      openClose?: boolean;
      change?: number;
      willSave?: boolean;
      willSaveWaitUntil?: boolean;
      save?: boolean | { includeText?: boolean };
    };
    completionProvider?: {
      resolveProvider?: boolean;
      triggerCharacters?: string[];
    };
    hoverProvider?: boolean;
    signatureHelpProvider?: {
      triggerCharacters?: string[];
      retriggerCharacters?: string[];
    };
    definitionProvider?: boolean;
    typeDefinitionProvider?: boolean;
    implementationProvider?: boolean;
    referencesProvider?: boolean;
    documentHighlightProvider?: boolean;
    documentSymbolProvider?: boolean;
    codeActionProvider?: boolean | {
      codeActionKinds?: string[];
    };
    codeLensProvider?: {
      resolveProvider?: boolean;
    };
    documentFormattingProvider?: boolean;
    documentRangeFormattingProvider?: boolean;
    documentOnTypeFormattingProvider?: {
      firstTriggerCharacter: string;
      moreTriggerCharacter?: string[];
    };
    renameProvider?: boolean | {
      prepareProvider?: boolean;
    };
    documentLinkProvider?: {
      resolveProvider?: boolean;
    };
    colorProvider?: boolean;
    foldingRangeProvider?: boolean;
    executeCommandProvider?: {
      commands?: string[];
    };
    workspace?: {
      workspaceFolders?: {
        supported?: boolean;
        changeNotifications?: string | boolean;
      };
    };
  };
  serverInfo?: {
    name: string;
    version?: string;
  };
}

/**
 * LSP Client for communicating with language servers
 */
export class LSPClient {
  private config: LanguageServerConfig;
  private connection: ConnectionManager;
  private state: LSPClientState = LSPClientState.Stopped;
  private capabilities: LSPCapabilities = {};
  private serverCapabilities: InitializeResult['capabilities'] | null = null;
  private documents: Map<string, LSPDocument> = new Map();
  private diagnosticsHandlers = new Set<(uri: string, diagnostics: Diagnostic[]) => void>();
  private stateChangeHandlers = new Set<(state: LSPClientState) => void>();
  private rootUri: string | null = null;

  constructor(config: LanguageServerConfig) {
    this.config = config;
    this.connection = createConnectionManager({
      serverId: config.id,
      command: config.command,
      args: config.args,
      env: config.env,
    });

    // Subscribe to connection state changes
    this.connection.onStateChange((connState) => {
      if (connState === ConnectionState.Error) {
        this.setState(LSPClientState.Error);
      } else if (connState === ConnectionState.Disconnected) {
        this.setState(LSPClientState.Stopped);
      }
    });

    // Subscribe to diagnostic notifications
    this.connection.getProtocol().onNotification('textDocument/publishDiagnostics', (params: any) => {
      this.handleDiagnostics(params);
    });
  }

  /**
   * Get the current state of the client
   */
  getState(): LSPClientState {
    return this.state;
  }

  /**
   * Get the server capabilities
   */
  getCapabilities(): LSPCapabilities {
    return this.capabilities;
  }

  /**
   * Get the raw server capabilities from initialize response
   */
  getServerCapabilities(): InitializeResult['capabilities'] | null {
    return this.serverCapabilities;
  }

  /**
   * Set the workspace root URI
   */
  setRootUri(uri: string): void {
    this.rootUri = uri;
  }

  /**
   * Start the language server
   */
  async start(): Promise<void> {
    if (this.state !== LSPClientState.Stopped) {
      console.debug(`[LSP] Client ${this.config.id} already started`);
      return;
    }

    this.setState(LSPClientState.Starting);

    try {
      // Connect to the language server
      await this.connection.connect({
        serverId: this.config.id,
        command: this.config.command,
        args: this.config.args,
        env: this.config.env,
      });

      // Initialize the server
      await this.initialize();

      // Send initialized notification
      this.connection.sendNotification('initialized', {});

      this.setState(LSPClientState.Running);
      console.info(`[LSP] Server started: ${this.config.name}`);
    } catch (error) {
      console.error(`[LSP] Failed to start server: ${this.config.name}`, error);
      this.setState(LSPClientState.Error);
      throw error;
    }
  }

  /**
   * Stop the language server
   */
  async stop(): Promise<void> {
    if (this.state === LSPClientState.Stopped) {
      return;
    }

    console.info(`[LSP] Stopping language server: ${this.config.name}`);

    try {
      // Send shutdown request
      await this.shutdown();

      // Send exit notification
      this.connection.sendNotification('exit', {});

      // Disconnect
      await this.connection.disconnect();

      this.setState(LSPClientState.Stopped);
      this.documents.clear();
      this.serverCapabilities = null;
      this.capabilities = {};
      console.info(`[LSP] Language server stopped: ${this.config.name}`);
    } catch (error) {
      console.error(`[LSP] Error stopping language server: ${this.config.name}`, error);
      this.setState(LSPClientState.Error);
    }
  }

  /**
   * Open a document
   */
  async openDocument(uri: string, languageId: string, content: string): Promise<void> {
    const document: LSPDocument = {
      uri,
      languageId,
      version: 1,
      content,
    };

    this.documents.set(uri, document);

    // Send textDocument/didOpen notification
    if (this.state === LSPClientState.Running) {
      this.connection.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId,
          version: 1,
          text: content,
        },
      });
    }

    console.debug(`[LSP] Document opened: ${uri}`);
  }

  /**
   * Update document content
   */
  async updateDocument(uri: string, content: string, version?: number): Promise<void> {
    const document = this.documents.get(uri);
    if (!document) {
      console.warn(`[LSP] Document not found: ${uri}`);
      return;
    }

    const newVersion = version ?? document.version + 1;
    document.content = content;
    document.version = newVersion;

    // Send textDocument/didChange notification
    if (this.state === LSPClientState.Running) {
      this.connection.sendNotification('textDocument/didChange', {
        textDocument: {
          uri,
          version: newVersion,
        },
        contentChanges: [
          {
            text: content,
          },
        ],
      });
    }

    console.debug(`[LSP] Document updated: ${uri} (v${newVersion})`);
  }

  /**
   * Close a document
   */
  async closeDocument(uri: string): Promise<void> {
    this.documents.delete(uri);

    // Send textDocument/didClose notification
    if (this.state === LSPClientState.Running) {
      this.connection.sendNotification('textDocument/didClose', {
        textDocument: { uri },
      });
    }

    console.debug(`[LSP] Document closed: ${uri}`);
  }

  /**
   * Request completions
   */
  async getCompletions(uri: string, line: number, character: number): Promise<CompletionItem[]> {
    if (!this.capabilities.completionProvider) {
      return [];
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/completion', {
        textDocument: { uri },
        position: { line, character },
      });

      if (!result) {
        return [];
      }

      // Result can be CompletionItem[] or CompletionList
      if (Array.isArray(result)) {
        return result;
      }

      return result.items || [];
    } catch (error) {
      console.error(`[LSP] Error getting completions:`, error);
      return [];
    }
  }

  /**
   * Request hover information
   */
  async getHover(uri: string, line: number, character: number): Promise<Hover | null> {
    if (!this.capabilities.hoverProvider) {
      return null;
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/hover', {
        textDocument: { uri },
        position: { line, character },
      });

      return result || null;
    } catch (error) {
      console.error(`[LSP] Error getting hover:`, error);
      return null;
    }
  }

  /**
   * Request signature help
   */
  async getSignatureHelp(uri: string, line: number, character: number): Promise<SignatureHelp | null> {
    if (!this.capabilities.signatureHelpProvider) {
      return null;
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/signatureHelp', {
        textDocument: { uri },
        position: { line, character },
      });

      return result || null;
    } catch (error) {
      console.error(`[LSP] Error getting signature help:`, error);
      return null;
    }
  }

  /**
   * Request definition location
   */
  async getDefinition(uri: string, line: number, character: number): Promise<Location[]> {
    if (!this.capabilities.definitionProvider) {
      return [];
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/definition', {
        textDocument: { uri },
        position: { line, character },
      });

      if (!result) {
        return [];
      }

      // Result can be Location, Location[], or LocationLink[]
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error(`[LSP] Error getting definition:`, error);
      return [];
    }
  }

  /**
   * Request references
   */
  async getReferences(uri: string, line: number, character: number): Promise<Location[]> {
    if (!this.capabilities.referencesProvider) {
      return [];
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/references', {
        textDocument: { uri },
        position: { line, character },
        context: { includeDeclaration: true },
      });

      return result || [];
    } catch (error) {
      console.error(`[LSP] Error getting references:`, error);
      return [];
    }
  }

  /**
   * Request document symbols
   */
  async getDocumentSymbols(uri: string): Promise<DocumentSymbol[]> {
    if (!this.capabilities.documentSymbolProvider) {
      return [];
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri },
      });

      return result || [];
    } catch (error) {
      console.error(`[LSP] Error getting document symbols:`, error);
      return [];
    }
  }

  /**
   * Format document
   */
  async formatDocument(uri: string, options: { tabSize: number; insertSpaces: boolean }): Promise<WorkspaceEdit | null> {
    if (!this.capabilities.documentFormattingProvider) {
      return null;
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/formatting', {
        textDocument: { uri },
        options,
      });

      return result || null;
    } catch (error) {
      console.error(`[LSP] Error formatting document:`, error);
      return null;
    }
  }

  /**
   * Format document range
   */
  async formatRange(uri: string, range: Range, options: { tabSize: number; insertSpaces: boolean }): Promise<WorkspaceEdit | null> {
    if (!this.capabilities.documentRangeFormattingProvider) {
      return null;
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/rangeFormatting', {
        textDocument: { uri },
        range,
        options,
      });

      return result || null;
    } catch (error) {
      console.error(`[LSP] Error formatting range:`, error);
      return null;
    }
  }

  /**
   * Rename symbol
   */
  async rename(uri: string, line: number, character: number, newName: string): Promise<WorkspaceEdit | null> {
    if (!this.capabilities.renameProvider) {
      return null;
    }

    try {
      const result: any = await this.connection.sendRequest('textDocument/rename', {
        textDocument: { uri },
        position: { line, character },
        newName,
      });

      return result || null;
    } catch (error) {
      console.error(`[LSP] Error renaming symbol:`, error);
      return null;
    }
  }

  /**
   * Subscribe to diagnostics updates
   */
  onDiagnostics(handler: (uri: string, diagnostics: Diagnostic[]) => void): () => void {
    this.diagnosticsHandlers.add(handler);
    return () => this.diagnosticsHandlers.delete(handler);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: (state: LSPClientState) => void): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }

  // Private methods

  /**
   * Initialize the language server
   */
  private async initialize(): Promise<void> {
    const params: InitializeParams = {
      processId: null, // We're running in browser/Tauri, not Node.js
      clientInfo: {
        name: 'Rainy Code',
        version: '1.0.0',
      },
      rootUri: this.rootUri,
      capabilities: {
        workspace: {
          applyEdit: true,
          workspaceEdit: {
            documentChanges: true,
          },
          didChangeConfiguration: {
            dynamicRegistration: false,
          },
          didChangeWatchedFiles: {
            dynamicRegistration: false,
          },
          executeCommand: {
            dynamicRegistration: false,
          },
        },
        textDocument: {
          synchronization: {
            dynamicRegistration: false,
            willSave: false,
            willSaveWaitUntil: false,
            didSave: false,
          },
          completion: {
            dynamicRegistration: false,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              deprecatedSupport: true,
              preselectSupport: true,
            },
            contextSupport: true,
          },
          hover: {
            dynamicRegistration: false,
            contentFormat: ['markdown', 'plaintext'],
          },
          signatureHelp: {
            dynamicRegistration: false,
            signatureInformation: {
              documentationFormat: ['markdown', 'plaintext'],
              parameterInformation: {
                labelOffsetSupport: true,
              },
            },
          },
          definition: {
            dynamicRegistration: false,
            linkSupport: true,
          },
          references: {
            dynamicRegistration: false,
          },
          documentSymbol: {
            dynamicRegistration: false,
            hierarchicalDocumentSymbolSupport: true,
          },
          codeAction: {
            dynamicRegistration: false,
            codeActionLiteralSupport: {
              codeActionKind: {
                valueSet: [
                  'quickfix',
                  'refactor',
                  'refactor.extract',
                  'refactor.inline',
                  'refactor.rewrite',
                  'source',
                  'source.organizeImports',
                ],
              },
            },
          },
          formatting: {
            dynamicRegistration: false,
          },
          rangeFormatting: {
            dynamicRegistration: false,
          },
          rename: {
            dynamicRegistration: false,
            prepareSupport: true,
          },
          publishDiagnostics: {
            relatedInformation: true,
            tagSupport: {
              valueSet: [1, 2], // Unnecessary = 1, Deprecated = 2
            },
          },
        },
      },
      initializationOptions: this.config.initializationOptions,
    };

    const result = await this.connection.sendRequest('initialize', params) as InitializeResult;

    // Store server capabilities
    this.serverCapabilities = result.capabilities;

    // Extract simplified capabilities
    this.capabilities = {
      completionProvider: !!result.capabilities.completionProvider,
      hoverProvider: !!result.capabilities.hoverProvider,
      signatureHelpProvider: !!result.capabilities.signatureHelpProvider,
      definitionProvider: !!result.capabilities.definitionProvider,
      referencesProvider: !!result.capabilities.referencesProvider,
      documentSymbolProvider: !!result.capabilities.documentSymbolProvider,
      documentFormattingProvider: !!result.capabilities.documentFormattingProvider,
      documentRangeFormattingProvider: !!result.capabilities.documentRangeFormattingProvider,
      renameProvider: !!result.capabilities.renameProvider,
      codeActionProvider: !!result.capabilities.codeActionProvider,
      diagnosticProvider: true, // Always available via notifications
    };

    console.info(`[LSP] Server initialized: ${this.config.name}`, {
      serverInfo: result.serverInfo,
      capabilities: this.capabilities,
    });
  }

  /**
   * Shutdown the language server
   */
  private async shutdown(): Promise<void> {
    try {
      await this.connection.sendRequest('shutdown', null);
    } catch (error) {
      console.error(`[LSP] Error during shutdown:`, error);
    }
  }

  /**
   * Handle diagnostics notification from server
   */
  private handleDiagnostics(params: any): void {
    const uri = params.uri;
    const diagnostics = params.diagnostics || [];

    this.diagnosticsHandlers.forEach(handler => {
      try {
        handler(uri, diagnostics);
      } catch (error) {
        console.error(`[LSP] Error in diagnostics handler:`, error);
      }
    });
  }

  /**
   * Update client state
   */
  private setState(state: LSPClientState): void {
    this.state = state;
    this.stateChangeHandlers.forEach(handler => handler(state));
  }
}
