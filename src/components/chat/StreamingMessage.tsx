/**
 * StreamingMessage Component
 *
 * Displays a real-time streaming message from an AI agent with:
 * - Token-by-token content rendering
 * - Typing indicator animation
 * - Tool execution visualization
 * - Performance metrics display
 * - Stop button for mid-stream cancellation
 *
 * @example
 * ```tsx
 * <StreamingMessage
 *   agentId="rainy"
 *   message="Explain recursion"
 *   onComplete={(content) => console.log('Streaming complete:', content)}
 * />
 * ```
 */

import { useEffect } from 'react';
import { useStreaming } from '@/hooks/useStreaming';
import { Button } from '@/components/ui/button';
import { Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { MessageOptions } from '@/services/agents/core/AgentCore';

/**
 * Props for StreamingMessage component
 */
export interface StreamingMessageProps {
  /** ID of agent to stream from */
  agentId?: string;

  /** Message to send to agent */
  message: string;

  /** Message options */
  options?: MessageOptions;

  /** Whether to auto-start streaming on mount */
  autoStart?: boolean;

  /** Callback when streaming completes */
  onComplete?: (content: string, toolCalls: any[]) => void;

  /** Callback when streaming fails */
  onError?: (error: string) => void;

  /** Additional CSS classes */
  className?: string;

  /** Show performance metrics */
  showMetrics?: boolean;

  /** Show stop button */
  showStopButton?: boolean;
}

/**
 * StreamingMessage component
 */
export function StreamingMessage({
  agentId,
  message,
  options,
  autoStart = true,
  onComplete,
  onError,
  className,
  showMetrics = false,
  showStopButton = true,
}: StreamingMessageProps) {
  const { state, startStreaming, stopStreaming } = useStreaming(agentId);

  // Auto-start streaming on mount
  useEffect(() => {
    if (autoStart && message) {
      startStreaming(message, options);
    }
  }, [autoStart, message, options, startStreaming]);

  // Call onComplete when done
  useEffect(() => {
    if (!state.isStreaming && state.content && !state.error) {
      onComplete?.(state.content, state.toolCalls);
    }
  }, [state.isStreaming, state.content, state.toolCalls, state.error, onComplete]);

  // Call onError when error occurs
  useEffect(() => {
    if (state.error) {
      onError?.(state.error);
    }
  }, [state.error, onError]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Content area */}
      <div className="relative">
        {/* Streaming content */}
        {state.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
              {state.content}
            </pre>
          </div>
        )}

        {/* Typing indicator */}
        {state.isStreaming && (
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs">Streaming response...</span>
          </div>
        )}

        {/* Error display */}
        {state.error && (
          <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">Streaming Error</p>
            <p className="text-xs text-destructive/80 mt-1">{state.error}</p>
          </div>
        )}
      </div>

      {/* Tool calls */}
      {state.toolCalls.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tool Executions ({state.toolCalls.length})
          </p>
          <div className="space-y-1">
            {state.toolCalls.map((tool, index) => (
              <div
                key={tool.id || index}
                className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded border border-border"
              >
                <div className="size-1.5 rounded-full bg-primary" />
                <span className="font-mono text-foreground">{tool.name}</span>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(tool.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls and metrics */}
      <div className="flex items-center justify-between gap-4">
        {/* Stop button */}
        {showStopButton && state.isStreaming && (
          <Button
            variant="outline"
            size="sm"
            onClick={stopStreaming}
            className="gap-2"
          >
            <Square className="size-3" />
            Stop
          </Button>
        )}

        {/* Performance metrics */}
        {showMetrics && (state.isStreaming || state.content) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground ml-auto">
            <div className="flex items-center gap-1">
              <span className="font-medium">Chunks:</span>
              <span>{state.metrics.totalChunks}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Time:</span>
              <span>{Math.round(state.metrics.executionTimeMs)}ms</span>
            </div>
            {state.metrics.avgStreamLatencyMs > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Avg Latency:</span>
                <span>{Math.round(state.metrics.avgStreamLatencyMs)}ms</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Typing indicator component (can be used standalone)
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex gap-1">
        <div className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
        <div className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
        <div className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" />
      </div>
      <span className="text-xs text-muted-foreground">Thinking...</span>
    </div>
  );
}
