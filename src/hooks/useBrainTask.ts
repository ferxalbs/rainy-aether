/**
 * useBrainTask - React hook for brain task execution
 * 
 * Provides a simple interface for executing tasks via the brain sidecar
 * with automatic streaming updates and state management.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { brainService, TaskStatus, TaskRequest, ToolResult } from '@/services/BrainService';

export interface BrainTaskState {
    isConnected: boolean;
    isExecuting: boolean;
    currentTask: TaskStatus | null;
    error: string | null;
}

export interface BrainTaskActions {
    executeTask: (task: string, context?: TaskRequest['context']) => Promise<TaskStatus | null>;
    executeTool: (tool: string, args: Record<string, unknown>) => Promise<ToolResult>;
    cancelTask: () => Promise<void>;
    checkConnection: () => Promise<boolean>;
}

export function useBrainTask(workspacePath?: string): [BrainTaskState, BrainTaskActions] {
    const [isConnected, setIsConnected] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [currentTask, setCurrentTask] = useState<TaskStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentTaskIdRef = useRef<string | null>(null);

    // Health polling
    useEffect(() => {
        const cleanup = brainService.startHealthPolling(5000, (connected) => {
            setIsConnected(connected);
        });

        return cleanup;
    }, []);

    // Check connection manually
    const checkConnection = useCallback(async (): Promise<boolean> => {
        const health = await brainService.checkHealth();
        const connected = health !== null && health.status === 'ok';
        setIsConnected(connected);
        return connected;
    }, []);

    // Execute a tool directly
    const executeTool = useCallback(async (
        tool: string,
        args: Record<string, unknown>
    ): Promise<ToolResult> => {
        setError(null);

        if (!isConnected) {
            return { success: false, error: 'Brain service not connected' };
        }

        try {
            return await brainService.executeTool({
                tool,
                args,
                workspace: workspacePath,
            });
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }
    }, [isConnected, workspacePath]);

    // Execute a task with streaming
    const executeTask = useCallback(async (
        task: string,
        context?: TaskRequest['context']
    ): Promise<TaskStatus | null> => {
        if (!isConnected) {
            setError('Brain service not connected');
            return null;
        }

        setError(null);
        setIsExecuting(true);
        setCurrentTask(null);

        try {
            const result = await brainService.executeTaskWithStreaming(
                {
                    task,
                    context: {
                        workspace: workspacePath,
                        ...context,
                    },
                },
                (status) => {
                    setCurrentTask(status);
                    currentTaskIdRef.current = status.id;
                }
            );

            setCurrentTask(result);
            return result;
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setError(errorMsg);
            return null;
        } finally {
            setIsExecuting(false);
            currentTaskIdRef.current = null;
        }
    }, [isConnected, workspacePath]);

    // Cancel current task
    const cancelTask = useCallback(async (): Promise<void> => {
        if (currentTaskIdRef.current) {
            try {
                await brainService.cancelTask(currentTaskIdRef.current);
                setIsExecuting(false);
            } catch (e) {
                console.error('[useBrainTask] Failed to cancel:', e);
            }
        }
    }, []);

    const state: BrainTaskState = {
        isConnected,
        isExecuting,
        currentTask,
        error,
    };

    const actions: BrainTaskActions = {
        executeTask,
        executeTool,
        cancelTask,
        checkConnection,
    };

    return [state, actions];
}

export default useBrainTask;
