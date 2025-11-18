/**
 * Extension Worker
 *
 * Web Worker entry point for extension code execution.
 * Runs in an isolated environment and communicates with the host via messages.
 */

import {
  ExtensionMessage,
  ExtensionMessageType,
  InitializeMessageData,
  ActivateMessageData,
} from './types';
import { createModuleLoader, ModuleLoader } from './ModuleLoader';
import { createVSCodeAPI } from './VSCodeAPIShim';
import { createExtensionContext, ExtensionContext } from './ExtensionContext';

/**
 * Worker state
 */
let extensionId: string | null = null;
let manifest: any = null;
let moduleLoader: ModuleLoader | null = null;
let extensionContext: ExtensionContext | null = null;
let vscodeAPI: any = null;
let activatedExtension: any = null;
let isInitialized = false;
let extensionBasePath: string | null = null;
let isTauriEnvironment = false; // Set during initialization
const fileContentCache = new Map<string, string>();
const cacheAccessOrder: string[] = [];
const MAX_CACHE_SIZE = 50; // Cache only 50 most recent files

/**
 * NOTE: Webview providers and message handlers are stored in the worker global scope
 * using namespaced keys to prevent conflicts:
 * - __rainyAether_webviewProviders: Maps viewId to provider instance
 * - __rainyAether_webviewMessageHandlers: Maps viewId to message handler function
 *
 * This ensures they persist across worker message cycles and are accessible
 * from both VSCodeAPIShim and the worker message handlers.
 */

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<ExtensionMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case ExtensionMessageType.Initialize:
        await handleInitialize(message);
        break;

      case ExtensionMessageType.Activate:
        await handleActivate(message);
        break;

      case ExtensionMessageType.Deactivate:
        await handleDeactivate(message);
        break;

      case ExtensionMessageType.ResolveWebview:
        await handleResolveWebview(message);
        break;

      case ExtensionMessageType.WebviewMessage:
        await handleWebviewMessage(message);
        break;

      case ExtensionMessageType.APIResponse:
        // API responses are handled by the API call promise
        break;

      case ExtensionMessageType.Event:
        await handleEvent(message);
        break;

      default:
        console.warn(`[ExtensionWorker] Unknown message type: ${message.type}`);
    }
  } catch (error) {
    sendError(message.id, error);
  }
};

/**
 * Initialize the worker
 */
async function handleInitialize(message: ExtensionMessage): Promise<void> {
  const data = message.data as InitializeMessageData;

  extensionId = data.extensionId;
  manifest = data.manifest;
  extensionBasePath = data.extensionPath;
  isTauriEnvironment = data.isTauriEnvironment || false;

  log('info', `Initializing extension ${extensionId} (Tauri: ${isTauriEnvironment})`);

  // Create extension context
  extensionContext = createExtensionContext({
    extensionId: data.extensionId,
    extensionPath: data.extensionPath,
    storagePath: data.storagePath,
    globalStoragePath: data.globalStoragePath,
  });

  // Create VS Code API
  vscodeAPI = createVSCodeAPI(extensionContext, async (namespace, method, args) => {
    // Call API on host
    return await callHostAPI(namespace, method, args);
  });

  // Make vscode API available globally
  (self as any).vscode = vscodeAPI;

  // Create module loader
  moduleLoader = createModuleLoader(
    {
      extensionPath: data.extensionPath,
      mainModulePath: manifest.main || './extension.js',
    },
    async (path: string) => {
      return await readExtensionFile(path);
    }
  );

  isInitialized = true;

  // Send success response
  sendResponse(message.id, {});
}

/**
 * Activate the extension
 */
async function handleActivate(message: ExtensionMessage): Promise<void> {
  if (!isInitialized || !moduleLoader || !extensionContext) {
    throw new Error('Worker not initialized');
  }

  const data = message.data as ActivateMessageData;

  log('info', `Activating extension ${extensionId} (event: ${data.activationEvent})`);

  try {
    // Load main module
    const mainModule = await moduleLoader.loadMainModule();

    // Call activate function if it exists
    if (mainModule && typeof mainModule.activate === 'function') {
      activatedExtension = mainModule;

      // Call activate with context
      await mainModule.activate(extensionContext);

      log('info', `Extension ${extensionId} activated successfully`);
    } else {
      log('warn', `Extension ${extensionId} has no activate function`);
    }

    // Send success response
    sendResponse(message.id, {});
  } catch (error) {
    log('error', `Failed to activate extension ${extensionId}:`, error);
    throw error;
  }
}

/**
 * Deactivate the extension
 */
async function handleDeactivate(message: ExtensionMessage): Promise<void> {
  if (!activatedExtension) {
    sendResponse(message.id, {});
    return;
  }

  log('info', `Deactivating extension ${extensionId}`);

  try {
    // Call deactivate function if it exists
    if (typeof activatedExtension.deactivate === 'function') {
      await activatedExtension.deactivate();
    }

    // Dispose subscriptions
    if (extensionContext) {
      extensionContext.disposeSubscriptions();
    }

    // Clear module cache
    if (moduleLoader) {
      moduleLoader.clearCache();
    }

    fileContentCache.clear();

    activatedExtension = null;

    log('info', `Extension ${extensionId} deactivated successfully`);

    sendResponse(message.id, {});
  } catch (error) {
    log('error', `Error during deactivation:`, error);
    throw error;
  }
}

/**
 * Handle event from host
 */
async function handleEvent(message: ExtensionMessage): Promise<void> {
  const { eventName, args } = message.data;

  log('debug', `Received event: ${eventName}`, args);

  // Events can be dispatched to extension if it has event handlers
  // For now, we just log them
}

/**
 * Handle webview resolution request from host
 */
async function handleResolveWebview(message: ExtensionMessage): Promise<void> {
  const { viewId } = message.data;

  log('info', `Resolving webview: ${viewId}`);

  try {
    // Get the provider for this view ID from worker-level storage
    const workerGlobal = self as any;
    const providers = workerGlobal.__rainyAether_webviewProviders;

    if (!providers || !(providers instanceof Map)) {
      log('error', 'No webview providers map found in worker global');
      throw new Error('No webview providers registered');
    }

    const provider = providers.get(viewId);
    if (!provider) {
      log('error', `No provider found for view ${viewId}. Available providers: ${Array.from(providers.keys()).join(', ')}`);
      throw new Error(`No provider found for view ${viewId}`);
    }

    log('info', `Found provider for ${viewId}, creating webview view object`);

    // Create a proper CancellationToken
    const cancellationToken = {
      isCancellationRequested: false,
      onCancellationRequested: (_listener: Function) => {
        // Return disposable (listener would be called on cancellation)
        return { dispose: () => {} };
      },
    };

    // Create a proper WebviewViewResolveContext
    const resolveContext = {
      state: undefined, // Could be restored from persistence in the future
    };

    // Create a webview view object that the provider can use
    let webviewHtml = '';
    const webviewOptions: any = {
      enableScripts: true,
      enableForms: true,
      localResourceRoots: [],
    };

    const webviewView = {
      viewType: viewId,
      webview: {
        html: '',
        options: webviewOptions,
        get onDidReceiveMessage() {
          return (handler: any) => {
            // Store message handler for this view in worker-level storage
            if (!workerGlobal.__rainyAether_webviewMessageHandlers) {
              workerGlobal.__rainyAether_webviewMessageHandlers = new Map();
            }
            workerGlobal.__rainyAether_webviewMessageHandlers.set(viewId, handler);
            log('debug', `Registered message handler for webview ${viewId}`);
            return {
              dispose: () => {
                workerGlobal.__rainyAether_webviewMessageHandlers?.delete(viewId);
                log('debug', `Disposed message handler for webview ${viewId}`);
              }
            };
          };
        },
        postMessage: async (msg: any) => {
          // Send message to host to forward to webview
          log('debug', `Sending message to webview ${viewId}:`, msg);
          await callHostAPI('webview', 'postMessage', [viewId, msg]);
          return true;
        },
        asWebviewUri: (uri: any) => {
          // Convert local resource URIs to webview URIs
          // For now, just return the URI as-is
          return uri;
        },
        get cspSource() {
          return "'self'";
        },
      },
      title: undefined,
      description: undefined,
      visible: true,
      onDidDispose: (_listener: Function) => {
        // Return disposable (listener would be called on dispose)
        return { dispose: () => {} };
      },
      onDidChangeVisibility: (_listener: Function) => {
        // Return disposable (listener would be called on visibility change)
        return { dispose: () => {} };
      },
      show: (preserveFocus?: boolean) => {
        log('debug', `webviewView.show() called for ${viewId}, preserveFocus: ${preserveFocus}`);
        // No-op - already handled by host
      },
      dispose: () => {
        log('debug', `webviewView.dispose() called for ${viewId}`);
        // No-op
      },
    };

    // Intercept HTML setter
    Object.defineProperty(webviewView.webview, 'html', {
      get: () => webviewHtml,
      set: (value: string) => {
        log('debug', `Setting webview HTML for ${viewId}, length: ${value.length}`);
        webviewHtml = value;
      },
      enumerable: true,
      configurable: true,
    });

    // Intercept options setter
    Object.defineProperty(webviewView.webview, 'options', {
      get: () => webviewOptions,
      set: (value: any) => {
        log('debug', `Setting webview options for ${viewId}:`, value);
        Object.assign(webviewOptions, value);
      },
      enumerable: true,
      configurable: true,
    });

    // Call the provider's resolveWebviewView method with proper context and token
    if (provider.resolveWebviewView) {
      log('info', `Calling resolveWebviewView for ${viewId}`);
      await provider.resolveWebviewView(webviewView, resolveContext, cancellationToken);
      log('info', `resolveWebviewView completed for ${viewId}`);
    } else {
      log('warn', `Provider for ${viewId} has no resolveWebviewView method`);
    }

    // Send the HTML back to the host
    sendMessage({
      type: ExtensionMessageType.WebviewResolved,
      id: message.id,
      data: {
        viewId,
        html: webviewHtml,
        options: webviewOptions,
      },
    });

    log('info', `Webview ${viewId} resolved with HTML length: ${webviewHtml.length}`);
  } catch (error) {
    log('error', `Failed to resolve webview ${viewId}:`, error);
    throw error;
  }
}

/**
 * Handle message from/to webview
 */
async function handleWebviewMessage(message: ExtensionMessage): Promise<void> {
  const { viewId, messageData, direction } = message.data;

  log('debug', `Received webview message for ${viewId} (${direction}):`, messageData);

  try {
    // Only handle messages FROM webview TO extension
    // Messages from extension TO webview are handled via the webview.postMessage API
    // which calls callHostAPI('webview', 'postMessage', ...)
    if (direction === 'fromWebview') {
      // Get the message handler for this view from worker-level storage
      const workerGlobal = self as any;
      const handlers = workerGlobal.__rainyAether_webviewMessageHandlers;

      if (!handlers || !(handlers instanceof Map)) {
        log('warn', `No webview message handlers map found in worker global`);
        return;
      }

      const handler = handlers.get(viewId);
      if (!handler) {
        log('warn', `No message handler found for view ${viewId}. Available handlers: ${Array.from(handlers.keys()).join(', ')}`);
        return;
      }

      // Call the extension's onDidReceiveMessage handler
      await handler(messageData);

      log('debug', `Webview message handled for ${viewId}`);
    } else if (direction === 'toWebview') {
      // This case shouldn't normally occur since extension uses webview.postMessage()
      // which goes through callHostAPI. But we'll log it for debugging.
      log('warn', `Unexpected toWebview direction in handleWebviewMessage for ${viewId}`);
    } else {
      log('warn', `Unknown direction '${direction}' in webview message for ${viewId}`);
    }
  } catch (error) {
    log('error', `Error handling webview message for ${viewId}:`, error);
  }
}

/**
 * Call API on host
 */
async function callHostAPI(namespace: string, method: string, args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `api-${Date.now()}-${Math.random()}`;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Set up response handler
    const responseHandler = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;
      if (message.type === ExtensionMessageType.APIResponse && message.id === id) {
        self.removeEventListener('message', responseHandler);

        // Clean up timeout on response
        if (timeoutId) clearTimeout(timeoutId);

        if (message.data.success) {
          resolve(message.data.result);
        } else {
          reject(new Error(message.data.error || 'API call failed'));
        }
      }
    };

    self.addEventListener('message', responseHandler);

    // Send API call message
    sendMessage({
      type: ExtensionMessageType.APICall,
      id,
      data: {
        namespace,
        method,
        args,
      },
    });

    // Store timeout reference for cleanup
    timeoutId = setTimeout(() => {
      self.removeEventListener('message', responseHandler);
      reject(new Error('API call timeout'));
    }, 30000);
  });
}

/**
 * Read extension file from host
 */
async function readExtensionFile(path: string): Promise<string> {
  const normalizedPath = normalizeExtensionFilePath(path);

  if (fileContentCache.has(normalizedPath)) {
    // Move to end (most recently used) for LRU tracking
    const idx = cacheAccessOrder.indexOf(normalizedPath);
    if (idx > -1) {
      cacheAccessOrder.splice(idx, 1);
    }
    cacheAccessOrder.push(normalizedPath);
    return fileContentCache.get(normalizedPath)!;
  }

  // In non-Tauri environment, we cannot read extension files
  if (!isTauriEnvironment) {
    const errorMsg = 'Cannot read extension files in browser-only mode. Extension file loading requires Tauri environment.';
    log('error', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const content = await callHostAPI('workspace', 'readExtensionFile', [normalizedPath]);

    if (typeof content !== 'string') {
      throw new Error('Invalid file content received from host');
    }

    // Enforce max cache size with LRU eviction
    if (fileContentCache.size >= MAX_CACHE_SIZE) {
      const oldest = cacheAccessOrder.shift()!;
      fileContentCache.delete(oldest);
    }

    fileContentCache.set(normalizedPath, content);
    cacheAccessOrder.push(normalizedPath);
    return content;
  } catch (error) {
    log('error', `Failed to read extension file: ${normalizedPath}`, error);
    throw error;
  }
}

function normalizeExtensionFilePath(path: string): string {
  if (!path) {
    throw new Error('Path is required to read extension file');
  }

  // Normalize backslashes to forward slashes, strip leading "./" and leading slashes
  let normalized = path
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');

  // If no base path, return normalized path as-is
  if (!extensionBasePath) {
    return normalized;
  }

  // Sanitize base path and check if already prefixed
  const sanitizedBase = extensionBasePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized === sanitizedBase || normalized.startsWith(sanitizedBase + '/')) {
    return normalized;
  }

  // Join base and path, collapse duplicate slashes
  return `${sanitizedBase}/${normalized}`.replace(/\/+/g, '/');
}

/**
 * Send message to host
 */
function sendMessage(message: ExtensionMessage): void {
  self.postMessage(message);
}

/**
 * Send response to host
 */
function sendResponse(id: string | undefined, data: any): void {
  if (!id) return;

  sendMessage({
    type: ExtensionMessageType.APIResponse,
    id,
    data,
  });
}

/**
 * Send error to host
 */
function sendError(id: string | undefined, error: any): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  if (id) {
    sendMessage({
      type: ExtensionMessageType.Error,
      id,
      data: {
        message: errorMessage,
        stack: errorStack,
      },
    });
  } else {
    sendMessage({
      type: ExtensionMessageType.Error,
      data: {
        message: errorMessage,
        stack: errorStack,
      },
    });
  }
}

/**
 * Log message
 */
function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: any[]): void {
  // Send log to host
  sendMessage({
    type: ExtensionMessageType.Log,
    data: {
      level,
      message,
      args,
    },
  });

  // Also log locally for debugging
  switch (level) {
    case 'error':
      console.error(`[ExtensionWorker:${extensionId}]`, message, ...args);
      break;
    case 'warn':
      console.warn(`[ExtensionWorker:${extensionId}]`, message, ...args);
      break;
    case 'info':
      console.info(`[ExtensionWorker:${extensionId}]`, message, ...args);
      break;
    case 'debug':
      console.debug(`[ExtensionWorker:${extensionId}]`, message, ...args);
      break;
  }
}

/**
 * Error handler
 */
self.onerror = (event: Event | string) => {
  const errorMessage = typeof event === 'string' ? event : ((event as ErrorEvent).error || (event as ErrorEvent).message);
  log('error', 'Unhandled error in worker:', errorMessage);
};

/**
 * Unhandled rejection handler
 */
self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  log('error', 'Unhandled promise rejection in worker:', event.reason);
};

// Log worker startup
console.log('[ExtensionWorker] Worker started and ready');
