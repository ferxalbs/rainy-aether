/**
 * VS Code LanguageClient Shim
 *
 * Provides a VS Code-compatible LanguageClient that wraps monaco-languageclient.
 * This allows extensions to create language servers using the familiar VS Code API,
 * while we handle the connection to Monaco behind the scenes.
 */

import { MonacoLanguageClient } from 'monaco-languageclient';
import { MessageTransports, CloseAction, ErrorAction } from 'vscode-languageclient/browser.js';
import { Message } from 'vscode-jsonrpc';
import { Emitter } from 'vscode-jsonrpc';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

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
 * LanguageClient - VS Code compatible wrapper for MonacoLanguageClient
 *
 * This class mimics the VS Code LanguageClient API while using MonacoLanguageClient
 * under the hood to provide language server functionality in Monaco editor.
 */
export class LanguageClient {
  private id: string;
  private name: string;
  private serverOptions: ServerOptions;
  private clientOptions: ClientOptions;
  private monacoClient: MonacoLanguageClient | null = null;
  private state: State = State.Stopped;
  private serverId: string | null = null;
  private disposables: (() => void)[] = [];
  private unlistenFunctions: UnlistenFn[] = [];

  constructor(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: ClientOptions
  ) {
    this.id = id;
    this.name = name;
    this.serverOptions = serverOptions;
    this.clientOptions = clientOptions;

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
      const transports = await this.createConnection();

      // Create Monaco Language Client
      this.monacoClient = new MonacoLanguageClient({
        name: this.name,
        clientOptions: {
          documentSelector: this.clientOptions.documentSelector || [{ scheme: 'file' }],
          errorHandler: {
            error: () => ({ action: ErrorAction.Continue }),
            closed: () => ({ action: CloseAction.DoNotRestart }),
          },
          middleware: this.clientOptions.middleware,
          initializationOptions: this.clientOptions.initializationOptions,
        },
        messageTransports: transports,
      });

      // Start the Monaco client
      await this.monacoClient.start();

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

    if (this.monacoClient) {
      await this.monacoClient.stop();
      this.monacoClient.dispose();
      this.monacoClient = null;
    }

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
    if (!this.monacoClient) {
      throw new Error('Language client not started');
    }
    return await this.monacoClient.sendRequest(method, params);
  }

  /**
   * Send notification to language server
   */
  sendNotification(method: string, params?: any): void {
    if (!this.monacoClient) {
      throw new Error('Language client not started');
    }
    this.monacoClient.sendNotification(method, params);
  }

  /**
   * Register a callback for a notification from the server
   */
  onNotification(method: string, handler: (params: any) => void): void {
    if (!this.monacoClient) {
      throw new Error('Language client not started');
    }
    this.monacoClient.onNotification(method, handler);
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
  private async createConnection(): Promise<MessageTransports> {
    if (!this.serverOptions.command) {
      throw new Error('No server command specified');
    }

    return await this.createTauriConnection();
  }

  /**
   * Create Tauri event-based connection
   */
  private async createTauriConnection(): Promise<MessageTransports> {
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

    // Create message queue for incoming messages
    const messageQueue: any[] = [];
    let messageCallback: ((message: any) => void) | null = null;

    // Listen to messages from language server
    const messageEvent = `lsp-message-${this.serverId}`;
    const unlistenMessages = await listen<{ message: string }>(messageEvent, (event) => {
      try {
        const message = JSON.parse(event.payload.message);

        if (messageCallback) {
          messageCallback(message);
        } else {
          messageQueue.push(message);
        }
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

    // Create message transports with proper reader/writer implementations
    const readerErrorEmitter = new Emitter<Error>();
    const writerErrorEmitter = new Emitter<[Error, Message | undefined, number | undefined]>();
    const closeEmitter = new Emitter<void>();
    const partialMessageEmitter = new Emitter<any>();

    return {
      reader: {
        onError: readerErrorEmitter.event,
        onClose: closeEmitter.event,
        onPartialMessage: partialMessageEmitter.event,
        listen: (callback: (message: Message) => void) => {
          messageCallback = callback;

          // Flush queued messages
          while (messageQueue.length > 0) {
            const message = messageQueue.shift();
            callback(message);
          }

          return {
            dispose: () => {
              messageCallback = null;
            },
          };
        },
        dispose: () => {
          readerErrorEmitter.dispose();
          partialMessageEmitter.dispose();
        },
      },
      writer: {
        onError: writerErrorEmitter.event,
        onClose: closeEmitter.event,
        write: async (message: Message) => {
          if (!this.serverId) {
            console.error('[LanguageClient] Cannot write, server not started');
            return;
          }

          try {
            await invoke('lsp_send_message', {
              serverId: this.serverId,
              message: JSON.stringify(message),
            });
          } catch (error) {
            console.error('[LanguageClient] Failed to send message:', error);
            writerErrorEmitter.fire([error as Error, message, undefined]);
          }
        },
        end: () => {
          if (this.serverId) {
            invoke('lsp_stop_server', { serverId: this.serverId }).then(() => {
              closeEmitter.fire();
            });
          }
        },
        dispose: () => {
          closeEmitter.dispose();
        },
      },
    };
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
