/**
 * VS Code LanguageClient Shim
 *
 * Provides a VS Code-compatible LanguageClient that wraps monaco-languageclient.
 * This allows extensions to create language servers using the familiar VS Code API,
 * while we handle the connection to Monaco behind the scenes.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// JSON-RPC Message types (simplified, no external dependencies)
interface JSONRPCMessage {
  jsonrpc: '2.0';
}

interface JSONRPCRequest extends JSONRPCMessage {
  id: number | string;
  method: string;
  params?: any;
}

interface JSONRPCResponse extends JSONRPCMessage {
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface JSONRPCNotification extends JSONRPCMessage {
  method: string;
  params?: any;
}

type Message = JSONRPCRequest | JSONRPCResponse | JSONRPCNotification;

// LSP action enums
export enum CloseAction {
  DoNotRestart = 1,
  Restart = 2,
}

export enum ErrorAction {
  Continue = 1,
  Shutdown = 2,
}

/**
 * Server Options - VS Code format
 */
export interface ServerOptions {
  /** Command to execute */
  command?: string;
  /** Command arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Client Options - VS Code format
 */
export interface ClientOptions {
  /** Document selector */
  documentSelector?: any[];
  /** Synchronize options */
  synchronize?: any;
  /** Diagnostics options */
  diagnosticCollectionName?: string;
  /** Initialization options */
  initializationOptions?: any;
  /** Middleware */
  middleware?: any;
  /** Error handler */
  errorHandler?: any;
  /** Output channel */
  outputChannel?: any;
}

/**
 * Language Client State
 */
export enum State {
  Stopped = 1,
  Starting = 2,
  Running = 3,
}

/**
 * LanguageClient - VS Code compatible language client
 *
 * This class mimics the VS Code LanguageClient API and manages LSP communication
 * via Tauri backend. For now, it's a simplified implementation that will be
 * enhanced with Monaco integration later.
 */
export class LanguageClient {
  private id: string;
  private name: string;
  private serverOptions: ServerOptions;
  private state: State = State.Stopped;
  private serverId: string | null = null;
  private disposables: (() => void)[] = [];
  private unlistenFunctions: UnlistenFn[] = [];
  private messageHandlers: Map<string, (params: any) => void> = new Map();
  private requestId = 0;
  private pendingRequests: Map<
    number | string,
    { resolve: (value: any) => void; reject: (error: any) => void }
  > = new Map();

  constructor(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    _clientOptions: ClientOptions // Prefixed with _ to indicate intentionally unused
  ) {
    this.id = id;
    this.name = name;
    this.serverOptions = serverOptions;

    console.log(`[LanguageClient] Created: ${name} (${id})`);
  }

  /**
   * Start the language client
   */
  async start(): Promise<void> {
    if (this.state !== State.Stopped) {
      console.warn(`[LanguageClient] Already started: ${this.name}`);
      return;
    }

    console.log(`[LanguageClient] Starting: ${this.name}`);
    this.state = State.Starting;

    try {
      // Create connection to language server
      await this.createConnection();

      this.state = State.Running;
      console.log(`[LanguageClient] Started: ${this.name}`);
    } catch (error) {
      console.error(`[LanguageClient] Failed to start: ${this.name}`, error);
      this.state = State.Stopped;
      throw error;
    }
  }

  /**
   * Stop the language client
   */
  async stop(): Promise<void> {
    if (this.state === State.Stopped) {
      return;
    }

    console.log(`[LanguageClient] Stopping: ${this.name}`);

    // Stop the language server process
    if (this.serverId) {
      try {
        await invoke('lsp_stop_server', { serverId: this.serverId });
      } catch (error) {
        console.error('[LanguageClient] Failed to stop server:', error);
      }
      this.serverId = null;
    }

    // Clean up event listeners
    for (const unlisten of this.unlistenFunctions) {
      unlisten();
    }
    this.unlistenFunctions = [];

    // Clean up disposables
    this.disposables.forEach(dispose => dispose());
    this.disposables = [];

    // Clear pending requests
    this.pendingRequests.clear();
    this.messageHandlers.clear();

    this.state = State.Stopped;
    console.log(`[LanguageClient] Stopped: ${this.name}`);
  }

  /**
   * Get current state
   */
  getState(): State {
    return this.state;
  }

  /**
   * Send request to language server
   */
  async sendRequest(method: string, params?: any): Promise<any> {
    if (this.state !== State.Running || !this.serverId) {
      throw new Error('Language client not started');
    }

    const id = ++this.requestId;
    const message: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      invoke('lsp_send_message', {
        serverId: this.serverId,
        message: JSON.stringify(message),
      }).catch((error) => {
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  /**
   * Send notification to language server
   */
  sendNotification(method: string, params?: any): void {
    if (this.state !== State.Running || !this.serverId) {
      throw new Error('Language client not started');
    }

    const message: JSONRPCNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    invoke('lsp_send_message', {
      serverId: this.serverId,
      message: JSON.stringify(message),
    }).catch((error) => {
      console.error('[LanguageClient] Failed to send notification:', error);
    });
  }

  /**
   * Register a callback for a notification from the server
   */
  onNotification(method: string, handler: (params: any) => void): void {
    this.messageHandlers.set(method, handler);
  }

  /**
   * Dispose the client
   */
  dispose(): void {
    this.stop();
  }

  /**
   * Create connection to language server via Tauri events
   */
  private async createConnection(): Promise<void> {
    if (!this.serverOptions.command) {
      throw new Error('No server command specified');
    }

    await this.createTauriConnection();
  }

  /**
   * Create Tauri event-based connection
   */
  private async createTauriConnection(): Promise<void> {
    console.log(`[LanguageClient] Starting server: ${this.serverOptions.command}`);

    // Start language server process via Tauri
    this.serverId = `${this.id}-${Date.now()}`;

    const result = await invoke<{ success: boolean; error?: string }>('lsp_start_server', {
      params: {
        serverId: this.serverId,
        command: this.serverOptions.command,
        args: this.serverOptions.args || [],
        cwd: this.serverOptions.cwd,
        env: this.serverOptions.env || {},
      },
    });

    if (!result.success) {
      throw new Error(`Failed to start language server: ${result.error}`);
    }

    console.log(`[LanguageClient] Server started with ID: ${this.serverId}`);

    // Listen to messages from language server
    const messageEvent = `lsp-message-${this.serverId}`;
    const unlistenMessages = await listen<{ message: string }>(messageEvent, (event) => {
      try {
        const message = JSON.parse(event.payload.message);
        this.handleMessage(message);
      } catch (error) {
        console.error('[LanguageClient] Failed to parse message:', error);
      }
    });
    this.unlistenFunctions.push(unlistenMessages);

    // Listen to server close events
    const closeEvent = `lsp-close-${this.serverId}`;
    const unlistenClose = await listen(closeEvent, () => {
      console.log(`[LanguageClient] Server closed: ${this.name}`);
      this.stop();
    });
    this.unlistenFunctions.push(unlistenClose);

    // Listen to server errors
    const errorEvent = `lsp-error-${this.serverId}`;
    const unlistenError = await listen<{ error: string }>(errorEvent, (event) => {
      console.error(`[LanguageClient] Server error: ${event.payload.error}`);
    });
    this.unlistenFunctions.push(unlistenError);

    console.log(`[LanguageClient] Event listeners registered for: ${this.name}`);
  }

  /**
   * Handle incoming message from language server
   */
  private handleMessage(message: Message): void {
    // Check if it's a response
    if ('id' in message && 'result' in message) {
      const response = message as JSONRPCResponse;
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        this.pendingRequests.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
      return;
    }

    // Check if it's a notification
    if ('method' in message && !('id' in message)) {
      const notification = message as JSONRPCNotification;
      const handler = this.messageHandlers.get(notification.method);
      if (handler) {
        try {
          handler(notification.params);
        } catch (error) {
          console.error('[LanguageClient] Error in notification handler:', error);
        }
      }
      return;
    }

    // Check if it's a request from server (not commonly used, but possible)
    if ('id' in message && 'method' in message) {
      console.warn('[LanguageClient] Received request from server, not supported yet:', message);
    }
  }
}

/**
 * Export for vscode-languageclient module shim
 */
export const vscodeLanguageClient = {
  LanguageClient,
  State,
  CloseAction,
  ErrorAction,
};
