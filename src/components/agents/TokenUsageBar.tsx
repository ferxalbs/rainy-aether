/**
 * Token Usage Indicator Component
 * 
 * Displays context usage as a progress bar with warnings when approaching limits.
 */

import { cn } from "@/lib/utils";
import { formatTokenCount } from "@/services/agent/TokenCounter";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TokenUsageBarProps {
    usedTokens: number;
    maxTokens: number;
    className?: string;
}

export function TokenUsageBar({ usedTokens, maxTokens, className }: TokenUsageBarProps) {
    const percentUsed = Math.min(100, (usedTokens / maxTokens) * 100);

    // Determine color based on usage
    const getBarColor = () => {
        if (percentUsed >= 95) return "bg-red-500";
        if (percentUsed >= 80) return "bg-yellow-500";
        if (percentUsed >= 60) return "bg-blue-500";
        return "bg-green-500";
    };

    const getStatusText = () => {
        if (percentUsed >= 95) return "Context full";
        if (percentUsed >= 80) return "Approaching limit";
        return "Available";
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 cursor-default",
                        className
                    )}>
                        {/* Progress bar */}
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-300", getBarColor())}
                                style={{ width: `${percentUsed}%` }}
                            />
                        </div>
                        {/* Percentage text */}
                        <span className={cn(
                            "text-[10px] font-medium tabular-nums",
                            percentUsed >= 80 ? "text-yellow-500" : "text-muted-foreground"
                        )}>
                            {percentUsed.toFixed(0)}%
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-foreground/95 backdrop-blur-sm text-background border border-primary/20">
                    <div className="space-y-1">
                        <div className="font-semibold text-background">{getStatusText()}</div>
                        <div className="text-background/80 text-[11px]">
                            {formatTokenCount(usedTokens)} / {formatTokenCount(maxTokens)} tokens
                        </div>
                        <div className="text-background/80 text-[11px]">
                            {formatTokenCount(Math.max(0, maxTokens - usedTokens))} remaining
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
