/**
 * Tool Execution List
 * 
 * Shows a real-time list of tool executions with status indicators.
 * Used in the agent chat to show what tools are being called.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronDown,
    ChevronRight,
    Terminal,
    FileText,
    FolderOpen,
    Search,
    GitBranch,
    Code2,
    Play
} from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ToolExecution {
    name: string;
    arguments: Record<string, any>;
    status?: 'pending' | 'running' | 'success' | 'error';
    result?: any;
    error?: string;
}

interface ToolExecutionListProps {
    tools: ToolExecution[];
    className?: string;
    compact?: boolean;
}

// Map tool names to icons
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    'read_file': FileText,
    'write_file': FileText,
    'create_file': FileText,
    'edit_file': Code2,
    'delete_file': FileText,
    'list_dir': FolderOpen,
    'list_files': FolderOpen,
    'read_directory_tree': FolderOpen,
    'search_code': Search,
    'run_command': Terminal,
    'run_tests': Play,
    'get_workspace_info': FolderOpen,
    'git_status': GitBranch,
    'git_diff': GitBranch,
    'git_commit': GitBranch,
    'git_add': GitBranch,
};

function getToolIcon(toolName: string) {
    const Icon = TOOL_ICONS[toolName] || Terminal;
    return Icon;
}

function ToolExecutionItem({ tool, compact }: { tool: ToolExecution; compact?: boolean }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const Icon = getToolIcon(tool.name);

    const getStatusIcon = () => {
        switch (tool.status) {
            case 'running':
                return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />;
            case 'success':
                return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
            case 'error':
                return <XCircle className="h-3.5 w-3.5 text-red-400" />;
            default:
                return <Loader2 className="h-3.5 w-3.5 text-zinc-400" />;
        }
    };

    const getStatusColor = () => {
        switch (tool.status) {
            case 'running':
                return 'border-blue-500/30 bg-blue-500/5';
            case 'success':
                return 'border-green-500/30 bg-green-500/5';
            case 'error':
                return 'border-red-500/30 bg-red-500/5';
            default:
                return 'border-zinc-600/30 bg-zinc-800/50';
        }
    };

    // Format argument value for display
    const formatArgValue = (value: unknown): string => {
        if (typeof value === 'string') {
            return value.length > 50 ? value.slice(0, 50) + '...' : value;
        }
        return JSON.stringify(value);
    };

    // Get primary argument to show (usually 'path' or 'command')
    const getPrimaryArg = (): string | null => {
        const primaryKeys = ['path', 'command', 'query', 'message'];
        for (const key of primaryKeys) {
            if (tool.arguments[key]) {
                return formatArgValue(tool.arguments[key]);
            }
        }
        return null;
    };

    const primaryArg = getPrimaryArg();

    if (compact) {
        return (
            <div className={cn(
                'flex items-center gap-2 px-2 py-1 rounded border text-xs',
                getStatusColor()
            )}>
                {getStatusIcon()}
                <Icon className="h-3 w-3 text-zinc-400" />
                <span className="font-mono text-zinc-300">{tool.name}</span>
                {primaryArg && (
                    <span className="text-zinc-500 truncate max-w-[150px]">
                        {primaryArg}
                    </span>
                )}
            </div>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={cn(
                'rounded-lg border overflow-hidden',
                getStatusColor()
            )}>
                <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700/20 transition-colors">
                        {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                        ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                        {getStatusIcon()}
                        <Icon className="h-4 w-4 text-zinc-400" />
                        <span className="font-mono text-sm text-zinc-200">{tool.name}</span>
                        {primaryArg && (
                            <span className="text-xs text-zinc-500 truncate flex-1 text-left">
                                {primaryArg}
                            </span>
                        )}
                        <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            tool.status === 'running' ? 'bg-blue-500/20 text-blue-300' :
                                tool.status === 'success' ? 'bg-green-500/20 text-green-300' :
                                    tool.status === 'error' ? 'bg-red-500/20 text-red-300' :
                                        'bg-zinc-600/20 text-zinc-400'
                        )}>
                            {tool.status === 'running' ? 'Running' :
                                tool.status === 'success' ? 'Success' :
                                    tool.status === 'error' ? 'Error' : 'Pending'}
                        </span>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="px-3 py-2 border-t border-zinc-700/30 space-y-2">
                        {/* Arguments */}
                        <div>
                            <p className="text-xs font-medium text-zinc-400 mb-1">Arguments</p>
                            <pre className="text-xs bg-zinc-900/50 rounded p-2 overflow-x-auto">
                                <code className="text-zinc-300">
                                    {JSON.stringify(tool.arguments, null, 2) ?? '{}'}
                                </code>
                            </pre>
                        </div>

                        {/* Result */}
                        {tool.status === 'success' && tool.result && (
                            <div>
                                <p className="text-xs font-medium text-zinc-400 mb-1">Result</p>
                                <pre className="text-xs bg-zinc-900/50 rounded p-2 overflow-x-auto max-h-40">
                                    <code className="text-green-300">
                                        {typeof tool.result === 'string'
                                            ? tool.result.slice(0, 500)
                                            : JSON.stringify(tool.result, null, 2).slice(0, 500)}
                                        {(typeof tool.result === 'string' && tool.result.length > 500) ||
                                            (typeof tool.result !== 'string' && JSON.stringify(tool.result).length > 500)
                                            ? '...' : ''}
                                    </code>
                                </pre>
                            </div>
                        )}

                        {/* Error */}
                        {tool.status === 'error' && tool.error && (
                            <div>
                                <p className="text-xs font-medium text-red-400 mb-1">Error</p>
                                <pre className="text-xs bg-red-900/20 rounded p-2 text-red-300">
                                    {tool.error}
                                </pre>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

export function ToolExecutionList({ tools, className, compact = false }: ToolExecutionListProps) {
    if (tools.length === 0) return null;

    if (compact) {
        return (
            <div className={cn('flex flex-wrap gap-1', className)}>
                {tools.map((tool, i) => (
                    <ToolExecutionItem key={i} tool={tool} compact />
                ))}
            </div>
        );
    }

    return (
        <div className={cn('space-y-2', className)}>
            {tools.map((tool, i) => (
                <ToolExecutionItem key={i} tool={tool} />
            ))}
        </div>
    );
}

export default ToolExecutionList;
