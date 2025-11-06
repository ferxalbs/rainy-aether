/**
 * Polyfill for Node.js async_hooks module
 *
 * LangGraph uses AsyncLocalStorage for context propagation, which relies on
 * Node.js's async_hooks module. This polyfill provides a browser-compatible
 * implementation using a simple Map-based storage.
 *
 * Note: This is a simplified implementation that works for single-threaded
 * browser/Tauri environments but doesn't provide true async context isolation
 * like Node.js's AsyncLocalStorage.
 */

class AsyncLocalStoragePolyfill<T> {
  private store = new Map<string, T>();
  private currentId = 0;

  constructor() {
    // Initialize with a default context
    this.store.set('default', {} as T);
  }

  /**
   * Run a callback with a given store value
   */
  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
    const id = `context-${this.currentId++}`;
    this.store.set(id, store);

    try {
      return callback(...args);
    } finally {
      this.store.delete(id);
    }
  }

  /**
   * Get the current store value
   */
  getStore(): T | undefined {
    // Return the most recently set store, or default
    const keys = Array.from(this.store.keys());
    if (keys.length === 0) {
      return undefined;
    }

    // Try to find a non-default context first
    const contextKeys = keys.filter(k => k.startsWith('context-'));
    if (contextKeys.length > 0) {
      return this.store.get(contextKeys[contextKeys.length - 1]);
    }

    // Fall back to default
    return this.store.get('default');
  }

  /**
   * Enter a new async context
   */
  enterWith(store: T): void {
    this.store.set('default', store);
  }

  /**
   * Exit the current async context
   */
  exit(callback: (...args: any[]) => any, ...args: any[]): any {
    return callback(...args);
  }

  /**
   * Disable the current async context
   */
  disable(): void {
    // No-op in browser environment
  }
}

/**
 * Export AsyncLocalStorage as a named export (Node.js style)
 */
export class AsyncLocalStorage<T = any> extends AsyncLocalStoragePolyfill<T> {}

/**
 * Export as default for compatibility
 */
export default {
  AsyncLocalStorage,
};
