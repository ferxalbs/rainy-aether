/**
 * BrainService - Frontend client for the Rainy Brain sidecar
 * 
 * Manages communication with the Node.js sidecar for:
 * - Tool execution
 * - Task execution with streaming progress
 * - Agent interactions
 */

const BRAIN_URL = 'http://localhost:3847';

// ===========================
// Types
// ===========================

export interface ToolCallRequest {
    tool: string;
    args: Record<string, unknown>;
    workspace?: string;
}

export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: string;
    duration?: number;
    cached?: boolean;
}

export interface TaskRequest {
    task: string;
    context?: {
        workspace?: string;
        currentFile?: string;
        selectedCode?: string;
    };
    options?: {
        agentType?: 'auto' | 'planner' | 'coder' | 'reviewer' | 'terminal';
        maxDuration?: number;
        streaming?: boolean;
    };
}

export interface TaskStatus {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: {
        current: number;
        total: number;
        message: string;
    };
    result?: unknown;
    error?: string;
    startTime: number;
    endTime?: number;
}

export interface TaskHandle {
    id: string;
    cancel: () => Promise<void>;
    getStatus: () => Promise<TaskStatus>;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

export interface BrainHealth {
    status: 'ok' | 'error';
    server: string;
    version: string;
    uptime: number;
    features: string[];
}

export type TaskUpdateCallback = (status: TaskStatus) => void;

// ===========================
// BrainService Class
// ===========================

class BrainService {
    private baseUrl: string;
    private isConnected: boolean = false;

    constructor(baseUrl: string = BRAIN_URL) {
        this.baseUrl = baseUrl;
    }

    // ===========================
    // Health & Connection
    // ===========================

    /**
     * Check if the brain sidecar is healthy
     */
    async checkHealth(): Promise<BrainHealth | null> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) return null;

            const health = await response.json() as BrainHealth;
            this.isConnected = health.status === 'ok';
            return health;
        } catch {
            this.isConnected = false;
            return null;
        }
    }

    /**
     * Check if connected to sidecar
     */
    get connected(): boolean {
        return this.isConnected;
    }

    /**
     * Start health polling
     */
    startHealthPolling(intervalMs: number = 5000, onStatusChange?: (connected: boolean) => void): () => void {
        const poll = async () => {
            const wasConnected = this.isConnected;
            await this.checkHealth();

            if (wasConnected !== this.isConnected && onStatusChange) {
                onStatusChange(this.isConnected);
            }
        };

        poll(); // Initial check
        const timer = window.setInterval(poll, intervalMs);

        return () => {
            window.clearInterval(timer);
        };
    }

    // ===========================
    // Tools
    // ===========================

    /**
     * Get list of available tools
     */
    async getTools(): Promise<ToolDefinition[]> {
        const response = await fetch(`${this.baseUrl}/api/brain/tools`);
        if (!response.ok) throw new Error(`Failed to get tools: ${response.status}`);
        const data = await response.json();
        return data.tools;
    }

    /**
     * Execute a single tool
     */
    async executeTool(request: ToolCallRequest): Promise<ToolResult> {
        const response = await fetch(`${this.baseUrl}/api/brain/tool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tool: request.tool,
                args: request.args,
                workspace: request.workspace,
            }),
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }

        const execution = await response.json();
        return execution.result || { success: false, error: 'No result returned' };
    }

    /**
     * Execute multiple tools in batch
     */
    async executeToolsBatch(
        calls: Array<{ tool: string; args: Record<string, unknown> }>,
        workspace?: string,
        options?: { parallel?: boolean; stopOnError?: boolean }
    ): Promise<Array<{ id: string; result: ToolResult }>> {
        const response = await fetch(`${this.baseUrl}/api/brain/tools/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calls, workspace, options }),
        });

        if (!response.ok) {
            throw new Error(`Batch execution failed: ${response.status}`);
        }

        const data = await response.json();
        return data.results;
    }

    // ===========================
    // Task Execution
    // ===========================

    /**
     * Execute a task and return a handle for tracking
     */
    async executeTask(request: TaskRequest): Promise<TaskHandle> {
        const response = await fetch(`${this.baseUrl}/api/brain/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Task execution failed: ${response.status}`);
        }

        const data = await response.json();
        const taskId = data.taskId;

        return {
            id: taskId,
            cancel: () => this.cancelTask(taskId),
            getStatus: () => this.getTaskStatus(taskId),
        };
    }

    /**
     * Get task status
     */
    async getTaskStatus(taskId: string): Promise<TaskStatus> {
        const response = await fetch(`${this.baseUrl}/api/brain/tasks/${taskId}`);
        if (!response.ok) throw new Error(`Failed to get task status: ${response.status}`);
        return response.json();
    }

    /**
     * Cancel a running task
     */
    async cancelTask(taskId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/brain/tasks/${taskId}/cancel`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error(`Failed to cancel task: ${response.status}`);
    }

    /**
     * Stream task updates via SSE
     */
    streamTask(taskId: string, onUpdate: TaskUpdateCallback): () => void {
        const eventSource = new EventSource(`${this.baseUrl}/api/brain/tasks/${taskId}/stream`);

        eventSource.onmessage = (event) => {
            try {
                const status = JSON.parse(event.data) as TaskStatus;
                onUpdate(status);

                // Close on completion
                if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
                    eventSource.close();
                }
            } catch (e) {
                console.error('[BrainService] Failed to parse SSE:', e);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => eventSource.close();
    }

    /**
     * Execute task with streaming updates
     */
    async executeTaskWithStreaming(
        request: TaskRequest,
        onUpdate: TaskUpdateCallback
    ): Promise<TaskStatus> {
        const handle = await this.executeTask(request);

        return new Promise((resolve, reject) => {
            let finalStatus: TaskStatus | null = null;

            const cleanup = this.streamTask(handle.id, (status) => {
                onUpdate(status);

                if (status.status === 'completed' || status.status === 'failed') {
                    finalStatus = status;
                }
            });

            // Fallback polling in case SSE fails
            const pollInterval = setInterval(async () => {
                try {
                    const status = await handle.getStatus();
                    if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
                        clearInterval(pollInterval);
                        cleanup();
                        resolve(finalStatus || status);
                    }
                } catch (e) {
                    clearInterval(pollInterval);
                    cleanup();
                    reject(e);
                }
            }, 1000);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
                cleanup();
                if (!finalStatus) {
                    reject(new Error('Task timeout'));
                }
            }, 5 * 60 * 1000);
        });
    }
}

// ===========================
// Singleton Export
// ===========================

export const brainService = new BrainService();
export default brainService;
