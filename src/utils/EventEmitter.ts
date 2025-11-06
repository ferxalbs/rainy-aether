/**
 * Browser-compatible EventEmitter implementation
 * Replaces Node.js EventEmitter for browser environments
 */

// Type for event listener function
type EventListener = (...args: any[]) => void;

// Extract event names from event map
type EventKey<T> = string & keyof T;

export class EventEmitter<EventMap extends Record<string, EventListener> = Record<string, EventListener>> {
  private events: Map<string, Array<EventListener>>;

  constructor() {
    this.events = new Map();
  }

  on<K extends EventKey<EventMap>>(event: K, listener: EventMap[K]): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  off<K extends EventKey<EventMap>>(event: K, listener: EventMap[K]): this {
    if (!this.events.has(event)) {
      return this;
    }

    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }

    return this;
  }

  emit<K extends EventKey<EventMap>>(event: K, ...args: Parameters<EventMap[K]>): boolean {
    if (!this.events.has(event)) {
      return false;
    }

    const listeners = this.events.get(event)!;
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    }

    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length ?? 0;
  }

  listeners(event: string): Array<EventListener> {
    return this.events.get(event)?.slice() ?? [];
  }
}
