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

  log('info', `Initializing extension ${extensionId}`);

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
      // Read file from host
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
 * Call API on host
 */
async function callHostAPI(namespace: string, method: string, args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `api-${Date.now()}-${Math.random()}`;

    // Set up response handler
    const responseHandler = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;
      if (message.type === ExtensionMessageType.APIResponse && message.id === id) {
        self.removeEventListener('message', responseHandler);

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

    // Timeout after 30 seconds
    setTimeout(() => {
      self.removeEventListener('message', responseHandler);
      reject(new Error('API call timeout'));
    }, 30000);
  });
}

/**
 * Read extension file from host
 */
async function readExtensionFile(path: string): Promise<string> {
  // For now, we'll throw an error as file reading needs to be implemented in the host
  // In a full implementation, this would make an API call to the host
  throw new Error(`File reading not yet implemented: ${path}`);
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
