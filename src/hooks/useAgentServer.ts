/**
 * useAgentServer Hook
 * 
 * React hook for managing the agent server connection with real HTTP health checks.
 * Auto-starts the server on mount if not already running.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    AgentServerStatus,
    startAgentServer,
    stopAgentServer,
    refreshServerStatus,
    subscribeToServerStatus,
    checkServerHealth,
} from '@/services/agentServer';

export interface UseAgentServerReturn {
    status: AgentServerStatus | null;
    isRunning: boolean;
    isStarting: boolean;
    isStopping: boolean;
    error: string | null;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useAgentServer(): UseAgentServerReturn {
    const [status, setStatus] = useState<AgentServerStatus | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasAutoStarted = useRef(false);

    // Subscribe to status changes and start health polling
    useEffect(() => {
        const unsubscribe = subscribeToServerStatus(setStatus);

        // Start health check polling
        const pollHealth = async () => {
            const newStatus = await refreshServerStatus();

            // Auto-start server if not running and haven't tried already
            if (!newStatus?.running && !hasAutoStarted.current && !isStarting) {
                hasAutoStarted.current = true;
                console.log('[useAgentServer] Server not running, auto-starting...');
                startAgentServer().catch(err => {
                    console.warn('[useAgentServer] Auto-start failed:', err);
                    setError('Auto-start failed. Please start manually.');
                });
            }
        };

        // Initial check
        pollHealth();

        // Poll every 5 seconds
        healthCheckIntervalRef.current = setInterval(pollHealth, 5000);

        return () => {
            unsubscribe();
            if (healthCheckIntervalRef.current) {
                clearInterval(healthCheckIntervalRef.current);
            }
        };
    }, []);

    const start = useCallback(async () => {
        setIsStarting(true);
        setError(null);
        try {
            await startAgentServer();
            // Wait a bit and check health
            await new Promise(resolve => setTimeout(resolve, 2000));
            const isHealthy = await checkServerHealth();
            if (!isHealthy) {
                setError('Server started but health check failed. Check console.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsStarting(false);
        }
    }, []);

    const stop = useCallback(async () => {
        setIsStopping(true);
        setError(null);
        try {
            await stopAgentServer();
            hasAutoStarted.current = false; // Allow auto-start again next time
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsStopping(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        await refreshServerStatus();
    }, []);

    return {
        status,
        isRunning: status?.running ?? false,
        isStarting,
        isStopping,
        error,
        start,
        stop,
        refresh,
    };
}
