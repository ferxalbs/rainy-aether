/**
 * Agent Server Service
 *
 * Manages communication with the Inngest/AgentKit sidecar server.
 * Uses Rust TCP probe (invoke) for health checks — no browser fetch, no console noise.
 */

import { invoke } from "@tauri-apps/api/core";

// ===========================
// Types
// ===========================

export interface AgentServerStatus {
  running: boolean;
  port: number;
  url: string;
  inngest_endpoint: string;
  mode: "tauri" | "external" | "unknown";
}

export interface BrainTaskOptions {
  task: string;
  taskType?: "code-assist" | "review" | "document";
  context?: Record<string, unknown>;
}

export interface BrainTaskResult {
  success: boolean;
  output?: string;
  error?: string;
  agentUsed?: string;
}

export interface BrainStatusResponse {
  status: string;
  agents: string[];
  workflows: string[];
}

// ===========================
// Server Status State
// ===========================

const DEFAULT_PORT = 3847;
let serverStatus: AgentServerStatus | null = null;
let statusListeners: Set<(status: AgentServerStatus | null) => void> =
  new Set();
let readyListeners: Set<(ready: boolean) => void> = new Set();
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
let _lastReadyState: boolean = false;

function notifyStatusListeners() {
  statusListeners.forEach((listener) => listener(serverStatus));
}

function setStatus(status: AgentServerStatus | null) {
  serverStatus = status;
  notifyStatusListeners();
  // Notify ready listeners when state changes
  const isReady = status?.running ?? false;
  if (isReady !== _lastReadyState) {
    _lastReadyState = isReady;
    readyListeners.forEach((listener) => listener(isReady));
  }
}

/**
 * Returns true if the agent server is currently running.
 */
export function isServerReady(): boolean {
  return serverStatus?.running ?? false;
}

/**
 * Subscribe to server ready state changes (true = up, false = down).
 * Returns an unsubscribe function.
 */
export function subscribeToServerReady(
  callback: (ready: boolean) => void,
): () => void {
  readyListeners.add(callback);
  // Immediately invoke with current state
  callback(_lastReadyState);
  return () => readyListeners.delete(callback);
}

// ===========================
// Rust TCP Health Check (silent — no browser fetch errors)
// ===========================

/**
 * Check server health via Rust TCP probe.
 * invoke('agent_server_health') attempts a TCP connect to 127.0.0.1:3847
 * from the Rust backend — completely invisible to the browser DevTools.
 */
export async function checkServerHealth(
  _port: number = DEFAULT_PORT,
): Promise<boolean> {
  try {
    return await invoke<boolean>("agent_server_health");
  } catch {
    return false;
  }
}

/**
 * Get detailed status using Rust TCP probe.
 * Returns a minimal AgentServerStatus when alive, null when down.
 */
export async function fetchServerStatus(
  port: number = DEFAULT_PORT,
): Promise<AgentServerStatus | null> {
  try {
    const alive = await invoke<boolean>("agent_server_health");
    if (alive) {
      return {
        running: true,
        port,
        url: `http://localhost:${port}`,
        inngest_endpoint: `http://localhost:${port}/api/inngest`,
        mode: "tauri",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Refresh server status via Rust TCP health check
 */
export async function refreshServerStatus(): Promise<AgentServerStatus | null> {
  const status = await fetchServerStatus();
  setStatus(status);
  return status;
}

// ===========================
// Server Lifecycle (Tauri IPC)
// ===========================

/**
 * Start the agent server sidecar via Tauri
 */
export async function startAgentServer(): Promise<number> {
  try {
    const port = await invoke<number>("agent_server_start");

    // Wait for server to boot with retry logic
    // Server needs time to: bundle TypeScript + start Node
    console.log("[AgentServer] Waiting for server to boot...");

    let isHealthy = false;
    const maxRetries = 10;
    const retryDelay = 1000;

    // Initial delay to let bundling complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      isHealthy = await checkServerHealth(port);
      if (isHealthy) {
        console.log(`[AgentServer] Health check passed on attempt ${attempt}`);
        break;
      }
      console.log(
        `[AgentServer] Health check attempt ${attempt}/${maxRetries} failed, retrying...`,
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    if (isHealthy) {
      setStatus({
        running: true,
        port,
        url: `http://localhost:${port}`,
        inngest_endpoint: `http://localhost:${port}/api/inngest`,
        mode: "tauri",
      });
    } else {
      console.warn(
        "[AgentServer] Server started but health check failed after retries",
      );
    }

    console.log("[AgentServer] Started via Tauri on port", port);
    return port;
  } catch (error) {
    console.error("[AgentServer] Failed to start via Tauri:", error);
    throw error;
  }
}

/**
 * Stop the agent server via Tauri
 */
export async function stopAgentServer(): Promise<void> {
  try {
    await invoke("agent_server_stop");
    setStatus(null);
    console.log("[AgentServer] Stopped via Tauri");
  } catch (error) {
    console.error("[AgentServer] Failed to stop:", error);
    throw error;
  }
}

// ===========================
// Status Subscription
// ===========================

/**
 * Subscribe to server status changes
 */
export function subscribeToServerStatus(
  callback: (status: AgentServerStatus | null) => void,
): () => void {
  statusListeners.add(callback);
  // Immediately call with current status
  callback(serverStatus);

  // Return unsubscribe function
  return () => {
    statusListeners.delete(callback);
  };
}

/**
 * Get cached server status (synchronous)
 */
export function getCachedServerStatus(): AgentServerStatus | null {
  return serverStatus;
}

/**
 * Start automatic health check polling
 */
export function startHealthPolling(intervalMs: number = 10000): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  // Initial check (after a short boot delay to let the server start)
  setTimeout(() => refreshServerStatus(), 3000);

  // Poll every N seconds
  healthCheckInterval = setInterval(() => {
    refreshServerStatus();
  }, intervalMs);
}

/**
 * Stop automatic health check polling
 */
export function stopHealthPolling(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// ===========================
// Brain Tasks (HTTP to Sidecar)
// ===========================

/**
 * Get brain status (available agents and workflows)
 */
export async function getBrainStatus(): Promise<BrainStatusResponse | null> {
  if (!serverStatus?.running) {
    return null;
  }

  try {
    const response = await fetch(`${serverStatus.url}/api/brain/status`);
    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

// ===========================
// Agent List (cached)
// ===========================

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  tools: string[];
  model: "fast" | "smart";
  patterns: {
    keywords: string[];
    examples: string[];
  };
  status: "ready" | "disabled";
}

export interface AgentsResponse {
  agents: AgentInfo[];
  types: string[];
  defaultAgent: string;
}

let cachedAgents: AgentsResponse | null = null;

/**
 * Get available agents from the brain server
 */
export async function getAvailableAgents(
  forceRefresh = false,
): Promise<AgentsResponse | null> {
  if (cachedAgents && !forceRefresh) {
    return cachedAgents;
  }

  if (!serverStatus?.running) {
    return null;
  }

  try {
    const response = await fetch(`${serverStatus.url}/api/brain/agents`);
    if (!response.ok) return null;

    cachedAgents = await response.json();
    return cachedAgents;
  } catch {
    return null;
  }
}

/**
 * Send a task to the AgentKit brain
 */
export async function sendBrainTask(
  options: BrainTaskOptions,
): Promise<BrainTaskResult> {
  if (!serverStatus?.running) {
    return {
      success: false,
      error: "Agent server is not running. Please start the server first.",
    };
  }

  try {
    const response = await fetch(`${serverStatus.url}/api/brain/task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Server error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      output: result.output,
      agentUsed: result.agent,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send task: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ===========================
// Initialization
// ===========================

/**
 * Initialize agent server service
 * Starts health polling to detect running servers
 */
export function initializeAgentServer(): void {
  console.log("[AgentServer] Initializing with health polling (10s interval)");
  startHealthPolling(10000);
}

/**
 * Cleanup agent server service
 */
export function cleanupAgentServer(): void {
  stopHealthPolling();
}
