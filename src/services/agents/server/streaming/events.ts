/**
 * Agent Stream Events
 * 
 * Event types and emitter for real-time agent activity streaming.
 * Used for SSE streaming to frontend.
 */

// ===========================
// Event Types
// ===========================

export type AgentStreamEvent =
    // Agent lifecycle
    | { type: 'agent.start'; taskId: string; agent: string; timestamp: number }
    | { type: 'agent.thinking'; taskId: string; agent: string; message: string }
    | { type: 'agent.complete'; taskId: string; agent: string; output: unknown; timestamp: number }

    // Tool execution
    | { type: 'tool.call'; taskId: string; agent: string; tool: string; args: Record<string, unknown> }
    | { type: 'tool.result'; taskId: string; agent: string; tool: string; result: unknown; success: boolean }

    // Network routing
    | { type: 'network.route'; taskId: string; from: string | null; to: string; reason: string }
    | { type: 'network.iteration'; taskId: string; iteration: number; maxIterations: number }
    | { type: 'network.complete'; taskId: string; success: boolean; result: unknown }
    | { type: 'network.error'; taskId: string; error: string }

    // MCP events
    | { type: 'mcp.connect'; taskId: string; server: string; status: 'connected' | 'error' }
    | { type: 'mcp.tool.call'; taskId: string; server: string; tool: string }
    | { type: 'mcp.tool.result'; taskId: string; server: string; tool: string; success: boolean }

    // Approval/Human-in-the-loop
    | { type: 'approval.required'; taskId: string; action: string; description: string }
    | { type: 'approval.response'; taskId: string; approved: boolean; reason?: string }

    // Progress
    | { type: 'progress'; taskId: string; current: number; total: number; message: string };

// ===========================
// Event Emitter
// ===========================

type EventHandler = (event: AgentStreamEvent) => void;

export class AgentEventEmitter {
    private listeners: Map<string, EventHandler[]> = new Map();
    private globalListeners: EventHandler[] = [];

    /**
     * Emit an event for a specific task
     */
    emit(event: AgentStreamEvent): void {
        const taskId = event.taskId;

        // Notify task-specific listeners
        const handlers = this.listeners.get(taskId) || [];
        handlers.forEach(handler => {
            try {
                handler(event);
            } catch (e) {
                console.error('[AgentEvents] Handler error:', e);
            }
        });

        // Notify global listeners
        this.globalListeners.forEach(handler => {
            try {
                handler(event);
            } catch (e) {
                console.error('[AgentEvents] Global handler error:', e);
            }
        });
    }

    /**
     * Subscribe to events for a specific task
     */
    subscribe(taskId: string, handler: EventHandler): () => void {
        const handlers = this.listeners.get(taskId) || [];
        handlers.push(handler);
        this.listeners.set(taskId, handlers);

        // Return unsubscribe function
        return () => {
            const idx = handlers.indexOf(handler);
            if (idx >= 0) handlers.splice(idx, 1);
        };
    }

    /**
     * Subscribe to all events (for debugging/logging)
     */
    subscribeGlobal(handler: EventHandler): () => void {
        this.globalListeners.push(handler);
        return () => {
            const idx = this.globalListeners.indexOf(handler);
            if (idx >= 0) this.globalListeners.splice(idx, 1);
        };
    }

    /**
     * Clean up listeners for a completed task
     */
    cleanup(taskId: string): void {
        this.listeners.delete(taskId);
    }
}

// Singleton instance
export const agentEvents = new AgentEventEmitter();
