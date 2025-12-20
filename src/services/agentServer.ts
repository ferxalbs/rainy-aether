/**
 * Agent Server Service
 * 
 * Manages communication with the Inngest/AgentKit sidecar server.
 * Uses Tauri IPC for server lifecycle and HTTP for brain tasks.
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

// ===========================
// Server Status State
// ===========================

let serverStatus: AgentServerStatus | null = null;
let statusListeners: Set<(status: AgentServerStatus | null) => void> = new Set();

function notifyStatusListeners() {
    statusListeners.forEach(listener => listener(serverStatus));
}

// ===========================
// Server Lifecycle (Tauri IPC)
// ===========================

/**
 * Start the agent server sidecar
 */
export async function startAgentServer(): Promise<number> {
    try {
        const port = await invoke<number>('agent_server_start');
        serverStatus = {
            running: true,
            port,
            url: `http://localhost:${port}`,
            inngest_endpoint: `http://localhost:${port}/api/inngest`,
        };
        notifyStatusListeners();
        console.log('[AgentServer] Started on port', port);
        return port;
    } catch (error) {
        console.error('[AgentServer] Failed to start:', error);
        serverStatus = null;
        notifyStatusListeners();
        throw error;
    }
}

/**
 * Stop the agent server
 */
export async function stopAgentServer(): Promise<void> {
    try {
        await invoke('agent_server_stop');
        serverStatus = null;
        notifyStatusListeners();
        console.log('[AgentServer] Stopped');
    } catch (error) {
        console.error('[AgentServer] Failed to stop:', error);
        throw error;
    }
}

/**
 * Get current server status from Tauri
 */
export async function getAgentServerStatus(): Promise<AgentServerStatus | null> {
    try {
        const status = await invoke<AgentServerStatus>('agent_server_status');
        serverStatus = status.running ? status : null;
        notifyStatusListeners();
        return serverStatus;
    } catch (error) {
        console.error('[AgentServer] Failed to get status:', error);
        serverStatus = null;
        notifyStatusListeners();
        return null;
    }
}

/**
 * Check if server is healthy (HTTP check)
 */
export async function checkServerHealth(): Promise<boolean> {
    try {
        const isHealthy = await invoke<boolean>('agent_server_health');
        return isHealthy;
    } catch {
        return false;
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

// ===========================
// Brain Tasks (HTTP to Sidecar)
// ===========================

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

/**
 * Get available agents from the brain
 */
export async function getAvailableAgents(): Promise<string[]> {
    if (!serverStatus?.running) {
        return [];
    }

    try {
        const response = await fetch(`${serverStatus.url}/api/brain/status`);
        if (!response.ok) return [];

        const data = await response.json();
        return data.agents || [];
    } catch {
        return [];
    }
}

// ===========================
// Initialization
// ===========================

/**
 * Initialize server status on app load
 */
export async function initializeAgentServer(): Promise<void> {
    try {
        await getAgentServerStatus();
    } catch (error) {
        console.warn('[AgentServer] Failed to initialize status:', error);
    }
}
