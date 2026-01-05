/**
 * Brain Status Indicator
 * 
 * Shows the connection status of the brain sidecar service.
 * Displays connected/disconnected state with optional details.
 */

import { useBrainTask } from '@/hooks/useBrainTask';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from '@/components/ui/tooltip';
import { Zap, AlertCircle, Loader2 } from 'lucide-react';

interface BrainStatusIndicatorProps {
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function BrainStatusIndicator({
    showLabel = false,
    size = 'md',
    className
}: BrainStatusIndicatorProps) {
    const [state] = useBrainTask();
    const { isConnected, isExecuting } = state;

    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
    };

    const dotSizes = {
        sm: 'h-2 w-2',
        md: 'h-2.5 w-2.5',
        lg: 'h-3 w-3',
    };

    const textSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    };

    const getStatusContent = () => {
        if (isExecuting) {
            return {
                icon: <Loader2 className={cn(sizeClasses[size], 'animate-spin text-purple-400')} />,
                label: 'Executing',
                color: 'bg-purple-400',
                tooltip: 'Brain is executing a task...',
            };
        }

        if (isConnected) {
            return {
                icon: <Zap className={cn(sizeClasses[size], 'text-green-400')} />,
                label: 'Connected',
                color: 'bg-green-400',
                tooltip: 'Brain sidecar connected and ready',
            };
        }

        return {
            icon: <AlertCircle className={cn(sizeClasses[size], 'text-yellow-500')} />,
            label: 'Local',
            color: 'bg-yellow-500',
            tooltip: 'Using local tools (sidecar not running)',
        };
    };

    const status = getStatusContent();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={cn(
                    'flex items-center gap-1.5 cursor-default',
                    className
                )}>
                    {/* Status dot (animated pulse when connected) */}
                    <div className="relative flex items-center justify-center">
                        {status.icon}
                        {isConnected && !isExecuting && (
                            <span className={cn(
                                'absolute inline-flex rounded-full opacity-75 animate-ping',
                                dotSizes[size],
                                status.color
                            )} />
                        )}
                    </div>

                    {showLabel && (
                        <span className={cn(
                            'font-medium',
                            textSizes[size],
                            isConnected ? 'text-green-400' : 'text-yellow-500'
                        )}>
                            {status.label}
                        </span>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-700">
                <p className="text-sm">{status.tooltip}</p>
            </TooltipContent>
        </Tooltip>
    );
}

export default BrainStatusIndicator;
