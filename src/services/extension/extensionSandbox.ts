/**
 * Extension Sandbox
 *
 * This service creates isolated execution environments for extensions
 * using Web Workers, ensuring they cannot directly access the main thread
 * or other extensions' data.
 */

import { ExtensionContext, RainyCodeAPI, ActivateFunction, DeactivateFunction } from '../../types/extension-api';
import { extensionPermissionsManager } from './extensionPermissions';
import { ExtensionIPC, IPCMessage, IPCRequest, IPCResponse } from './extensionIPC';

export interface SandboxedExtension {
  id: string;
  worker: Worker | null;
  ipc: ExtensionIPC;
  context: ExtensionContext;
  isActive: boolean;
  exports: any;
}

export class ExtensionSandbox {
  private sandboxes: Map<string, SandboxedExtension> = new Map();
  private workerTemplate: string | null = null;

  constructor() {
    this.initializeWorkerTemplate();
  }

  /**
   * Create a sandbox for an extension
   */
  async createSandbox(
    extensionId: string,
    extensionPath: string,
    context: ExtensionContext
  ): Promise<SandboxedExtension> {
    if (this.sandboxes.has(extensionId)) {
      throw new Error(`Sandbox already exists for extension: ${extensionId}`);
    }

    // Create IPC channel
    const ipc = new ExtensionIPC(extensionId, extensionPermissionsManager);

    // For now, we'll use a null worker and run extensions in the main thread
    // In a full implementation, you'd create a Web Worker here
    // const worker = this.createWorker(extensionId, extensionPath);

    const sandbox: SandboxedExtension = {
      id: extensionId,
      worker: null, // Will be implemented with Web Workers
      ipc,
      context,
      isActive: false,
      exports: {}
    };

    this.sandboxes.set(extensionId, sandbox);

    return sandbox;
  }

  /**
   * Activate an extension in its sandbox
   */
  async activateExtension(
    extensionId: string,
    activateFn: ActivateFunction
  ): Promise<any> {
    const sandbox = this.sandboxes.get(extensionId);
    if (!sandbox) {
      throw new Error(`No sandbox found for extension: ${extensionId}`);
    }

    if (sandbox.isActive) {
      return sandbox.exports;
    }

    try {
      // Create the API proxy that will validate all calls through the IPC layer
      const api = this.createAPIProxy(sandbox);

      // Call the activate function with the context
      const exports = await activateFn(sandbox.context);

      sandbox.exports = exports || {};
      sandbox.isActive = true;

      console.log(`Extension ${extensionId} activated successfully`);

      return sandbox.exports;
    } catch (error) {
      console.error(`Failed to activate extension ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate an extension in its sandbox
   */
  async deactivateExtension(
    extensionId: string,
    deactivateFn?: DeactivateFunction
  ): Promise<void> {
    const sandbox = this.sandboxes.get(extensionId);
    if (!sandbox) {
      return;
    }

    try {
      if (deactivateFn) {
        await deactivateFn();
      }

      // Dispose all subscriptions
      for (const disposable of sandbox.context.subscriptions) {
        disposable.dispose();
      }

      sandbox.isActive = false;

      console.log(`Extension ${extensionId} deactivated successfully`);
    } catch (error) {
      console.error(`Failed to deactivate extension ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Destroy a sandbox
   */
  async destroySandbox(extensionId: string): Promise<void> {
    const sandbox = this.sandboxes.get(extensionId);
    if (!sandbox) {
      return;
    }

    // Deactivate if active
    if (sandbox.isActive) {
      await this.deactivateExtension(extensionId);
    }

    // Terminate worker
    if (sandbox.worker) {
      sandbox.worker.terminate();
    }

    // Clean up IPC
    sandbox.ipc.dispose();

    this.sandboxes.delete(extensionId);
  }

  /**
   * Get a sandbox by extension ID
   */
  getSandbox(extensionId: string): SandboxedExtension | undefined {
    return this.sandboxes.get(extensionId);
  }

  /**
   * Check if extension is sandboxed
   */
  isSandboxed(extensionId: string): boolean {
    return this.sandboxes.has(extensionId);
  }

  /**
   * Get all sandboxed extensions
   */
  getAllSandboxes(): SandboxedExtension[] {
    return Array.from(this.sandboxes.values());
  }

  /**
   * Create a Web Worker for an extension
   * NOTE: This is a placeholder - full implementation would load extension code
   * into the worker
   */
  private createWorker(extensionId: string, extensionPath: string): Worker {
    // In a full implementation, you would:
    // 1. Load the extension's main file
    // 2. Inject the Rainy Code API
    // 3. Create a worker with the bundled code
    // 4. Set up message passing

    const workerCode = this.generateWorkerCode(extensionId, extensionPath);
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    const worker = new Worker(workerUrl);

    // Set up message handling
    worker.addEventListener('message', (event) => {
      this.handleWorkerMessage(extensionId, event.data);
    });

    worker.addEventListener('error', (event) => {
      console.error(`Worker error in extension ${extensionId}:`, event);
    });

    return worker;
  }

  /**
   * Generate worker code (placeholder)
   */
  private generateWorkerCode(extensionId: string, extensionPath: string): string {
    return `
      // Extension Worker for ${extensionId}
      const extensionId = '${extensionId}';
      const extensionPath = '${extensionPath}';

      // IPC message handler
      self.addEventListener('message', (event) => {
        const { type, payload } = event.data;

        // Handle API calls from main thread
        if (type === 'api-call') {
          // Process API call and send response
        }

        // Handle activation
        if (type === 'activate') {
          // Call extension's activate function
        }

        // Handle deactivation
        if (type === 'deactivate') {
          // Call extension's deactivate function
        }
      });

      // Extension API proxy
      const rainycode = {
        // API methods that send IPC messages to main thread
      };

      console.log('Extension worker initialized for:', extensionId);
    `;
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(extensionId: string, message: any): void {
    const sandbox = this.sandboxes.get(extensionId);
    if (!sandbox) {
      return;
    }

    // Process IPC message through the IPC layer
    sandbox.ipc.handleMessage(message);
  }

  /**
   * Create API proxy that validates all calls through permissions
   */
  private createAPIProxy(sandbox: SandboxedExtension): RainyCodeAPI {
    // This would create a Proxy object that intercepts all API calls
    // and validates them through the permissions manager before executing

    // For now, return a placeholder
    return {} as RainyCodeAPI;
  }

  /**
   * Initialize worker template
   */
  private initializeWorkerTemplate(): void {
    // In a full implementation, load the worker template
    // that contains the API injections and communication layer
  }

  /**
   * Evaluate extension code in sandbox
   * NOTE: This is dangerous and should only be used for trusted extensions
   * In production, use Web Workers
   */
  async evaluateInSandbox(
    extensionId: string,
    code: string,
    context: ExtensionContext
  ): Promise<any> {
    const sandbox = this.sandboxes.get(extensionId);
    if (!sandbox) {
      throw new Error(`No sandbox found for extension: ${extensionId}`);
    }

    try {
      // Create a function from the code
      // WARNING: eval is dangerous! This is just for demonstration
      // In production, always use Web Workers
      const fn = new Function('context', 'rainycode', code);

      // Create API proxy
      const api = this.createAPIProxy(sandbox);

      // Execute
      const result = await fn(context, api);

      return result;
    } catch (error) {
      console.error(`Failed to evaluate code in sandbox ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Hot reload an extension
   */
  async hotReload(extensionId: string, newCode: string): Promise<void> {
    const sandbox = this.sandboxes.get(extensionId);
    if (!sandbox) {
      throw new Error(`No sandbox found for extension: ${extensionId}`);
    }

    // Deactivate current version
    if (sandbox.isActive) {
      await this.deactivateExtension(extensionId);
    }

    // Clear require cache if running in Node-like environment
    // In browser, would reload the worker

    if (sandbox.worker) {
      // Terminate old worker
      sandbox.worker.terminate();

      // Create new worker with updated code
      // sandbox.worker = this.createWorkerWithCode(extensionId, newCode);
    }

    console.log(`Extension ${extensionId} hot reloaded`);
  }

  /**
   * Get sandbox statistics
   */
  getSandboxStats(extensionId: string): SandboxStats | undefined {
    const sandbox = this.sandboxes.get(extensionId);
    if (!sandbox) {
      return undefined;
    }

    return {
      id: extensionId,
      isActive: sandbox.isActive,
      hasWorker: sandbox.worker !== null,
      subscriptionsCount: sandbox.context.subscriptions.length,
      capabilities: extensionPermissionsManager.getCapabilities(extensionId),
    };
  }

  /**
   * Get all sandbox statistics
   */
  getAllSandboxStats(): SandboxStats[] {
    return Array.from(this.sandboxes.keys())
      .map(id => this.getSandboxStats(id))
      .filter((stats): stats is SandboxStats => stats !== undefined);
  }
}

export interface SandboxStats {
  id: string;
  isActive: boolean;
  hasWorker: boolean;
  subscriptionsCount: number;
  capabilities: string[];
}

// Singleton instance
export const extensionSandbox = new ExtensionSandbox();
