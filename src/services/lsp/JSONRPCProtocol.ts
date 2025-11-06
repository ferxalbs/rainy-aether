/**
 * JSON-RPC 2.0 Protocol Implementation
 * Implements the JSON-RPC 2.0 specification for LSP communication
 *
 * Reference: https://www.jsonrpc.org/specification
 * LSP uses JSON-RPC 2.0 with Content-Length headers for message framing
 */

/**
 * JSON-RPC 2.0 Request
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC 2.0 Response (success)
 */
export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
}

/**
 * JSON-RPC 2.0 Error Response
 */
export interface JSONRPCError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * JSON-RPC 2.0 Notification (no response expected)
 */
export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

/**
 * Any JSON-RPC message type
 */
export type JSONRPCMessage = JSONRPCRequest | JSONRPCResponse | JSONRPCError | JSONRPCNotification;

/**
 * Standard JSON-RPC error codes
 */
export enum JSONRPCErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerNotInitialized = -32002,
  UnknownErrorCode = -32001,
  RequestCancelled = -32800,
  ContentModified = -32801,
}

/**
 * Pending request tracker
 */
interface PendingRequest {
  id: string | number;
  method: string;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * JSON-RPC Protocol Handler
 * Manages message serialization, request tracking, and protocol compliance
 */
export class JSONRPCProtocol {
  private nextId = 1;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private messageHandlers = new Set<(message: JSONRPCMessage) => void>();
  private notificationHandlers = new Map<string, Set<(params: unknown) => void>>();
  private requestHandlers = new Map<string, (params: unknown) => Promise<unknown>>();

  // Timeout for requests (30 seconds default)
  private requestTimeout = 30000;

  /**
   * Create a JSON-RPC request
   */
  createRequest(method: string, params?: unknown): JSONRPCRequest {
    const id = this.nextId++;
    return {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };
  }

  /**
   * Create a JSON-RPC notification (no response expected)
   */
  createNotification(method: string, params?: unknown): JSONRPCNotification {
    return {
      jsonrpc: '2.0',
      method,
      params,
    };
  }

  /**
   * Create a JSON-RPC response
   */
  createResponse(id: string | number, result: unknown): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  /**
   * Create a JSON-RPC error response
   */
  createError(id: string | number | null, code: number, message: string, data?: unknown): JSONRPCError {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: {
        code,
        message,
        data,
      },
    };
  }

  /**
   * Send a request and wait for response
   */
  sendRequest(method: string, params?: unknown): Promise<unknown> {
    const request = this.createRequest(method, params);

    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(request.id, {
        id: request.id,
        method,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        const pending = this.pendingRequests.get(request.id);
        if (pending) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`Request timeout: ${method} (${this.requestTimeout}ms)`));
        }
      }, this.requestTimeout);

      // Override reject to clear timeout
      const originalReject = reject;
      reject = (error: Error) => {
        clearTimeout(timeoutId);
        originalReject(error);
      };

      // Override resolve to clear timeout
      const originalResolve = resolve;
      resolve = (result: unknown) => {
        clearTimeout(timeoutId);
        originalResolve(result);
      };

      // Emit the request for sending
      this.emitMessage(request);
    });
  }

  /**
   * Send a notification (no response expected)
   */
  sendNotification(method: string, params?: unknown): void {
    const notification = this.createNotification(method, params);
    this.emitMessage(notification);
  }

  /**
   * Handle an incoming message
   */
  handleMessage(message: JSONRPCMessage): void {
    // Check if it's a response or error
    if ('id' in message && ('result' in message || 'error' in message)) {
      this.handleResponse(message as JSONRPCResponse | JSONRPCError);
      return;
    }

    // Check if it's a request (has id)
    if ('id' in message && 'method' in message) {
      this.handleRequest(message as JSONRPCRequest);
      return;
    }

    // It's a notification (no id)
    if ('method' in message) {
      this.handleNotification(message as JSONRPCNotification);
      return;
    }

    console.warn('[JSON-RPC] Unknown message type:', message);
  }

  /**
   * Parse raw message with Content-Length headers (LSP format)
   */
  parseMessage(raw: string): JSONRPCMessage | null {
    try {
      // LSP messages have format:
      // Content-Length: <length>\r\n
      // \r\n
      // <json content>

      const parts = raw.split('\r\n\r\n');
      if (parts.length < 2) {
        // Try parsing as raw JSON (for non-LSP transports)
        return JSON.parse(raw) as JSONRPCMessage;
      }

      const headers = parts[0];
      const content = parts.slice(1).join('\r\n\r\n');

      // Extract Content-Length
      const lengthMatch = headers.match(/Content-Length: (\d+)/i);
      if (!lengthMatch) {
        console.warn('[JSON-RPC] Missing Content-Length header');
        return JSON.parse(content) as JSONRPCMessage;
      }

      const expectedLength = parseInt(lengthMatch[1], 10);
      if (content.length !== expectedLength) {
        console.warn(`[JSON-RPC] Content length mismatch: expected ${expectedLength}, got ${content.length}`);
      }

      return JSON.parse(content) as JSONRPCMessage;
    } catch (error) {
      console.error('[JSON-RPC] Failed to parse message:', error);
      return null;
    }
  }

  /**
   * Serialize message with Content-Length headers (LSP format)
   */
  serializeMessage(message: JSONRPCMessage): string {
    const content = JSON.stringify(message);
    // Use TextEncoder to get byte length (browser-compatible)
    const contentLength = new TextEncoder().encode(content).length;
    return `Content-Length: ${contentLength}\r\n\r\n${content}`;
  }

  /**
   * Register a handler for incoming requests from server
   */
  onRequest(method: string, handler: (params: unknown) => Promise<unknown>): () => void {
    this.requestHandlers.set(method, handler);
    return () => this.requestHandlers.delete(method);
  }

  /**
   * Register a handler for incoming notifications from server
   */
  onNotification(method: string, handler: (params: unknown) => void): () => void {
    let handlers = this.notificationHandlers.get(method);
    if (!handlers) {
      handlers = new Set();
      this.notificationHandlers.set(method, handlers);
    }
    handlers.add(handler);
    return () => handlers?.delete(handler);
  }

  /**
   * Register a handler for all outgoing messages (for transport layer)
   */
  onMessage(handler: (message: JSONRPCMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(id: string | number): void {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      this.pendingRequests.delete(id);
      pending.reject(new Error(`Request cancelled: ${pending.method}`));

      // Send cancellation notification to server
      this.sendNotification('$/cancelRequest', { id });
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const [id] of this.pendingRequests) {
      this.cancelRequest(id);
    }
  }

  /**
   * Get pending request count
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Set request timeout in milliseconds
   */
  setRequestTimeout(timeout: number): void {
    this.requestTimeout = timeout;
  }

  /**
   * Clean up old pending requests (for memory leak prevention)
   */
  cleanupStaleRequests(maxAge = 60000): void {
    const now = Date.now();
    for (const [id, pending] of this.pendingRequests) {
      if (now - pending.timestamp > maxAge) {
        this.pendingRequests.delete(id);
        pending.reject(new Error(`Request stale: ${pending.method}`));
      }
    }
  }

  // Private methods

  private handleResponse(message: JSONRPCResponse | JSONRPCError): void {
    // JSONRPCError can have null ID (for errors that can't be associated with a request)
    if (message.id === null) {
      console.warn('[JSON-RPC] Received error response with null ID:', message);
      return;
    }

    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      console.warn('[JSON-RPC] Received response for unknown request:', message.id);
      return;
    }

    this.pendingRequests.delete(message.id);

    if ('error' in message) {
      const error = new Error(message.error.message);
      (error as any).code = message.error.code;
      (error as any).data = message.error.data;
      pending.reject(error);
    } else {
      pending.resolve(message.result);
    }
  }

  private async handleRequest(request: JSONRPCRequest): Promise<void> {
    const handler = this.requestHandlers.get(request.method);

    if (!handler) {
      // Send method not found error
      const error = this.createError(
        request.id,
        JSONRPCErrorCode.MethodNotFound,
        `Method not found: ${request.method}`
      );
      this.emitMessage(error);
      return;
    }

    try {
      const result = await handler(request.params);
      const response = this.createResponse(request.id, result);
      this.emitMessage(response);
    } catch (error) {
      const errorResponse = this.createError(
        request.id,
        JSONRPCErrorCode.InternalError,
        error instanceof Error ? error.message : 'Internal error',
        error
      );
      this.emitMessage(errorResponse);
    }
  }

  private handleNotification(notification: JSONRPCNotification): void {
    const handlers = this.notificationHandlers.get(notification.method);
    if (!handlers || handlers.size === 0) {
      console.debug(`[JSON-RPC] No handler for notification: ${notification.method}`);
      return;
    }

    handlers.forEach(handler => {
      try {
        handler(notification.params);
      } catch (error) {
        console.error(`[JSON-RPC] Error in notification handler for ${notification.method}:`, error);
      }
    });
  }

  private emitMessage(message: JSONRPCMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('[JSON-RPC] Error in message handler:', error);
      }
    });
  }
}

/**
 * Create a new JSON-RPC protocol instance
 */
export function createJSONRPCProtocol(): JSONRPCProtocol {
  return new JSONRPCProtocol();
}
