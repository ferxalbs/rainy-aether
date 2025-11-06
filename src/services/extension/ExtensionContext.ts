/**
 * Extension Context
 *
 * Manages the extension context object that is passed to extensions during activation.
 * Provides storage, subscriptions, and extension-specific paths.
 */

import { IExtensionContext, IDisposable, IMemento, VSCodeUri } from './types';

/**
 * Memento implementation (key-value storage)
 */
class Memento implements IMemento {
  private storage: Map<string, any> = new Map();
  private persistCallback?: (data: Map<string, any>) => Promise<void>;

  constructor(persistCallback?: (data: Map<string, any>) => Promise<void>) {
    this.persistCallback = persistCallback;
  }

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T | undefined {
    if (this.storage.has(key)) {
      return this.storage.get(key) as T;
    }
    return defaultValue;
  }

  async update(key: string, value: any): Promise<void> {
    if (value === undefined) {
      this.storage.delete(key);
    } else {
      this.storage.set(key, value);
    }

    // Persist if callback is provided
    if (this.persistCallback) {
      await this.persistCallback(this.storage);
    }
  }

  keys(): readonly string[] {
    return Array.from(this.storage.keys());
  }

  /**
   * Load data into memento
   */
  load(data: Map<string, any>): void {
    this.storage = new Map(data);
  }

  /**
   * Get all data as a plain object
   */
  getData(): Record<string, any> {
    const data: Record<string, any> = {};
    this.storage.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }
}

/**
 * Extension Context implementation
 */
export class ExtensionContext implements IExtensionContext {
  extensionId: string;
  extensionPath: string;
  extensionUri: string;
  storagePath: string;
  globalStoragePath: string;
  subscriptions: IDisposable[] = [];
  workspaceState: IMemento;
  globalState: IMemento;
  logPath: string;

  private persistWorkspaceState?: (data: Record<string, any>) => Promise<void>;
  private persistGlobalState?: (data: Record<string, any>) => Promise<void>;

  constructor(config: ExtensionContextConfig) {
    this.extensionId = config.extensionId;
    this.extensionPath = config.extensionPath;
    this.extensionUri = VSCodeUri.file(config.extensionPath).toString();
    this.storagePath = config.storagePath || `${config.extensionPath}/storage`;
    this.globalStoragePath = config.globalStoragePath || `${config.extensionPath}/globalStorage`;
    this.logPath = config.logPath || `${config.extensionPath}/logs`;

    this.persistWorkspaceState = config.persistWorkspaceState;
    this.persistGlobalState = config.persistGlobalState;

    // Create memento instances
    this.workspaceState = new Memento(async (data) => {
      if (this.persistWorkspaceState) {
        const dataObj: Record<string, any> = {};
        data.forEach((value, key) => {
          dataObj[key] = value;
        });
        await this.persistWorkspaceState(dataObj);
      }
    });

    this.globalState = new Memento(async (data) => {
      if (this.persistGlobalState) {
        const dataObj: Record<string, any> = {};
        data.forEach((value, key) => {
          dataObj[key] = value;
        });
        await this.persistGlobalState(dataObj);
      }
    });

    // Load initial state if provided
    if (config.initialWorkspaceState) {
      this.loadWorkspaceState(config.initialWorkspaceState);
    }
    if (config.initialGlobalState) {
      this.loadGlobalState(config.initialGlobalState);
    }
  }

  /**
   * Add a subscription that will be disposed when extension is deactivated
   */
  addSubscription(disposable: IDisposable): void {
    this.subscriptions.push(disposable);
  }

  /**
   * Dispose all subscriptions
   */
  disposeSubscriptions(): void {
    for (const subscription of this.subscriptions) {
      try {
        subscription.dispose();
      } catch (error) {
        console.error(`[ExtensionContext] Error disposing subscription:`, error);
      }
    }
    this.subscriptions = [];
  }

  /**
   * Load workspace state
   */
  loadWorkspaceState(data: Record<string, any>): void {
    const map = new Map(Object.entries(data));
    (this.workspaceState as Memento).load(map);
  }

  /**
   * Load global state
   */
  loadGlobalState(data: Record<string, any>): void {
    const map = new Map(Object.entries(data));
    (this.globalState as Memento).load(map);
  }

  /**
   * Get workspace state data
   */
  getWorkspaceStateData(): Record<string, any> {
    return (this.workspaceState as Memento).getData();
  }

  /**
   * Get global state data
   */
  getGlobalStateData(): Record<string, any> {
    return (this.globalState as Memento).getData();
  }

  /**
   * Get context as serializable object
   */
  toJSON() {
    return {
      extensionId: this.extensionId,
      extensionPath: this.extensionPath,
      extensionUri: this.extensionUri,
      storagePath: this.storagePath,
      globalStoragePath: this.globalStoragePath,
      logPath: this.logPath,
      workspaceState: this.getWorkspaceStateData(),
      globalState: this.getGlobalStateData(),
    };
  }
}

/**
 * Extension context configuration
 */
export interface ExtensionContextConfig {
  extensionId: string;
  extensionPath: string;
  storagePath?: string;
  globalStoragePath?: string;
  logPath?: string;
  initialWorkspaceState?: Record<string, any>;
  initialGlobalState?: Record<string, any>;
  persistWorkspaceState?: (data: Record<string, any>) => Promise<void>;
  persistGlobalState?: (data: Record<string, any>) => Promise<void>;
}

/**
 * Create extension context
 */
export function createExtensionContext(config: ExtensionContextConfig): ExtensionContext {
  return new ExtensionContext(config);
}

/**
 * Context serialization helpers
 */
export function serializeContext(context: ExtensionContext): string {
  return JSON.stringify(context.toJSON());
}

export function deserializeContextData(data: string): {
  workspaceState: Record<string, any>;
  globalState: Record<string, any>;
} {
  const parsed = JSON.parse(data);
  return {
    workspaceState: parsed.workspaceState || {},
    globalState: parsed.globalState || {},
  };
}
