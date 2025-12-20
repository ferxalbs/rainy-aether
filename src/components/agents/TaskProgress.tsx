/**
 * Task Progress Component
 * 
 * Displays the progress of a brain task with:
 * - Progress bar
 * - Current step message
 * - Tools used
 * - Time elapsed
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    Clock,
    Wrench,
    Bot
} from 'lucide-react';

interface TaskProgressProps {
    taskId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: {
        current: number;
        total: number;
        message: string;
    };
    startTime?: number;
    endTime?: number;
    agentsUsed?: string[];
    toolsUsed?: string[];
    className?: string;
}

export function TaskProgress({
    taskId,
    status,
    progress,
    startTime,
    endTime,
    agentsUsed = [],
    toolsUsed = [],
    className,
}: TaskProgressProps) {
    const [elapsed, setElapsed] = useState(0);

    // Update elapsed time
    useEffect(() => {
        if (status !== 'running' || !startTime) return;

        const interval = setInterval(() => {
            setElapsed(Date.now() - startTime);
        }, 100);

        return () => clearInterval(interval);
    }, [status, startTime]);

    const percentage = progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'running':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-400" />;
            case 'failed':
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-red-400" />;
            default:
                return <Clock className="h-4 w-4 text-zinc-400" />;
        }
    };

    const getProgressColor = () => {
        switch (status) {
            case 'running':
                return 'bg-blue-500';
            case 'completed':
                return 'bg-green-500';
            case 'failed':
            case 'cancelled':
                return 'bg-red-500';
            default:
                return 'bg-zinc-500';
        }
    };

    const totalTime = endTime && startTime ? endTime - startTime : elapsed;

    return (
        <div className={cn(
            'rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3 space-y-2',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-sm font-medium text-zinc-200">
                        {status === 'running' ? 'Processing...' :
                            status === 'completed' ? 'Completed' :
                                status === 'failed' ? 'Failed' :
                                    status === 'cancelled' ? 'Cancelled' : 'Pending'}
                    </span>
                </div>
                {(status === 'running' || status === 'completed') && startTime && (
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(totalTime)}</span>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {status === 'running' && (
                <div className="space-y-1">
                    <Progress
                        value={percentage}
                        className="h-1.5 bg-zinc-700"
                    />
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>{progress.message}</span>
                        <span>{percentage}%</span>
                    </div>
                </div>
            )}

            {/* Agents and tools used */}
            {(agentsUsed.length > 0 || toolsUsed.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {agentsUsed.map((agent, i) => (
                        <div
                            key={`agent-${i}`}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs"
                        >
                            <Bot className="h-3 w-3" />
                            <span>{agent}</span>
                        </div>
                    ))}
                    {toolsUsed.slice(0, 5).map((tool, i) => (
                        <div
                            key={`tool-${i}`}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs"
                        >
                            <Wrench className="h-3 w-3" />
                            <span>{tool}</span>
                        </div>
                    ))}
                    {toolsUsed.length > 5 && (
                        <span className="text-xs text-zinc-400">
                            +{toolsUsed.length - 5} more
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default TaskProgress;
