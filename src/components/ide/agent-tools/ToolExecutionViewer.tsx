/**
 * Tool Execution Viewer Component
 *
 * Real-time display of agent tool executions with status, progress, and results.
 */

import React, { useEffect, useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  GitBranch,
  FolderTree,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getAuditLogger, type AuditLogEntry } from '@/services/agent/tools/audit';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ToolExecutionViewerProps {
  className?: string;
  maxEntries?: number;
}

export const ToolExecutionViewer: React.FC<ToolExecutionViewerProps> = ({
  className,
  maxEntries = 50,
}) => {
  const [executions, setExecutions] = useState<AuditLogEntry[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const auditLogger = getAuditLogger();

    // Get initial logs
    const initialLogs = auditLogger.getAllLogs().slice(-maxEntries);
    setExecutions(initialLogs.reverse());

    // Subscribe to new executions
    const interval = setInterval(() => {
      const logs = auditLogger.getAllLogs().slice(-maxEntries);
      setExecutions(logs.reverse());
    }, 1000);

    return () => clearInterval(interval);
  }, [maxEntries]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.startsWith('terminal_')) return Terminal;
    if (toolName.startsWith('git_')) return GitBranch;
    if (toolName.startsWith('workspace_')) return FolderTree;
    if (toolName.startsWith('file_')) return FileText;
    return Play;
  };

  const getStatusIcon = (success: boolean, isRunning?: boolean) => {
    if (isRunning) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (success) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getCategoryColor = (toolName: string): string => {
    if (toolName.startsWith('terminal_')) return 'bg-purple-500/20 text-purple-500';
    if (toolName.startsWith('git_')) return 'bg-orange-500/20 text-orange-500';
    if (toolName.startsWith('workspace_')) return 'bg-blue-500/20 text-blue-500';
    if (toolName.startsWith('file_')) return 'bg-green-500/20 text-green-500';
    return 'bg-muted text-muted-foreground';
  };

  const getPermissionColor = (level: string): string => {
    switch (level) {
      case 'restricted':
        return 'bg-red-500/20 text-red-500';
      case 'admin':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'user':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleTimeString();
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Tool Executions</h3>
          <Badge variant="secondary" className="text-xs">
            {executions.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Real-time</span>
        </div>
      </div>

      {/* Execution List */}
      <div className="flex-1 overflow-y-auto">
        {executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Play className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">No tool executions yet</p>
            <p className="text-xs mt-1">Executions will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {executions.map(execution => {
              const ToolIcon = getToolIcon(execution.tool);
              const isExpanded = expandedIds.has(execution.id);

              return (
                <Card
                  key={execution.id}
                  className={cn(
                    'p-3 cursor-pointer transition-colors hover:bg-accent/50',
                    !execution.success && 'border-l-2 border-l-red-500'
                  )}
                  onClick={() => toggleExpand(execution.id)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {/* Expand Icon */}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      )}

                      {/* Tool Icon */}
                      <ToolIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />

                      {/* Tool Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground truncate">
                            {execution.tool}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', getCategoryColor(execution.tool))}
                          >
                            {execution.tool.split('_')[0]}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', getPermissionColor(execution.permissionLevel))}
                          >
                            {execution.permissionLevel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTimestamp(execution.timestamp)}</span>
                          <span>•</span>
                          <span>{formatDuration(execution.duration)}</span>
                          {execution.user && (
                            <>
                              <span>•</span>
                              <span className="truncate">{execution.user}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Icon */}
                    <div className="shrink-0">{getStatusIcon(execution.success)}</div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {/* Input Summary */}
                      {execution.inputSummary && (
                        <div>
                          <div className="text-xs font-medium text-foreground mb-1">Input:</div>
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md font-mono">
                            {execution.inputSummary}
                          </div>
                        </div>
                      )}

                      {/* Output Summary */}
                      {execution.outputSummary && execution.success && (
                        <div>
                          <div className="text-xs font-medium text-foreground mb-1">Output:</div>
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md font-mono max-h-32 overflow-y-auto">
                            {execution.outputSummary}
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {!execution.success && execution.error && (
                        <div>
                          <div className="flex items-center gap-1 text-xs font-medium text-red-500 mb-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Error:</span>
                          </div>
                          <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded-md font-mono">
                            {execution.error}
                          </div>
                        </div>
                      )}

                      {/* Session ID */}
                      {execution.session && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Session:</span> {execution.session}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
