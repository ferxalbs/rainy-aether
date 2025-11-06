/**
 * Extension Sandbox
 *
 * Manages the Web Worker-based sandbox for safe extension code execution.
 * Provides message passing, lifecycle management, and error handling.
 */

import {
  ExtensionMessage,
  ExtensionMessageType,
  ExtensionSandboxConfig,
  ExtensionError,
  ExtensionErrorType,
  InitializeMessageData,
  ActivateMessageData,
  APICallMessageData,
  APIResponseMessageData,
} from './types';

/**
 * Extension sandbox class
 */
export class ExtensionSandbox {
  private worker: Worker | null = null;
  private extensionId: string;
  private config: ExtensionSandboxConfig;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private requestHandlers: Map<string, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();
  private nextRequestId = 0;
  private activationTimeout: number;
  private isInitialized = false;
  private isActivated = false;

  // Event handlers
  private onErrorHandler: ((error: ExtensionError) => void) | null = null;
  private onMessageHandler: ((message: ExtensionMessage) => void) | null = null;
  private onActivatedHandler: (() => void) | null = null;
  private onDeactivatedHandler: (() => void) | null = null;

  constructor(config: ExtensionSandboxConfig) {
    this.config = config;
    this.extensionId = config.extensionId;
    this.activationTimeout = config.activationTimeout || 10000; // 10 seconds default
  }

  /**
   * Initialize the sandbox (create Web Worker)
   */
  async initialize(): Promise<void> {
    if (this.worker) {
      throw new Error(`Sandbox for ${this.extensionId} is already initialized`);
    }

    try {
      // Create Web Worker
      // Note: The worker URL will be created by Vite's worker plugin
      this.worker = new Worker(
        new URL('./extension.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      this.worker.onmessage = (event: MessageEvent<ExtensionMessage>) => {
        this.handleWorkerMessage(event.data);
      };

      // Set up error handler
      this.worker.onerror = (error: ErrorEvent) => {
        this.handleWorkerError(error);
      };

      // Send initialization message
      await this.sendRequest<void>(ExtensionMessageType.Initialize, {
        extensionId: this.config.extensionId,
        extensionPath: this.config.extensionPath,
        manifest: this.config.manifest,
        storagePath: `${this.config.extensionPath}/storage`,
        globalStoragePath: `${this.config.extensionPath}/globalStorage`,
      } as InitializeMessageData);

      this.isInitialized = true;

      if (this.config.debug) {
        console.log(`[ExtensionSandbox] Initialized sandbox for ${this.extensionId}`);
      }
    } catch (error) {
      const extensionError: ExtensionError = {
        type: ExtensionErrorType.SandboxError,
        message: `Failed to initialize sandbox: ${error}`,
        extensionId: this.extensionId,
        stack: error instanceof Error ? error.stack : undefined,
      };
      this.emitError(extensionError);
      throw error;
    }
  }

  /**
   * Activate the extension
   */
  async activate(activationEvent: string): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error(`Sandbox for ${this.extensionId} is not initialized`);
    }

    if (this.isActivated) {
      if (this.config.debug) {
        console.warn(`[ExtensionSandbox] Extension ${this.extensionId} is already activated`);
      }
      return;
    }

    try {
      // Send activation message with timeout
      const activationPromise = this.sendRequest<void>(
        ExtensionMessageType.Activate,
        { activationEvent } as ActivateMessageData
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Activation timeout after ${this.activationTimeout}ms`));
        }, this.activationTimeout);
      });

      await Promise.race([activationPromise, timeoutPromise]);

      this.isActivated = true;

      if (this.config.debug) {
        console.log(`[ExtensionSandbox] Activated extension ${this.extensionId}`);
      }

      if (this.onActivatedHandler) {
        this.onActivatedHandler();
      }
    } catch (error) {
      const extensionError: ExtensionError = {
        type: ExtensionErrorType.ActivationFailed,
        message: `Failed to activate extension: ${error}`,
        extensionId: this.extensionId,
        stack: error instanceof Error ? error.stack : undefined,
      };
      this.emitError(extensionError);
      throw error;
    }
  }

  /**
   * Deactivate the extension
   */
  async deactivate(): Promise<void> {
    if (!this.worker) {
      return;
    }

    try {
      if (this.isActivated) {
        await this.sendRequest<void>(ExtensionMessageType.Deactivate, {});
        this.isActivated = false;

        if (this.config.debug) {
          console.log(`[ExtensionSandbox] Deactivated extension ${this.extensionId}`);
        }

        if (this.onDeactivatedHandler) {
          this.onDeactivatedHandler();
        }
      }
    } catch (error) {
      console.error(`[ExtensionSandbox] Error during deactivation:`, error);
    }
  }

  /**
   * Dispose the sandbox (terminate worker)
   */
  async dispose(): Promise<void> {
    try {
      await this.deactivate();
    } catch (error) {
      console.error(`[ExtensionSandbox] Error during deactivation before disposal:`, error);
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.messageHandlers.clear();
    this.requestHandlers.clear();
    this.isInitialized = false;
    this.isActivated = false;

    if (this.config.debug) {
      console.log(`[ExtensionSandbox] Disposed sandbox for ${this.extensionId}`);
    }
  }

  /**
   * Call VS Code API from host
   */
  async callAPI(namespace: string, method: string, args: any[]): Promise<any> {
    if (!this.worker) {
      throw new Error(`Sandbox for ${this.extensionId} is not initialized`);
    }

    try {
      const response = await this.sendRequest<APIResponseMessageData>(
        ExtensionMessageType.APICall,
        {
          namespace,
          method,
          args,
        } as APICallMessageData
      );

      if (!response.success) {
        throw new Error(response.error || 'API call failed');
      }

      return response.result;
    } catch (error) {
      const extensionError: ExtensionError = {
        type: ExtensionErrorType.APICallFailed,
        message: `API call failed (${namespace}.${method}): ${error}`,
        extensionId: this.extensionId,
        stack: error instanceof Error ? error.stack : undefined,
      };
      this.emitError(extensionError);
      throw error;
    }
  }

  /**
   * Send event to extension
   */
  sendEvent(eventName: string, ...args: any[]): void {
    if (!this.worker) {
      return;
    }

    this.sendMessage({
      type: ExtensionMessageType.Event,
      data: { eventName, args },
    });
  }

  /**
   * Register event handlers
   */
  onError(handler: (error: ExtensionError) => void): void {
    this.onErrorHandler = handler;
  }

  onMessage(handler: (message: ExtensionMessage) => void): void {
    this.onMessageHandler = handler;
  }

  onActivated(handler: () => void): void {
    this.onActivatedHandler = handler;
  }

  onDeactivated(handler: () => void): void {
    this.onDeactivatedHandler = handler;
  }

  /**
   * Get sandbox status
   */
  getStatus() {
    return {
      extensionId: this.extensionId,
      isInitialized: this.isInitialized,
      isActivated: this.isActivated,
      hasWorker: this.worker !== null,
    };
  }

  // Private methods

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(message: ExtensionMessage): void {
    if (this.config.debug) {
      console.log(`[ExtensionSandbox] Received message from ${this.extensionId}:`, message);
    }

    // Call generic message handler
    if (this.onMessageHandler) {
      this.onMessageHandler(message);
    }

    // Handle request/response pattern
    if (message.id && this.requestHandlers.has(message.id)) {
      const handler = this.requestHandlers.get(message.id)!;
      this.requestHandlers.delete(message.id);

      if (message.type === ExtensionMessageType.Error) {
        handler.reject(new Error(message.data.message || 'Unknown error'));
      } else {
        handler.resolve(message.data);
      }
      return;
    }

    // Handle specific message types
    switch (message.type) {
      case ExtensionMessageType.Log:
        this.handleLog(message.data);
        break;

      case ExtensionMessageType.Error:
        this.handleError(message.data);
        break;

      case ExtensionMessageType.APICall:
        this.handleAPICall(message);
        break;

      default:
        if (this.config.debug) {
          console.warn(`[ExtensionSandbox] Unhandled message type: ${message.type}`);
        }
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(error: ErrorEvent): void {
    const extensionError: ExtensionError = {
      type: ExtensionErrorType.SandboxError,
      message: error.message || 'Worker error',
      extensionId: this.extensionId,
      stack: error.error?.stack,
    };
    this.emitError(extensionError);
  }

  /**
   * Handle log message from worker
   */
  private handleLog(data: { level: string; message: string; args: any[] }): void {
    const prefix = `[Extension:${this.extensionId}]`;
    switch (data.level) {
      case 'error':
        console.error(prefix, data.message, ...data.args);
        break;
      case 'warn':
        console.warn(prefix, data.message, ...data.args);
        break;
      case 'info':
        console.info(prefix, data.message, ...data.args);
        break;
      case 'debug':
        console.debug(prefix, data.message, ...data.args);
        break;
      default:
        console.log(prefix, data.message, ...data.args);
    }
  }

  /**
   * Handle error message from worker
   */
  private handleError(data: ExtensionError): void {
    this.emitError(data);
  }

  /**
   * Handle API call from worker (extension calling VS Code API)
   */
  private async handleAPICall(message: ExtensionMessage): Promise<void> {
    // Future: handle API calls from extension
    // const { namespace, method, args } = message.data as APICallMessageData;

    try {
      // API calls will be handled by VSCodeAPIShim
      // For now, just acknowledge
      const response: APIResponseMessageData = {
        success: true,
        result: undefined,
      };

      this.sendMessage({
        type: ExtensionMessageType.APIResponse,
        id: message.id,
        data: response,
      });
    } catch (error) {
      const response: APIResponseMessageData = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      this.sendMessage({
        type: ExtensionMessageType.APIResponse,
        id: message.id,
        data: response,
      });
    }
  }

  /**
   * Send message to worker
   */
  private sendMessage(message: ExtensionMessage): void {
    if (!this.worker) {
      throw new Error(`Worker not initialized for ${this.extensionId}`);
    }
    this.worker.postMessage(message);
  }

  /**
   * Send request to worker and wait for response
   */
  private sendRequest<T>(type: ExtensionMessageType, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `req-${this.nextRequestId++}`;

      this.requestHandlers.set(id, { resolve, reject });

      this.sendMessage({
        type,
        id,
        data,
      });

      // Timeout for request
      setTimeout(() => {
        if (this.requestHandlers.has(id)) {
          this.requestHandlers.delete(id);
          reject(new Error(`Request timeout for ${type}`));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Emit error
   */
  private emitError(error: ExtensionError): void {
    console.error(`[ExtensionSandbox] Error in ${this.extensionId}:`, error);
    if (this.onErrorHandler) {
      this.onErrorHandler(error);
    }
  }
}

/**
 * Create extension sandbox
 */
export function createExtensionSandbox(config: ExtensionSandboxConfig): ExtensionSandbox {
  return new ExtensionSandbox(config);
}
