/**
 * Terminal Service Layer
 *
 * Provides a centralized service for managing terminal sessions with:
 * - Event coordination and debouncing
 * - Session lifecycle management
 * - Error recovery and retry logic
 * - State synchronization
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export type SessionState = "starting" | "active" | "exited" | "error";

export interface ShellProfile {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface TerminalSessionInfo {
  id: string;
  shell_cmd: string;
  state: SessionState;
  created_at: number;
  cwd?: string;
}

interface TerminalDataEvent {
  id: string;
  data: string;
}

interface TerminalStateEvent {
  id: string;
  state: SessionState;
}

interface TerminalExitEvent {
  id: string;
}

interface TerminalErrorEvent {
  id: string;
  error: string;
}

type DataCallback = (id: string, data: string) => void;
type StateCallback = (id: string, state: SessionState) => void;
type ExitCallback = (id: string) => void;
type ErrorCallback = (id: string, error: string) => void;

class TerminalService {
  private dataCallbacks: Set<DataCallback> = new Set();
  private stateCallbacks: Set<StateCallback> = new Set();
  private exitCallbacks: Set<ExitCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  private unlistenData: UnlistenFn | null = null;
  private unlistenState: UnlistenFn | null = null;
  private unlistenExit: UnlistenFn | null = null;
  private unlistenError: UnlistenFn | null = null;

  private initialized = false;
  private resizeDebounceTimers = new Map<string, NodeJS.Timeout>();
  private writeBuffers = new Map<string, { buffer: string; timer: NodeJS.Timeout | null }>();

  private readonly RESIZE_DEBOUNCE_MS = 150;
  private readonly WRITE_BUFFER_MS = 16; // ~60fps

  /**
   * Initialize the terminal service and set up event listeners
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn("TerminalService already initialized");
      return;
    }

    try {
      // Set up event listeners
      this.unlistenData = await listen<TerminalDataEvent>("terminal/data", (event) => {
        const { id, data } = event.payload;
        this.dataCallbacks.forEach((cb) => {
          try {
            cb(id, data);
          } catch (error) {
            console.error("Error in terminal data callback:", error);
          }
        });
      });

      this.unlistenState = await listen<TerminalStateEvent>("terminal/state", (event) => {
        const { id, state } = event.payload;
        this.stateCallbacks.forEach((cb) => {
          try {
            cb(id, state);
          } catch (error) {
            console.error("Error in terminal state callback:", error);
          }
        });
      });

      this.unlistenExit = await listen<TerminalExitEvent>("terminal/exit", (event) => {
        const { id } = event.payload;
        this.exitCallbacks.forEach((cb) => {
          try {
            cb(id);
          } catch (error) {
            console.error("Error in terminal exit callback:", error);
          }
        });
      });

      this.unlistenError = await listen<TerminalErrorEvent>("terminal/error", (event) => {
        const { id, error } = event.payload;
        this.errorCallbacks.forEach((cb) => {
          try {
            cb(id, error);
          } catch (error) {
            console.error("Error in terminal error callback:", error);
          }
        });
      });

      this.initialized = true;
      console.log("TerminalService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize TerminalService:", error);
      throw error;
    }
  }

  /**
   * Clean up resources and remove event listeners
   */
  async destroy(): Promise<void> {
    if (!this.initialized) return;

    try {
      this.unlistenData?.();
      this.unlistenState?.();
      this.unlistenExit?.();
      this.unlistenError?.();

      this.dataCallbacks.clear();
      this.stateCallbacks.clear();
      this.exitCallbacks.clear();
      this.errorCallbacks.clear();

      // Clear all debounce timers
      this.resizeDebounceTimers.forEach((timer) => clearTimeout(timer));
      this.resizeDebounceTimers.clear();

      // Flush and clear write buffers
      for (const [_id, { timer }] of this.writeBuffers.entries()) {
        if (timer) clearTimeout(timer);
      }
      this.writeBuffers.clear();

      this.initialized = false;
      console.log("TerminalService destroyed");
    } catch (error) {
      console.error("Error destroying TerminalService:", error);
    }
  }

  // Event listener registration
  onData(callback: DataCallback): () => void {
    this.dataCallbacks.add(callback);
    return () => this.dataCallbacks.delete(callback);
  }

  onState(callback: StateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  onExit(callback: ExitCallback): () => void {
    this.exitCallbacks.add(callback);
    return () => this.exitCallbacks.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  // Terminal operations with error handling

  /**
   * Create a new terminal session with retry logic
   */
  async create(options: {
    shell?: string;
    cwd?: string;
    cols?: number;
    rows?: number;
  } = {}): Promise<string> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Terminal creation retry attempt ${attempt}/${maxRetries}`);
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        }

        const id = await invoke<string>("terminal_create", options);

        if (attempt > 0) {
          console.log(`Terminal created successfully on attempt ${attempt + 1}`);
        }

        return id;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to create terminal (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

        if (attempt === maxRetries) {
          // Last attempt failed
          break;
        }
      }
    }

    // All attempts failed
    const errorMsg = lastError?.message || 'Unknown error';
    console.error(`Terminal creation failed after ${maxRetries + 1} attempts:`, errorMsg);
    throw new Error(`Failed to create terminal session: ${errorMsg}`);
  }

  /**
   * Write data to terminal with buffering
   */
  async write(id: string, data: string): Promise<void> {
    const existing = this.writeBuffers.get(id);

    if (existing) {
      // Append to buffer
      existing.buffer += data;

      // Clear existing timer
      if (existing.timer) {
        clearTimeout(existing.timer);
      }

      // Set new flush timer
      existing.timer = setTimeout(() => this.flushWriteBuffer(id), this.WRITE_BUFFER_MS);
    } else {
      // Create new buffer
      const timer = setTimeout(() => this.flushWriteBuffer(id), this.WRITE_BUFFER_MS);
      this.writeBuffers.set(id, { buffer: data, timer });
    }
  }

  /**
   * Flush buffered writes immediately
   */
  private async flushWriteBuffer(sessionId: string): Promise<void> {
    const entry = this.writeBuffers.get(sessionId);
    if (!entry || !entry.buffer) return;

    const { buffer } = entry;
    this.writeBuffers.delete(sessionId);

    try {
      await invoke("terminal_write", { id: sessionId, data: buffer });
    } catch (error) {
      console.error(`Failed to write to terminal ${sessionId}:`, error);
    }
  }

  /**
   * Resize terminal with debouncing
   */
  async resize(id: string, cols: number, rows: number): Promise<void> {
    // Clear existing timer
    const existingTimer = this.resizeDebounceTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced resize
    const timer = setTimeout(async () => {
      this.resizeDebounceTimers.delete(id);
      try {
        await invoke("terminal_resize", { id, cols, rows });
      } catch (error) {
        console.error(`Failed to resize terminal ${id}:`, error);
      }
    }, this.RESIZE_DEBOUNCE_MS);

    this.resizeDebounceTimers.set(id, timer);
  }

  /**
   * Kill a terminal session
   */
  async kill(id: string): Promise<void> {
    try {
      // Flush any pending writes
      await this.flushWriteBuffer(id);

      // Clear timers
      const resizeTimer = this.resizeDebounceTimers.get(id);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
        this.resizeDebounceTimers.delete(id);
      }

      await invoke("terminal_kill", { id });
    } catch (error) {
      console.error(`Failed to kill terminal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Change terminal working directory
   */
  async changeDirectory(id: string, path: string): Promise<void> {
    try {
      await invoke("terminal_change_directory", { id, path });
    } catch (error) {
      console.error(`Failed to change directory for terminal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get terminal session info
   */
  async getSession(id: string): Promise<TerminalSessionInfo> {
    try {
      return await invoke<TerminalSessionInfo>("terminal_get_session", { id });
    } catch (error) {
      console.error(`Failed to get session info for terminal ${id}:`, error);
      throw error;
    }
  }

  /**
   * List all active terminal sessions
   */
  async listSessions(): Promise<TerminalSessionInfo[]> {
    try {
      return await invoke<TerminalSessionInfo[]>("terminal_list_sessions");
    } catch (error) {
      console.error("Failed to list terminal sessions:", error);
      throw error;
    }
  }

  /**
   * Get available shell profiles
   */
  async getProfiles(): Promise<ShellProfile[]> {
    try {
      return await invoke<ShellProfile[]>("terminal_get_profiles");
    } catch (error) {
      console.error("Failed to get shell profiles:", error);
      throw error;
    }
  }

  /**
   * Initialize and detect shell profiles
   */
  async initProfiles(): Promise<ShellProfile[]> {
    try {
      return await invoke<ShellProfile[]>("terminal_init_profiles");
    } catch (error) {
      console.error("Failed to initialize shell profiles:", error);
      throw error;
    }
  }
}

// Singleton instance
let terminalServiceInstance: TerminalService | null = null;

/**
 * Get the terminal service singleton
 */
export function getTerminalService(): TerminalService {
  if (!terminalServiceInstance) {
    terminalServiceInstance = new TerminalService();
  }
  return terminalServiceInstance;
}

/**
 * Initialize the terminal service (call once on app startup)
 */
export async function initTerminalService(): Promise<TerminalService> {
  const service = getTerminalService();
  await service.initialize();
  return service;
}

/**
 * Destroy the terminal service (call on app shutdown)
 */
export async function destroyTerminalService(): Promise<void> {
  if (terminalServiceInstance) {
    await terminalServiceInstance.destroy();
    terminalServiceInstance = null;
  }
}
