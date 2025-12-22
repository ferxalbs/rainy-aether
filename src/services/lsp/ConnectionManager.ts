/**
 * LSP Connection Manager
 * Manages connection to language servers via Tauri IPC
 *
 * Architecture:
 * Frontend (this) <--IPC--> Rust Backend <--stdio--> Language Server Process
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { JSONRPCProtocol, JSONRPCMessage } from './JSONRPCProtocol';

/**
 * Connection state
 */
export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

/**
 * Connection options
 */
export interface ConnectionOptions {
  /** Unique identifier for this connection */
  serverId: string;

  /** Command to start the language server */
  command: string;

  /** Arguments for the command */
  args?: string[];

  /** Working directory */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Connection timeout in milliseconds */
  timeout?: number;
}

/**
 * LSP Connection Manager
 * Handles communication with language servers via Tauri backend
 */
export class ConnectionManager {
  private serverId: string;
  private sessionId: number | null = null;
  private protocol: JSONRPCProtocol;
  private state: ConnectionState = ConnectionState.Disconnected;
  private stateChangeHandlers = new Set<(state: ConnectionState) => void>();
  private unlistenMessage: UnlistenFn | null = null;
  private unlistenError: UnlistenFn | null = null;
  private unlistenClose: UnlistenFn | null = null;

  constructor(options: ConnectionOptions) {
    this.serverId = options.serverId;
    this.protocol = new JSONRPCProtocol();

    // Register message handler to send via Tauri IPC
    this.protocol.onMessage((message) => {
      this.sendToServer(message);
    });
  }

  /**
   * Get the JSON-RPC protocol instance
   */
  getProtocol(): JSONRPCProtocol {
    return this.protocol;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Connect to language server
   */
  async connect(options: ConnectionOptions): Promise<void> {
    if (this.state === ConnectionState.Connected || this.state === ConnectionState.Connecting) {
      console.warn(`[LSP Connection] Already connected/connecting: ${this.serverId}`);
      return;
    }

    this.setState(ConnectionState.Connecting);

    try {
      // Start the language server via Tauri backend (using improved implementation)
      const result = await invoke<{ success: boolean; sessionId?: number; error?: string }>('lsp_start_server', {
        params: {
          serverId: this.serverId,
          command: options.command,
          args: options.args || [],
          cwd: options.cwd,
          env: options.env || {},
        }
      });

      if (!result.success || !result.sessionId) {
        throw new Error(result.error || 'Failed to start LSP server');
      }

      // Store session ID
      this.sessionId = result.sessionId;
      console.info(`[LSP Connection] Server started with session ID: ${this.sessionId}`);

      // Set up event listeners using session ID
      await this.setupEventListeners();

      this.setState(ConnectionState.Connected);
      console.info(`[LSP Connection] Connected: ${this.serverId}`);
    } catch (error) {
      this.setState(ConnectionState.Error);
      console.error(`[LSP Connection] Failed to connect: ${this.serverId}`, error);
      throw error;
    }
  }

  /**
   * Disconnect from language server
   */
  async disconnect(): Promise<void> {
    if (this.state === ConnectionState.Disconnected) {
      return;
    }

    try {
      // Cancel all pending requests
      this.protocol.cancelAllRequests();

      // Stop the language server (using improved implementation)
      await invoke('lsp_stop_server', { serverId: this.serverId });

      // Clean up event listeners
      await this.cleanupEventListeners();

      this.setState(ConnectionState.Disconnected);
      console.info(`[LSP Connection] Disconnected: ${this.serverId}`);
    } catch (error) {
      console.error(`[LSP Connection] Error during disconnect: ${this.serverId}`, error);
      throw error;
    }
  }

  /**
   * Send a request to the language server
   */
  async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (this.state !== ConnectionState.Connected) {
      throw new Error(`Cannot send request: not connected (state: ${this.state})`);
    }

    return this.protocol.sendRequest(method, params);
  }

  /**
   * Send a notification to the language server
   */
  sendNotification(method: string, params?: unknown): void {
    if (this.state !== ConnectionState.Connected) {
      console.warn(`[LSP Connection] Cannot send notification: not connected`);
      return;
    }

    this.protocol.sendNotification(method, params);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    return this.state === ConnectionState.Connected;
  }

  // Private methods

  /**
   * Set up event listeners for server messages
   */
  private async setupEventListeners(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Cannot setup event listeners: no session ID');
    }

    // Listen for messages from the language server (using session ID)
    this.unlistenMessage = await listen(`lsp-message-${this.sessionId}`, (event) => {
      const payload = event.payload as { message: string };
      this.handleServerMessage(payload.message);
    });

    // Listen for server errors (using session ID)
    this.unlistenError = await listen(`lsp-error-${this.sessionId}`, (event) => {
      const payload = event.payload as { error: string };
      console.error(`[LSP Connection] Server error:`, payload.error);
      this.setState(ConnectionState.Error);
    });

    // Listen for server close (using session ID)
    this.unlistenClose = await listen(`lsp-close-${this.sessionId}`, () => {
      console.info(`[LSP Connection] Server closed: ${this.serverId}`);
      this.setState(ConnectionState.Disconnected);
    });
  }

  /**
   * Clean up event listeners
   */
  private async cleanupEventListeners(): Promise<void> {
    if (this.unlistenMessage) {
      this.unlistenMessage();
      this.unlistenMessage = null;
    }

    if (this.unlistenError) {
      this.unlistenError();
      this.unlistenError = null;
    }

    if (this.unlistenClose) {
      this.unlistenClose();
      this.unlistenClose = null;
    }
  }

  /**
   * Handle incoming message from server
   */
  private handleServerMessage(raw: string): void {
    try {
      const message = this.protocol.parseMessage(raw);
      if (message) {
        this.protocol.handleMessage(message);
      }
    } catch (error) {
      console.error('[LSP Connection] Failed to handle server message:', error);
    }
  }

  /**
   * Send message to server via Tauri IPC
   */
  private async sendToServer(message: JSONRPCMessage): Promise<void> {
    try {
      const serialized = this.protocol.serializeMessage(message);
      await invoke('lsp_send_message', {
        serverId: this.serverId,
        message: serialized,
      });
    } catch (error) {
      console.error('[LSP Connection] Failed to send message to server:', error);
    }
  }

  /**
   * Update connection state
   */
  private setState(state: ConnectionState): void {
    if (this.state === state) {
      return;
    }

    this.state = state;
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('[LSP Connection] Error in state change handler:', error);
      }
    });
  }
}

/**
 * Create a new connection manager
 */
export function createConnectionManager(options: ConnectionOptions): ConnectionManager {
  return new ConnectionManager(options);
}
