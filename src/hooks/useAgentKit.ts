/**
 * useAgentKit Hook
 * 
 * React hook for AgentKit task execution with SSE streaming.
 * Provides real-time updates for agent activity.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ===========================
// Types
// ===========================

export interface AgentKitTask {
    taskId: string;
    conversationId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: string;
    agentsUsed: string[];
    toolsUsed: string[];
    filesModified: string[];
    error?: string;
    durationMs?: number;
}

export interface AgentEvent {
    type: string;
    taskId: string;
    agent?: string;
    message?: string;
    output?: string;
    tool?: string;
    args?: Record<string, unknown>;
    result?: unknown;
    success?: boolean;
    error?: string;
    timestamp?: number;
}

export interface RoutingInfo {
    agent: string;
    confidence: number;
    reasoning: string;
}

export interface UseAgentKitOptions {
    serverUrl?: string;
    onEvent?: (event: AgentEvent) => void;
    onRouting?: (routing: RoutingInfo) => void;
    onComplete?: (task: AgentKitTask) => void;
    onError?: (error: string) => void;
}

export interface ExecuteOptions {
    workspace?: string;
    currentFile?: string;
    selectedCode?: string;
    preferredAgent?: 'planner' | 'coder' | 'reviewer' | 'terminal' | 'docs';
    routing?: 'auto' | 'heuristic' | 'llm';
    maxIterations?: number;
    enableMCP?: boolean;
    mcpServers?: string[];
}

// ===========================
// Hook
// ===========================

export function useAgentKit(options: UseAgentKitOptions = {}) {
    const {
        serverUrl = 'http://localhost:3847',
        onEvent,
        onRouting,
        onComplete,
        onError,
    } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [task, setTask] = useState<AgentKitTask | null>(null);
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [routing, setRouting] = useState<RoutingInfo | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            eventSourceRef.current?.close();
            abortControllerRef.current?.abort();
        };
    }, []);

    /**
     * Execute a task with AgentKit
     */
    const execute = useCallback(async (
        taskDescription: string,
        executeOptions: ExecuteOptions = {}
    ): Promise<AgentKitTask | null> => {
        setIsLoading(true);
        setTask(null);
        setEvents([]);
        setRouting(null);

        // Cleanup previous connections
        eventSourceRef.current?.close();
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        try {
            // Start task execution
            const response = await fetch(`${serverUrl}/api/agentkit/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: taskDescription,
                    context: {
                        workspace: executeOptions.workspace,
                        currentFile: executeOptions.currentFile,
                        selectedCode: executeOptions.selectedCode,
                    },
                    options: {
                        preferredAgent: executeOptions.preferredAgent,
                        routing: executeOptions.routing || 'auto',
                        maxIterations: executeOptions.maxIterations,
                        enableMCP: executeOptions.enableMCP,
                        mcpServers: executeOptions.mcpServers,
                    },
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start task');
            }

            const data = await response.json() as {
                taskId: string;
                conversationId: string;
                routing: RoutingInfo;
                streamUrl: string;
            };

            // Store routing info
            setRouting(data.routing);
            onRouting?.(data.routing);

            // Initialize task state
            const initialTask: AgentKitTask = {
                taskId: data.taskId,
                conversationId: data.conversationId,
                status: 'running',
                agentsUsed: [data.routing.agent],
                toolsUsed: [],
                filesModified: [],
            };
            setTask(initialTask);

            // Stream events via SSE
            return new Promise((resolve) => {
                const eventSource = new EventSource(
                    `${serverUrl}/api/agentkit/tasks/${data.taskId}/stream`
                );
                eventSourceRef.current = eventSource;

                eventSource.onmessage = (event) => {
                    try {
                        const parsed = JSON.parse(event.data) as AgentEvent;

                        // Add to events list
                        setEvents(prev => [...prev, parsed]);
                        onEvent?.(parsed);

                        // Handle completion
                        if (parsed.type === 'task.complete') {
                            const completedTask: AgentKitTask = {
                                taskId: data.taskId,
                                conversationId: data.conversationId,
                                status: parsed.error ? 'failed' : 'completed',
                                output: parsed.output,
                                agentsUsed: (parsed as { agentsUsed?: string[] }).agentsUsed || [],
                                toolsUsed: (parsed as { toolsUsed?: string[] }).toolsUsed || [],
                                filesModified: (parsed as { filesModified?: string[] }).filesModified || [],
                                error: parsed.error,
                            };
                            setTask(completedTask);
                            setIsLoading(false);
                            onComplete?.(completedTask);
                            eventSource.close();
                            resolve(completedTask);
                        }
                    } catch (e) {
                        console.error('[useAgentKit] Failed to parse event:', e);
                    }
                };

                eventSource.onerror = () => {
                    // Check if task completed
                    setIsLoading(false);
                    eventSource.close();
                    resolve(task);
                };
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            onError?.(errorMessage);
            setIsLoading(false);
            return null;
        }
    }, [serverUrl, onEvent, onRouting, onComplete, onError, task]);

    /**
     * Route a task without executing
     */
    const route = useCallback(async (
        taskDescription: string,
        mode: 'auto' | 'heuristic' | 'llm' = 'auto'
    ): Promise<RoutingInfo | null> => {
        try {
            const response = await fetch(`${serverUrl}/api/agentkit/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: taskDescription,
                    mode,
                }),
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json() as RoutingInfo;
            return data;
        } catch {
            return null;
        }
    }, [serverUrl]);

    /**
     * Execute with a specific agent (no routing)
     */
    const executeWithAgent = useCallback(async (
        agentType: 'planner' | 'coder' | 'reviewer' | 'terminal' | 'docs',
        taskDescription: string,
        workspace?: string
    ): Promise<{ success: boolean; output: string; toolsUsed: string[]; error?: string } | null> => {
        try {
            const response = await fetch(`${serverUrl}/api/agentkit/agent/${agentType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: taskDescription,
                    workspace,
                }),
            });

            const data = await response.json();
            return data;
        } catch {
            return null;
        }
    }, [serverUrl]);

    /**
     * Get available agents
     */
    const getAgents = useCallback(async (): Promise<Array<{
        name: string;
        description: string;
    }> | null> => {
        try {
            const response = await fetch(`${serverUrl}/api/agentkit/agents`);
            const data = await response.json();
            return data.agents;
        } catch {
            return null;
        }
    }, [serverUrl]);

    /**
     * Get MCP servers
     */
    const getMCPServers = useCallback(async (): Promise<Array<{
        name: string;
        enabled: boolean;
        transport: string;
        description: string;
    }> | null> => {
        try {
            const response = await fetch(`${serverUrl}/api/agentkit/mcp/servers`);
            const data = await response.json();
            return data.servers;
        } catch {
            return null;
        }
    }, [serverUrl]);

    /**
     * Cancel current task
     */
    const cancel = useCallback(() => {
        eventSourceRef.current?.close();
        abortControllerRef.current?.abort();
        setIsLoading(false);
    }, []);

    return {
        // State
        isLoading,
        task,
        events,
        routing,

        // Actions
        execute,
        route,
        executeWithAgent,
        getAgents,
        getMCPServers,
        cancel,
    };
}

export default useAgentKit;
