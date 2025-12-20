/**
 * Agent Server Service
 * 
 * Manages communication with the Inngest/AgentKit sidecar server.
 * Uses HTTP health checks to detect server status (works for both manual and Tauri-spawned servers).
 */

import { invoke } from '@tauri-apps/api/core';

// ===========================
// Types
// ===========================

export interface AgentServerStatus {
    running: boolean;
    port: number;
    url: string;
    inngest_endpoint: string;
    mode: 'tauri' | 'external' | 'unknown';
}

export interface BrainTaskOptions {
    task: string;
    taskType?: 'code-assist' | 'review' | 'document';
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
let statusListeners: Set<(status: AgentServerStatus | null) => void> = new Set();
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

function notifyStatusListeners() {
    statusListeners.forEach(listener => listener(serverStatus));
}

function setStatus(status: AgentServerStatus | null) {
    serverStatus = status;
    notifyStatusListeners();
}

// ===========================
// HTTP Health Check (Real Detection)
// ===========================

/**
 * Check if the agent server is running via HTTP
 * This works regardless of whether the server was started via Tauri or externally
 */
export async function checkServerHealth(port: number = DEFAULT_PORT): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`http://localhost:${port}/health`, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get detailed status from the server
 */
export async function fetchServerStatus(port: number = DEFAULT_PORT): Promise<AgentServerStatus | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`http://localhost:${port}/health`, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            return {
                running: true,
                port,
                url: `http://localhost:${port}`,
                inngest_endpoint: `http://localhost:${port}/api/inngest`,
                mode: 'external', // Could be Tauri or external, we can't tell from HTTP
            };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Refresh server status via HTTP health check
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
        const port = await invoke<number>('agent_server_start');

        // Wait a bit for server to boot, then check health
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isHealthy = await checkServerHealth(port);

        if (isHealthy) {
            setStatus({
                running: true,
                port,
                url: `http://localhost:${port}`,
                inngest_endpoint: `http://localhost:${port}/api/inngest`,
                mode: 'tauri',
            });
        }

        console.log('[AgentServer] Started via Tauri on port', port);
        return port;
    } catch (error) {
        console.error('[AgentServer] Failed to start via Tauri:', error);
        throw error;
    }
}

/**
 * Stop the agent server via Tauri
 */
export async function stopAgentServer(): Promise<void> {
    try {
        await invoke('agent_server_stop');
        setStatus(null);
        console.log('[AgentServer] Stopped via Tauri');
    } catch (error) {
        console.error('[AgentServer] Failed to stop:', error);
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
    callback: (status: AgentServerStatus | null) => void
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
export function startHealthPolling(intervalMs: number = 5000): void {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }

    // Initial check
    refreshServerStatus();

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

/**
 * Send a task to the AgentKit brain
 */
export async function sendBrainTask(options: BrainTaskOptions): Promise<BrainTaskResult> {
    if (!serverStatus?.running) {
        return {
            success: false,
            error: 'Agent server is not running. Please start the server first.',
        };
    }

    try {
        const response = await fetch(`${serverStatus.url}/api/brain/task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
    console.log('[AgentServer] Initializing with health polling');
    startHealthPolling(5000);
}

/**
 * Cleanup agent server service
 */
export function cleanupAgentServer(): void {
    stopHealthPolling();
}
