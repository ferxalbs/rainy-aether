/**
 * useAgentServer Hook
 * 
 * React hook for managing the agent server connection.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    AgentServerStatus,
    startAgentServer,
    stopAgentServer,
    getAgentServerStatus,
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

    // Subscribe to status changes
    useEffect(() => {
        const unsubscribe = subscribeToServerStatus(setStatus);

        // Initial status check
        getAgentServerStatus();

        return unsubscribe;
    }, []);

    // Health check polling
    useEffect(() => {
        if (!status?.running) return;

        const interval = setInterval(async () => {
            const isHealthy = await checkServerHealth();
            if (!isHealthy && status?.running) {
                // Server went down unexpectedly
                console.warn('[useAgentServer] Server health check failed');
                getAgentServerStatus();
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [status?.running]);

    const start = useCallback(async () => {
        setIsStarting(true);
        setError(null);
        try {
            await startAgentServer();
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
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsStopping(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        await getAgentServerStatus();
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
