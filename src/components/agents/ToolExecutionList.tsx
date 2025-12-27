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
    Play,
    Globe,
    Cpu,
    Database,
    Image as ImageIcon,
    Tag
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
    'apply_file_diff': Code2,
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
    'search_web': Globe,
    'generate_image': ImageIcon,
    'analyze_code': Cpu,
    'query_db': Database,
    'set_chat_title': Tag,
};

function getToolIcon(toolName: string) {
    const Icon = TOOL_ICONS[toolName] || Terminal;
    return Icon;
}

function ToolExecutionItem({ tool, compact }: { tool: ToolExecution; compact?: boolean }) {
    const [isOpen, setIsOpen] = React.useState(tool.status === 'running' || tool.status === 'error');
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
                return 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10';
            case 'success':
                return 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10';
            case 'error':
                return 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10';
            default:
                return 'border-zinc-600/30 bg-zinc-800/50 hover:bg-zinc-800/70';
        }
    };

    // Format argument value for display
    const formatArgValue = (value: unknown): string => {
        if (typeof value === 'string') {
            return value;
        }
        return JSON.stringify(value);
    };

    // Get primary argument to show (usually 'path' or 'command')
    const getPrimaryArg = (): string | null => {
        const primaryKeys = ['path', 'command', 'query', 'message', 'file_path', 'target_file'];
        for (const key of primaryKeys) {
            // Check both snake_case and camelCase or direct match
            const foundKey = Object.keys(tool.arguments).find(k => k.toLowerCase() === key.replace('_', '').toLowerCase() || k.toLowerCase().includes(key));
            if (foundKey && tool.arguments[foundKey]) {
                const val = formatArgValue(tool.arguments[foundKey]);
                return val.length > 60 ? val.slice(0, 60) + '...' : val;
            }
        }
        return null;
    };

    const primaryArg = getPrimaryArg();

    if (compact) {
        return (
            <div className={cn(
                'flex items-center gap-2 px-2 py-1 rounded-md border text-xs transition-colors',
                getStatusColor()
            )}>
                {getStatusIcon()}
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-foreground/90 font-medium">{tool.name}</span>
                {primaryArg && (
                    <span className="text-muted-foreground truncate max-w-[150px] opacity-70">
                        {primaryArg}
                    </span>
                )}
            </div>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={cn(
                'rounded-lg border overflow-hidden transition-all duration-200',
                getStatusColor()
            )}>
                <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className="flex items-center justify-center shrink-0">
                            {getStatusIcon()}
                        </div>

                        <div className="h-4 w-px bg-border/50 mx-0.5" />

                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-mono text-sm font-medium text-foreground truncate">{tool.name}</span>
                            {primaryArg && (
                                <span className="text-xs text-muted-foreground truncate flex-1 text-left opacity-80 font-mono">
                                    {primaryArg}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider',
                                tool.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                                    tool.status === 'success' ? 'bg-green-500/20 text-green-400' :
                                        tool.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                            'bg-zinc-500/20 text-zinc-400'
                            )}>
                                {tool.status || 'Pending'}
                            </span>
                            {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                            )}
                        </div>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="px-3 py-3 border-t border-border/10 space-y-3 bg-black/20">
                        {/* Arguments Grid */}
                        {Object.keys(tool.arguments).length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Arguments</p>
                                <div className="grid gap-2">
                                    {Object.entries(tool.arguments).map(([key, value]) => (
                                        <div key={key} className="flex flex-col gap-1 bg-background/30 rounded p-2 border border-white/5">
                                            <span className="text-xs font-mono text-muted-foreground">{key}</span>
                                            {typeof value === 'string' && value.includes('\n') ? (
                                                <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto text-foreground/90 whitespace-pre-wrap font-mono">
                                                    {value}
                                                </pre>
                                            ) : (
                                                <code className="text-xs text-foreground/90 font-mono break-all">
                                                    {JSON.stringify(value)}
                                                </code>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Result */}
                        {tool.status === 'success' && tool.result && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold text-green-400/60 uppercase tracking-wider">Result</p>
                                <div className="bg-green-500/5 border border-green-500/10 rounded-md overflow-hidden">
                                    <pre className="text-xs p-3 overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-green-500/20">
                                        <code className="text-green-300/90 font-mono">
                                            {typeof tool.result === 'string'
                                                ? tool.result
                                                : JSON.stringify(tool.result, null, 2)}
                                        </code>
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {tool.status === 'error' && tool.error && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold text-red-400/60 uppercase tracking-wider">Error</p>
                                <div className="bg-red-500/5 border border-red-500/10 rounded-md p-3">
                                    <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
                                        {tool.error}
                                    </pre>
                                </div>
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

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {tools.map((tool, i) => (
                <ToolExecutionItem key={i} tool={tool} compact={compact} />
            ))}
        </div>
    );
}

export default ToolExecutionList;
