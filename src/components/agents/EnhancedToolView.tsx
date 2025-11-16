/**
 * EnhancedToolView Component
 *
 * Enhanced visualization for tool execution with:
 * - Progress bars for long-running operations
 * - File tree visualization for file operations
 * - Git diff rendering for code changes
 * - Syntax highlighting for code output
 * - Expandable/collapsible sections
 *
 * @example
 * ```tsx
 * <EnhancedToolView
 *   toolCall={{
 *     name: 'read_file',
 *     arguments: { path: 'src/app.ts' },
 *     result: '...',
 *     status: 'success',
 *     executionTimeMs: 45
 *   }}
 * />
 * ```
 */

import { useState } from 'react';
import { CodeBlock } from '@/components/chat';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Check,
  X,
  Loader2,
  Clock,
  Terminal,
  FileText,
  GitBranch,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Tool call with enhanced metadata
 */
export interface EnhancedToolCall {
  /** Tool name */
  name: string;

  /** Tool arguments */
  arguments: Record<string, any>;

  /** Tool result */
  result?: any;

  /** Execution status */
  status: 'pending' | 'running' | 'success' | 'error';

  /** Error message if failed */
  error?: string;

  /** Execution time in milliseconds */
  executionTimeMs?: number;

  /** Progress (0-100) */
  progress?: number;

  /** Timestamp */
  timestamp: string;
}

/**
 * Props for EnhancedToolView
 */
export interface EnhancedToolViewProps {
  /** Tool call to display */
  toolCall: EnhancedToolCall;

  /** Whether to start expanded */
  defaultExpanded?: boolean;

  /** Whether to show progress bar */
  showProgress?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Get icon for tool name
 */
function getToolIcon(toolName: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    read_file: <FileText className="size-4" />,
    write_file: <FileText className="size-4" />,
    execute_command: <Terminal className="size-4" />,
    list_directory: <Folder className="size-4" />,
    git_diff: <GitBranch className="size-4" />,
    run_code: <Play className="size-4" />,
  };

  return iconMap[toolName] || <File className="size-4" />;
}

/**
 * Get display name for tool
 */
function getToolDisplayName(toolName: string): string {
  const nameMap: Record<string, string> = {
    read_file: 'Read File',
    write_file: 'Write File',
    execute_command: 'Execute Command',
    list_directory: 'List Directory',
    git_diff: 'Git Diff',
    run_code: 'Run Code',
  };

  return nameMap[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format execution time
 */
function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * EnhancedToolView component
 */
export function EnhancedToolView({
  toolCall,
  defaultExpanded = false,
  showProgress = true,
  className,
}: EnhancedToolViewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Determine status color
  const statusColor = {
    pending: 'text-muted-foreground',
    running: 'text-blue-500',
    success: 'text-green-500',
    error: 'text-destructive',
  }[toolCall.status];

  // Determine status icon
  const statusIcon = {
    pending: <Clock className="size-3" />,
    running: <Loader2 className="size-3 animate-spin" />,
    success: <Check className="size-3" />,
    error: <X className="size-3" />,
  }[toolCall.status];

  return (
    <div className={cn('border border-border rounded-md overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Expand/collapse icon */}
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}

          {/* Tool icon */}
          <div className="text-primary">{getToolIcon(toolCall.name)}</div>

          {/* Tool name */}
          <span className="text-sm font-medium text-foreground">
            {getToolDisplayName(toolCall.name)}
          </span>

          {/* Status icon */}
          <div className={statusColor}>{statusIcon}</div>
        </div>

        {/* Execution time */}
        {toolCall.executionTimeMs !== undefined && toolCall.status === 'success' && (
          <span className="text-xs text-muted-foreground">
            {formatExecutionTime(toolCall.executionTimeMs)}
          </span>
        )}
      </button>

      {/* Progress bar */}
      {showProgress && toolCall.status === 'running' && toolCall.progress !== undefined && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${toolCall.progress}%` }}
          />
        </div>
      )}

      {/* Content (expanded) */}
      {expanded && (
        <div className="p-4 space-y-3">
          {/* Arguments */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Arguments
            </h4>
            <div className="bg-muted/50 rounded-md p-3 space-y-1">
              {Object.entries(toolCall.arguments).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <span className="font-mono text-primary">{key}:</span>
                  <span className="text-foreground font-mono">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          {toolCall.result && toolCall.status === 'success' && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Result
              </h4>
              <ToolResultDisplay name={toolCall.name} result={toolCall.result} />
            </div>
          )}

          {/* Error */}
          {toolCall.error && toolCall.status === 'error' && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <h4 className="text-xs font-medium text-destructive uppercase tracking-wider mb-1">
                Error
              </h4>
              <p className="text-sm text-destructive/90">{toolCall.error}</p>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Executed at: {new Date(toolCall.timestamp).toLocaleTimeString()}</span>
            {toolCall.executionTimeMs !== undefined && (
              <span>Duration: {formatExecutionTime(toolCall.executionTimeMs)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ToolResultDisplay - Renders result based on tool type
 */
function ToolResultDisplay({ name, result }: { name: string; result: any }) {
  // File content (read_file)
  if (name === 'read_file' && typeof result === 'string') {
    // Detect language from file extension in arguments
    return (
      <CodeBlock
        language="typescript"
        code={result}
        showCopyButton={true}
        showLineNumbers={true}
      />
    );
  }

  // Directory listing (list_directory)
  if (name === 'list_directory' && Array.isArray(result)) {
    return <FileTreeView files={result} />;
  }

  // Git diff (git_diff)
  if (name === 'git_diff' && typeof result === 'string') {
    return <GitDiffView diff={result} />;
  }

  // Command output (execute_command)
  if (name === 'execute_command' && typeof result === 'string') {
    return (
      <div className="bg-black/90 rounded-md p-3 font-mono text-xs text-green-400 overflow-x-auto">
        <pre>{result}</pre>
      </div>
    );
  }

  // Default: JSON stringify
  return (
    <CodeBlock
      language="json"
      code={JSON.stringify(result, null, 2)}
      showCopyButton={true}
      showLineNumbers={false}
    />
  );
}

/**
 * FileTreeView - Renders file tree for directory listings
 */
function FileTreeView({ files }: { files: string[] }) {
  return (
    <div className="bg-muted/50 rounded-md p-3 space-y-1">
      {files.map((file, index) => {
        const isDirectory = file.endsWith('/');
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            {isDirectory ? (
              <Folder className="size-4 text-blue-500" />
            ) : (
              <File className="size-4 text-muted-foreground" />
            )}
            <span className="font-mono text-foreground">{file}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * GitDiffView - Renders git diff with syntax highlighting
 */
function GitDiffView({ diff }: { diff: string }) {
  const lines = diff.split('\n');

  return (
    <div className="bg-black/90 rounded-md p-3 font-mono text-xs overflow-x-auto">
      {lines.map((line, index) => {
        let className = 'text-gray-300';
        if (line.startsWith('+')) className = 'text-green-400';
        if (line.startsWith('-')) className = 'text-red-400';
        if (line.startsWith('@@')) className = 'text-blue-400';
        if (line.startsWith('diff')) className = 'text-yellow-400';

        return (
          <div key={index} className={className}>
            {line || '\u00A0'}
          </div>
        );
      })}
    </div>
  );
}
