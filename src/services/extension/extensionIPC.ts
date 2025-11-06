/**
 * Extension IPC (Inter-Process Communication)
 *
 * This service provides secure message passing between extensions
 * and the main IDE process, with permission validation.
 */

import { ExtensionCapability } from '../../types/extension-api';
import { ExtensionPermissionsManager } from './extensionPermissions';

export enum IPCMessageType {
  // API Calls
  API_CALL = 'api:call',
  API_RESPONSE = 'api:response',
  API_ERROR = 'api:error',

  // Events
  EVENT_EMIT = 'event:emit',
  EVENT_SUBSCRIBE = 'event:subscribe',
  EVENT_UNSUBSCRIBE = 'event:unsubscribe',

  // Commands
  COMMAND_REGISTER = 'command:register',
  COMMAND_EXECUTE = 'command:execute',

  // Lifecycle
  EXTENSION_ACTIVATE = 'extension:activate',
  EXTENSION_DEACTIVATE = 'extension:deactivate',
  EXTENSION_ERROR = 'extension:error',

  // Storage
  STORAGE_GET = 'storage:get',
  STORAGE_SET = 'storage:set',
  STORAGE_DELETE = 'storage:delete',

  // File System
  FS_READ = 'fs:read',
  FS_WRITE = 'fs:write',
  FS_DELETE = 'fs:delete',
  FS_WATCH = 'fs:watch',

  // Editor
  EDITOR_GET_TEXT = 'editor:getText',
  EDITOR_SET_TEXT = 'editor:setText',
  EDITOR_GET_SELECTION = 'editor:getSelection',
  EDITOR_SET_SELECTION = 'editor:setSelection',

  // Language Features
  LANGUAGE_REGISTER_PROVIDER = 'language:registerProvider',
  LANGUAGE_UNREGISTER_PROVIDER = 'language:unregisterProvider',

  // UI
  UI_SHOW_MESSAGE = 'ui:showMessage',
  UI_SHOW_QUICK_PICK = 'ui:showQuickPick',
  UI_SHOW_INPUT_BOX = 'ui:showInputBox',
  UI_CREATE_STATUS_BAR_ITEM = 'ui:createStatusBarItem',
  UI_CREATE_WEBVIEW = 'ui:createWebview',

  // Terminal
  TERMINAL_CREATE = 'terminal:create',
  TERMINAL_WRITE = 'terminal:write',
  TERMINAL_DISPOSE = 'terminal:dispose',

  // Network
  HTTP_REQUEST = 'network:httpRequest',
  WEBSOCKET_CONNECT = 'network:websocketConnect',

  // Process
  PROCESS_SPAWN = 'process:spawn',

  // Git
  GIT_STATUS = 'git:status',
  GIT_COMMIT = 'git:commit',
  GIT_PUSH = 'git:push',
}

export interface IPCMessage {
  type: IPCMessageType;
  id: string; // Unique message ID for request/response matching
  extensionId: string;
  payload: any;
  timestamp: number;
}

export interface IPCRequest extends IPCMessage {
  capability?: ExtensionCapability;
}

export interface IPCResponse extends IPCMessage {
  success: boolean;
  result?: any;
  error?: string;
}

export type IPCHandler = (message: IPCRequest) => Promise<any>;

export class ExtensionIPC {
  private extensionId: string;
  private permissionsManager: ExtensionPermissionsManager;
  private handlers: Map<IPCMessageType, IPCHandler> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private messageIdCounter = 0;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(extensionId: string, permissionsManager: ExtensionPermissionsManager) {
    this.extensionId = extensionId;
    this.permissionsManager = permissionsManager;
    this.registerDefaultHandlers();
  }

  /**
   * Send a request and wait for response
   */
  async request<T = any>(
    type: IPCMessageType,
    payload: any,
    capability?: ExtensionCapability
  ): Promise<T> {
    // Validate capability if provided
    if (capability) {
      this.validateCapability(capability);
    }

    const messageId = this.generateMessageId();

    const message: IPCRequest = {
      type,
      id: messageId,
      extensionId: this.extensionId,
      payload,
      capability,
      timestamp: Date.now(),
    };

    return new Promise<T>((resolve, reject) => {
      // Store promise handlers
      this.pendingRequests.set(messageId, { resolve, reject });

      // Send message
      this.sendMessage(message);

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          reject(new Error(`IPC request timeout for ${type}`));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Send a one-way message (no response expected)
   */
  send(type: IPCMessageType, payload: any, capability?: ExtensionCapability): void {
    if (capability) {
      this.validateCapability(capability);
    }

    const message: IPCMessage = {
      type,
      id: this.generateMessageId(),
      extensionId: this.extensionId,
      payload,
      timestamp: Date.now(),
    };

    this.sendMessage(message);
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: IPCMessage | IPCResponse): Promise<void> {
    // Check if this is a response to a pending request
    if ('success' in message) {
      this.handleResponse(message as IPCResponse);
      return;
    }

    // Handle as a new request
    const handler = this.handlers.get(message.type);
    if (!handler) {
      console.warn(`No handler registered for IPC message type: ${message.type}`);
      return;
    }

    try {
      const result = await handler(message as IPCRequest);

      // Send response
      this.sendResponse(message.id, true, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.sendResponse(message.id, false, undefined, errorMessage);
    }
  }

  /**
   * Register a handler for a message type
   */
  registerHandler(type: IPCMessageType, handler: IPCHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(type: IPCMessageType): void {
    this.handlers.delete(type);
  }

  /**
   * Subscribe to an event
   */
  on(event: string, listener: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }

    // Also send as IPC message
    this.send(IPCMessageType.EVENT_EMIT, { event, data });
  }

  /**
   * Dispose IPC channel
   */
  dispose(): void {
    // Clear pending requests
    for (const [id, { reject }] of this.pendingRequests.entries()) {
      reject(new Error('IPC channel disposed'));
    }
    this.pendingRequests.clear();

    // Clear handlers
    this.handlers.clear();

    // Clear event listeners
    this.eventListeners.clear();
  }

  // Private methods

  private validateCapability(capability: ExtensionCapability): void {
    if (!this.permissionsManager.hasCapability(this.extensionId, capability)) {
      throw new Error(
        `Extension "${this.extensionId}" does not have permission for capability "${capability}"`
      );
    }
  }

  private generateMessageId(): string {
    return `${this.extensionId}:${++this.messageIdCounter}:${Date.now()}`;
  }

  private sendMessage(message: IPCMessage): void {
    // In a Web Worker environment, this would post a message to the worker
    // For now, we'll use the global message bus (to be implemented)

    if (typeof window !== 'undefined' && (window as any).__extensionMessageBus) {
      (window as any).__extensionMessageBus.postMessage(message);
    } else {
      // Fallback: direct handler invocation (for testing)
      console.log('IPC Message:', message);
    }
  }

  private sendResponse(id: string, success: boolean, result?: any, error?: string): void {
    const response: IPCResponse = {
      type: IPCMessageType.API_RESPONSE,
      id,
      extensionId: this.extensionId,
      payload: result,
      timestamp: Date.now(),
      success,
      result,
      error,
    };

    this.sendMessage(response);
  }

  private handleResponse(response: IPCResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn(`Received response for unknown request: ${response.id}`);
      return;
    }

    this.pendingRequests.delete(response.id);

    if (response.success) {
      pending.resolve(response.result);
    } else {
      pending.reject(new Error(response.error || 'IPC request failed'));
    }
  }

  private registerDefaultHandlers(): void {
    // Register handlers for common operations
    // These will be overridden by the actual implementation

    this.registerHandler(IPCMessageType.STORAGE_GET, async (message) => {
      // Get from storage
      return null;
    });

    this.registerHandler(IPCMessageType.STORAGE_SET, async (message) => {
      // Set to storage
      return true;
    });

    this.registerHandler(IPCMessageType.EVENT_EMIT, async (message) => {
      const { event, data } = message.payload;
      this.emit(event, data);
      return true;
    });
  }
}

/**
 * Global IPC Message Bus
 *
 * This manages message routing between all extensions and the IDE
 */
export class ExtensionIPCBus {
  private static instance: ExtensionIPCBus;
  private channels: Map<string, ExtensionIPC> = new Map();
  private globalHandlers: Map<IPCMessageType, IPCHandler[]> = new Map();

  private constructor() {
    // Set up global message bus
    if (typeof window !== 'undefined') {
      (window as any).__extensionMessageBus = this;
    }
  }

  static getInstance(): ExtensionIPCBus {
    if (!ExtensionIPCBus.instance) {
      ExtensionIPCBus.instance = new ExtensionIPCBus();
    }
    return ExtensionIPCBus.instance;
  }

  /**
   * Register an IPC channel for an extension
   */
  registerChannel(extensionId: string, ipc: ExtensionIPC): void {
    this.channels.set(extensionId, ipc);
  }

  /**
   * Unregister an IPC channel
   */
  unregisterChannel(extensionId: string): void {
    this.channels.delete(extensionId);
  }

  /**
   * Get IPC channel for an extension
   */
  getChannel(extensionId: string): ExtensionIPC | undefined {
    return this.channels.get(extensionId);
  }

  /**
   * Post a message to the bus
   */
  postMessage(message: IPCMessage): void {
    // Route to extension's IPC channel
    const channel = this.channels.get(message.extensionId);
    if (channel) {
      channel.handleMessage(message);
    }

    // Also notify global handlers
    const handlers = this.globalHandlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(message as IPCRequest).catch(error => {
          console.error('Error in global IPC handler:', error);
        });
      }
    }
  }

  /**
   * Register a global handler for a message type
   * These handlers receive messages from all extensions
   */
  registerGlobalHandler(type: IPCMessageType, handler: IPCHandler): void {
    if (!this.globalHandlers.has(type)) {
      this.globalHandlers.set(type, []);
    }
    this.globalHandlers.get(type)!.push(handler);
  }

  /**
   * Unregister a global handler
   */
  unregisterGlobalHandler(type: IPCMessageType, handler: IPCHandler): void {
    const handlers = this.globalHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Broadcast a message to all extensions
   */
  broadcast(type: IPCMessageType, payload: any): void {
    for (const [extensionId, channel] of this.channels.entries()) {
      const message: IPCMessage = {
        type,
        id: `broadcast:${Date.now()}`,
        extensionId,
        payload,
        timestamp: Date.now(),
      };
      channel.handleMessage(message);
    }
  }

  /**
   * Get all active channels
   */
  getAllChannels(): Map<string, ExtensionIPC> {
    return new Map(this.channels);
  }

  /**
   * Get statistics
   */
  getStats(): {
    channelCount: number;
    globalHandlerCount: number;
  } {
    return {
      channelCount: this.channels.size,
      globalHandlerCount: Array.from(this.globalHandlers.values())
        .reduce((sum, handlers) => sum + handlers.length, 0),
    };
  }
}

// Export singleton
export const extensionIPCBus = ExtensionIPCBus.getInstance();
