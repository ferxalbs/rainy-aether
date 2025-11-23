/**
 * Tauri Transport Layer for Monaco Language Client
 * Implements MessageReader/MessageWriter interface for monaco-languageclient
 *
 * Architecture:
 * Frontend (this) <--Tauri IPC--> Rust Backend <--stdio--> typescript-language-server
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { Message } from 'vscode-languageserver-protocol';
import { AbstractMessageReader, AbstractMessageWriter, type DataCallback, type MessageReader, type MessageWriter } from 'vscode-languageclient/browser.js';
import type { MessageTransports } from 'vscode-languageclient/browser.js';

/**
 * Tauri Message Reader
 * Reads LSP messages from the language server via Tauri IPC events
 */
export class TauriMessageReader extends AbstractMessageReader implements MessageReader {
  private sessionId: number;
  private unlistenMessage: UnlistenFn | null = null;
  private unlistenClose: UnlistenFn | null = null;
  private unlistenError: UnlistenFn | null = null;

  constructor(sessionId: number) {
    super();
    this.sessionId = sessionId;
  }

  /**
   * Start listening for messages from the language server
   */
  listen(callback: DataCallback): void {
    // Set up event listeners for messages from the server
    this.setupEventListeners(callback);
  }

  /**
   * Set up event listeners for server messages
   */
  private async setupEventListeners(callback: DataCallback): Promise<void> {
    try {
      // Listen for LSP messages from the server
      this.unlistenMessage = await listen<{ message: string }>(
        `lsp-message-${this.sessionId}`,
        (event) => {
          try {
            // Parse the JSON-RPC message
            const message = JSON.parse(event.payload.message) as Message;

            // Deliver to the callback
            callback(message);
          } catch (error) {
            console.error('[TauriMessageReader] Failed to parse message:', error);
            this.fireError(error);
          }
        }
      );

      // Listen for server close events
      this.unlistenClose = await listen(
        `lsp-close-${this.sessionId}`,
        () => {
          console.info(`[TauriMessageReader] Server closed: ${this.sessionId}`);
          this.fireClose();
        }
      );

      // Listen for server error events
      this.unlistenError = await listen<{ error: string }>(
        `lsp-error-${this.sessionId}`,
        (event) => {
          const error = new Error(event.payload.error);
          console.error('[TauriMessageReader] Server error:', error);
          this.fireError(error);
        }
      );
    } catch (error) {
      console.error('[TauriMessageReader] Failed to set up listeners:', error);
      this.fireError(error);
    }
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    super.dispose();

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
  }
}

/**
 * Tauri Message Writer
 * Writes LSP messages to the language server via Tauri IPC commands
 */
export class TauriMessageWriter extends AbstractMessageWriter implements MessageWriter {
  private sessionId: number;
  private errorCount = 0;
  private writtenBytes = 0;

  constructor(sessionId: number) {
    super();
    this.sessionId = sessionId;
  }

  /**
   * Write a message to the language server
   */
  async write(message: Message): Promise<void> {
    try {
      // Serialize the message to JSON
      const serialized = JSON.stringify(message);
      const messageLength = new TextEncoder().encode(serialized).length;

      // Send via Tauri IPC to the Rust backend
      await invoke('lsp_send_message', {
        serverId: `session-${this.sessionId}`,
        message: serialized,
      });

      // Track bytes written
      this.writtenBytes += messageLength;
    } catch (error) {
      console.error('[TauriMessageWriter] Failed to write message:', error);
      this.errorCount++;
      this.fireError(error, message, this.errorCount);
      throw error;
    }
  }

  /**
   * End the writer
   */
  end(): void {
    // No-op for Tauri transport
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    super.dispose();
  }
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
