/**
 * Tool Execution View Component
 *
 * Visualizes tool execution in real-time, showing which tools are being
 * called by the agent and their results.
 *
 * Features:
 * - Real-time tool execution display
 * - Execution status (pending, running, success, error)
 * - Execution time tracking
 * - Expandable tool results
 * - Smooth animations
 *
 * @example
 * ```tsx
 * import { ToolExecutionView } from '@/components/agents/ToolExecutionView';
 *
 * function MyComponent() {
 *   const toolCalls = [...]; // From agent result
 *
 *   return <ToolExecutionView toolCalls={toolCalls} />;
 * }
 * ```
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Terminal,
  GitBranch,
  Folder,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import type { ToolCall } from '@/types/rustAgent';

/**
 * Tool Execution View Props
 */
export interface ToolExecutionViewProps {
  /** Tool calls to display */
  toolCalls?: ToolCall[];

  /** Additional CSS class */
  className?: string;

  /** Compact mode */
  compact?: boolean;

  /** Show timestamp */
  showTimestamp?: boolean;
}

/**
 * Get icon for tool type
 */
function getToolIcon(toolName: string) {
  if (toolName.includes('file') || toolName.includes('read') || toolName.includes('write')) {
    return FileText;
  }
  if (toolName.includes('command') || toolName.includes('terminal') || toolName.includes('execute')) {
    return Terminal;
  }
  if (toolName.includes('git')) {
    return GitBranch;
  }
  if (toolName.includes('directory') || toolName.includes('workspace')) {
    return Folder;
  }
  return FileText;
}

/**
 * Get status icon
 */
function getStatusIcon(status?: 'pending' | 'running' | 'success' | 'error') {
  switch (status) {
    case 'success':
      return CheckCircle;
    case 'error':
      return XCircle;
    case 'running':
      return Loader2;
    default:
      return Clock;
  }
}

/**
 * Get status color
 */
function getStatusColor(status?: 'pending' | 'running' | 'success' | 'error') {
  switch (status) {
    case 'success':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
    case 'running':
      return 'text-blue-500';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Single Tool Execution Item
 */
function ToolExecutionItem({
  toolCall,
  compact = false,
  showTimestamp = true,
}: {
  toolCall: ToolCall;
  compact?: boolean;
  showTimestamp?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const ToolIcon = getToolIcon(toolCall.name);
  const StatusIcon = getStatusIcon(toolCall.status);
  const statusColor = getStatusColor(toolCall.status);

  const hasResult = toolCall.result && toolCall.result.output;
  const isRunning = toolCall.status === 'running';

  return (
    <div
      className={cn(
        'border border-border rounded-lg transition-all',
        compact ? 'p-2' : 'p-3',
        hasResult && 'hover:border-primary/50 cursor-pointer'
      )}
      onClick={() => hasResult && setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        {/* Tool Icon */}
        <div className="shrink-0 p-1.5 rounded bg-muted text-muted-foreground">
          <ToolIcon className="size-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-medium text-sm', compact && 'text-xs')}>
              {toolCall.name}
            </span>

            {/* Status */}
            <div className={cn('flex items-center gap-1', statusColor)}>
              <StatusIcon
                className={cn('size-3.5', isRunning && 'animate-spin')}
              />
              {!compact && toolCall.status && (
                <span className="text-xs capitalize">{toolCall.status}</span>
              )}
            </div>

            {/* Execution Time */}
            {toolCall.result?.executionTimeMs && (
              <span className="text-xs text-muted-foreground ml-auto">
                {toolCall.result.executionTimeMs}ms
              </span>
            )}
          </div>

          {/* Arguments (compact) */}
          {!compact && toolCall.arguments && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {typeof toolCall.arguments === 'string'
                ? toolCall.arguments
                : JSON.stringify(toolCall.arguments)}
            </div>
          )}

          {/* Timestamp */}
          {showTimestamp && toolCall.timestamp && (
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              {formatTimestamp(toolCall.timestamp)}
            </div>
          )}
        </div>

        {/* Expand Icon */}
        {hasResult && (
          <button
            className="shrink-0 p-1 hover:bg-accent rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Result */}
      {isExpanded && hasResult && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Result
          </div>
          <div className="bg-muted rounded-md p-2 text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words">
              {typeof toolCall.result.output === 'string'
                ? toolCall.result.output
                : JSON.stringify(toolCall.result.output, null, 2)}
            </pre>
          </div>

          {/* Error */}
          {!toolCall.result.success && toolCall.result.error && (
            <div className="mt-2 text-xs text-red-500">
              Error: {toolCall.result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Tool Execution View Component
 *
 * Displays a list of tool executions with expandable results.
 */
export function ToolExecutionView({
  toolCalls = [],
  className,
  compact = false,
  showTimestamp = true,
}: ToolExecutionViewProps) {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', compact ? 'p-2' : 'p-3', className)}>
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-foreground">
            Tool Executions
          </h4>
          <span className="text-xs text-muted-foreground">
            {toolCalls.length} call{toolCalls.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {toolCalls.map((toolCall) => (
          <ToolExecutionItem
            key={toolCall.id}
            toolCall={toolCall}
            compact={compact}
            showTimestamp={showTimestamp}
          />
        ))}
      </div>
    </div>
  );
}
