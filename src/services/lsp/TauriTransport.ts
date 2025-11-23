/**
 * Tauri Transport Layer for Monaco Language Client
 * Implements MessageReader/MessageWriter interface for monaco-languageclient
 *
 * Architecture:
 * Frontend (this) <--Tauri IPC--> Rust Backend <--stdio--> typescript-language-server
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  Message,
  MessageReader,
  MessageWriter,
  DataCallback,
  PartialMessageInfo,
  Disposable,
  Event,
  Emitter
} from 'vscode-jsonrpc';
import { Disposable as DisposableImpl } from 'vscode-jsonrpc';
import { RAL } from 'vscode-jsonrpc';

/**
 * Tauri Message Reader
 * Reads LSP messages from the language server via Tauri IPC events
 */
export class TauriMessageReader implements MessageReader {
  private sessionId: number;
  private dataCallback: DataCallback | undefined;
  private closeCallback: (() => void) | undefined;
  private errorCallback: ((error: Error) => void) | undefined;
  private unlistenMessage: UnlistenFn | null = null;
  private unlistenClose: UnlistenFn | null = null;
  private unlistenError: UnlistenFn | null = null;
  private disposed = false;

  onError: Event<Error>;
  private errorEmitter: Emitter<Error>;

  onClose: Event<void>;
  private closeEmitter: Emitter<void>;

  onPartialMessage: Event<PartialMessageInfo>;
  private partialMessageEmitter: Emitter<PartialMessageInfo>;

  constructor(sessionId: number) {
    this.sessionId = sessionId;

    // Create emitters using RAL (Runtime Abstraction Layer)
    this.errorEmitter = new RAL().messageBuffer.Emitter<Error>();
    this.onError = this.errorEmitter.event;

    this.closeEmitter = new RAL().messageBuffer.Emitter<void>();
    this.onClose = this.closeEmitter.event;

    this.partialMessageEmitter = new RAL().messageBuffer.Emitter<PartialMessageInfo>();
    this.onPartialMessage = this.partialMessageEmitter.event;
  }

  /**
   * Start listening for messages from the language server
   */
  async listen(callback: DataCallback): Promise<void> {
    this.dataCallback = callback;

    try {
      // Listen for LSP messages from the server
      this.unlistenMessage = await listen<{ message: string }>(
        `lsp-message-${this.sessionId}`,
        (event) => {
          if (this.disposed) return;

          try {
            // Parse the JSON-RPC message
            const message = JSON.parse(event.payload.message) as Message;

            // Deliver to the callback
            if (this.dataCallback) {
              this.dataCallback(message);
            }
          } catch (error) {
            console.error('[TauriMessageReader] Failed to parse message:', error);
            if (this.errorCallback) {
              this.errorCallback(error as Error);
            }
            this.errorEmitter.fire(error as Error);
          }
        }
      );

      // Listen for server close events
      this.unlistenClose = await listen(
        `lsp-close-${this.sessionId}`,
        () => {
          if (this.disposed) return;

          console.info(`[TauriMessageReader] Server closed: ${this.sessionId}`);
          if (this.closeCallback) {
            this.closeCallback();
          }
          this.closeEmitter.fire();
        }
      );

      // Listen for server error events
      this.unlistenError = await listen<{ error: string }>(
        `lsp-error-${this.sessionId}`,
        (event) => {
          if (this.disposed) return;

          const error = new Error(event.payload.error);
          console.error('[TauriMessageReader] Server error:', error);
          if (this.errorCallback) {
            this.errorCallback(error);
          }
          this.errorEmitter.fire(error);
        }
      );
    } catch (error) {
      console.error('[TauriMessageReader] Failed to set up listeners:', error);
      throw error;
    }
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    // Clean up event listeners
    if (this.unlistenMessage) {
      this.unlistenMessage();
      this.unlistenMessage = null;
    }
    if (this.unlistenClose) {
      this.unlistenClose();
      this.unlistenClose = null;
    }
    if (this.unlistenError) {
      this.unlistenError();
      this.unlistenError = null;
    }

    // Dispose emitters
    this.errorEmitter.dispose();
    this.closeEmitter.dispose();
    this.partialMessageEmitter.dispose();
  }
}

/**
 * Tauri Message Writer
 * Writes LSP messages to the language server via Tauri IPC commands
 */
export class TauriMessageWriter implements MessageWriter {
  private sessionId: number;
  private errorCallback: ((error: Error) => void) | undefined;
  private closeCallback: (() => void) | undefined;
  private disposed = false;

  onError: Event<[Error, Message | undefined, number | undefined]>;
  private errorEmitter: Emitter<[Error, Message | undefined, number | undefined]>;

  onClose: Event<void>;
  private closeEmitter: Emitter<void>;

  constructor(sessionId: number) {
    this.sessionId = sessionId;

    // Create emitters using RAL
    this.errorEmitter = new RAL().messageBuffer.Emitter<[Error, Message | undefined, number | undefined]>();
    this.onError = this.errorEmitter.event;

    this.closeEmitter = new RAL().messageBuffer.Emitter<void>();
    this.onClose = this.closeEmitter.event;
  }

  /**
   * Write a message to the language server
   */
  async write(message: Message): Promise<void> {
    if (this.disposed) {
      throw new Error('[TauriMessageWriter] Writer is disposed');
    }

    try {
      // Serialize the message to JSON
      const serialized = JSON.stringify(message);

      // Send via Tauri IPC to the Rust backend
      await invoke('lsp_send_message', {
        serverId: `session-${this.sessionId}`,
        message: serialized,
      });
    } catch (error) {
      console.error('[TauriMessageWriter] Failed to write message:', error);
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
      this.errorEmitter.fire([error as Error, message, undefined]);
      throw error;
    }
  }

  /**
   * End the writer
   */
  end(): void {
    if (this.closeCallback) {
      this.closeCallback();
    }
    this.closeEmitter.fire();
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.errorEmitter.dispose();
    this.closeEmitter.dispose();
  }
}

/**
 * Message Transports container
 */
export interface MessageTransports {
  reader: MessageReader;
  writer: MessageWriter;
}

/**
 * Create Tauri message connection for monaco-languageclient
 * This is the main entry point for creating the transport layer
 */
export async function createTauriMessageConnection(
  encoding: string = 'utf-8'
): Promise<MessageTransports> {
  if (encoding !== 'utf-8' && encoding !== 'utf8') {
    throw new Error(`[TauriTransport] Unsupported encoding: ${encoding}. Only utf-8 is supported.`);
  }

  try {
    // Connect to the language server via Tauri backend
    // This starts the typescript-language-server process
    const sessionId = await invoke<number>('lsp_start_server', {
      serverId: `typescript-${Date.now()}`,
      command: 'node_modules/.bin/typescript-language-server',
      args: ['--stdio'],
      cwd: undefined, // Will use current workspace
      env: {},
    });

    console.info(`[TauriTransport] LSP session started: ${sessionId}`);

    // Create reader and writer
    const reader = new TauriMessageReader(sessionId);
    const writer = new TauriMessageWriter(sessionId);

    return {
      reader,
      writer,
    };
  } catch (error) {
    console.error('[TauriTransport] Failed to create message connection:', error);
    throw error;
  }
}

/**
 * Helper to check if we're running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}
