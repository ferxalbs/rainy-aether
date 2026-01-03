/**
 * Subagent Manager Component
 * 
 * Full-featured UI for managing custom subagents:
 * - Browse and search subagents
 * - Create new subagents
 * - Edit existing subagents  
 * - View analytics and usage stats
 */

import { Plus, Search, Trash2, Edit2, MoreHorizontal, Zap, Circle, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SubagentFormDialog } from "./SubagentFormDialog";

// ===========================
// Types
// ===========================

interface SubagentConfig {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    scope: 'user' | 'project' | 'plugin';
    model: string;
    tools: string[] | 'all';
    keywords: string[];
    tags: string[];
    priority: number;
    usageCount: number;
    successRate?: number;
    createdAt: string;
    updatedAt: string;
}

interface SubagentStats {
    total: number;
    enabled: number;
    disabled: number;
}

// ===========================
// API Functions
// ===========================

async function fetchSubagents(filters?: {
    scope?: string;
    enabled?: boolean;
    tag?: string;
    search?: string;
}): Promise<{ agents: SubagentConfig[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.scope) params.append('scope', filters.scope);
    if (filters?.enabled !== undefined) params.append('enabled', String(filters.enabled));
    if (filters?.tag) params.append('tag', filters.tag);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(`http://localhost:3001/api/agentkit/subagents?${params}`);
    if (!response.ok) throw new Error('Failed to fetch subagents');
    const data = await response.json();
    return { agents: data.agents || [], count: data.count || 0 };
}

async function fetchSubagentStats(): Promise<SubagentStats> {
    const response = await fetch('http://localhost:3001/api/agentkit/subagents/stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    const data = await response.json();
    return data.stats;
}

async function deleteSubagent(id: string): Promise<void> {
    const response = await fetch(`http://localhost:3001/api/agentkit/subagents/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete subagent');
}

async function reloadSubagents(): Promise<void> {
    const response = await fetch('http://localhost:3001/api/agentkit/subagents/reload', {
        method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to reload subagents');
}

// ===========================
// Components
// ===========================

function SubagentCard({ agent, onEdit, onDelete }: {
    agent: SubagentConfig;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const getModelBadgeColor = (model: string) => {
        if (model.includes('gemini')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        if (model.includes('claude')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        if (model.includes('gpt')) return 'bg-green-500/10 text-green-500 border-green-500/20';
        if (model.includes('grok')) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        return 'bg-muted text-muted-foreground border-border';
    };

    const getScopeBadgeColor = (scope: string) => {
        if (scope === 'project') return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
        if (scope === 'user') return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
        return 'bg-muted text-muted-foreground border-border';
    };

    return (
        <div className={cn(
            "group relative p-4 rounded-lg border transition-all duration-200",
            !agent.enabled
                ? "bg-muted/30 border-border/30 opacity-60"
                : "bg-background border-border hover:border-primary/50 hover:shadow-sm"
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                        agent.enabled ? "bg-primary/10" : "bg-muted"
                    )}>
                        <Zap className={cn("h-4 w-4", agent.enabled ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{agent.description}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <Circle className={cn(
                        "h-2 w-2 shrink-0",
                        agent.enabled ? "fill-green-500 text-green-500" : "fill-muted-foreground text-muted-foreground"
                    )} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={onEdit} className="text-xs">
                                <Edit2 className="h-3 w-3 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDelete} className="text-xs text-red-500 focus:text-red-500">
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", getModelBadgeColor(agent.model))}>
                    {agent.model}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", getScopeBadgeColor(agent.scope))}>
                    {agent.scope}
                </Badge>
                {agent.priority > 70 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-500 border-orange-500/20">
                        High Priority
                    </Badge>
                )}
            </div>

            {/* Stats */}
            {(agent.usageCount > 0 || agent.successRate !== undefined) && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                    {agent.usageCount > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>{agent.usageCount} uses</span>
                        </div>
                    )}
                    {agent.successRate !== undefined && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{Math.round(agent.successRate * 100)}% success</span>
                        </div>
                    )}
                </div>
            )}

            {/* Tags */}
            {agent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {agent.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            #{tag}
                        </span>
                    ))}
                    {agent.tags.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 text-muted-foreground">
                            +{agent.tags.length - 3}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export function SubagentManager({ className }: { className?: string }) {
    const [agents, setAgents] = useState<SubagentConfig[]>([]);
    const [stats, setStats] = useState<SubagentStats | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [selectedAgent, setSelectedAgent] = useState<SubagentConfig | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);

    // Load agents on mount
    useEffect(() => {
        loadAgents();
        loadStats();
    }, []);

    const loadAgents = async () => {
        setIsLoading(true);
        try {
            const result = await fetchSubagents({
                search: searchQuery || undefined,
                enabled: filter === 'all' ? undefined : filter === 'enabled',
            });
            setAgents(result.agents);
        } catch (error) {
            console.error('[SubagentManager] Failed to load agents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const result = await fetchSubagentStats();
            setStats(result);
        } catch (error) {
            console.error('[SubagentManager] Failed to load stats:', error);
        }
    };

    const handleDelete = async (agent: SubagentConfig) => {
        if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;

        try {
            await deleteSubagent(agent.id);
            await loadAgents();
            await loadStats();
        } catch (error) {
            console.error('[SubagentManager] Failed to delete agent:', error);
            alert('Failed to delete agent');
        }
    };

    const handleReload = async () => {
        try {
            await reloadSubagents();
            await loadAgents();
            await loadStats();
        } catch (error) {
            console.error('[SubagentManager] Failed to reload:', error);
        }
    };

    const handleEdit = (agent: SubagentConfig) => {
        setSelectedAgent(agent);
        setShowEditDialog(true);
    };

    const handleFormSuccess = () => {
        setShowCreateDialog(false);
        setShowEditDialog(false);
        setSelectedAgent(null);
        loadAgents();
        loadStats();
    };

    const filteredAgents = agents.filter(agent => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                agent.name.toLowerCase().includes(query) ||
                agent.description.toLowerCase().includes(query) ||
                agent.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }
        return true;
    });

    return (
        <div className={cn("flex flex-col h-full bg-muted/40", className)}>
            {/* Header */}
            <div className="p-4 border-b border-border bg-background/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-white/10">
                            <Zap className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Custom Subagents</h2>
                            {stats && (
                                <p className="text-[10px] text-muted-foreground">
                                    {stats.total} total · {stats.enabled} enabled
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={handleReload}
                                        disabled={isLoading}
                                    >
                                        <Loader2 className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reload from disk</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                            onClick={() => setShowCreateDialog(true)}
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            New Subagent
                        </Button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search subagents..."
                            className="pl-8 h-8 bg-background border-border text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1 bg-muted rounded-md p-0.5">
                        <Button
                            size="sm"
                            variant={filter === 'all' ? 'secondary' : 'ghost'}
                            className="h-7 px-2.5 text-[10px]"
                            onClick={() => setFilter('all')}
                        >
                            All
                        </Button>
                        <Button
                            size="sm"
                            variant={filter === 'enabled' ? 'secondary' : 'ghost'}
                            className="h-7 px-2.5 text-[10px]"
                            onClick={() => setFilter('enabled')}
                        >
                            Enabled
                        </Button>
                        <Button
                            size="sm"
                            variant={filter === 'disabled' ? 'secondary' : 'ghost'}
                            className="h-7 px-2.5 text-[10px]"
                            onClick={() => setFilter('disabled')}
                        >
                            Disabled
                        </Button>
                    </div>
                </div>
            </div>

            {/* Agent Grid */}
            <ScrollArea className="flex-1">
                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {isLoading ? (
                        <div className="col-span-full flex items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                                <p className="text-sm text-muted-foreground">Loading subagents...</p>
                            </div>
                        </div>
                    ) : filteredAgents.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-3">
                                <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-sm font-medium text-foreground mb-1">No subagents found</h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                {searchQuery ? "Try a different search query" : "Create your first custom subagent"}
                            </p>
                            {!searchQuery && (
                                <Button
                                    size="sm"
                                    onClick={() => setShowCreateDialog(true)}
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Create Subagent
                                </Button>
                            )}
                        </div>
                    ) : (
                        filteredAgents.map(agent => (
                            <SubagentCard
                                key={agent.id}
                                agent={agent}
                                onEdit={() => handleEdit(agent)}
                                onDelete={() => handleDelete(agent)}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Dialogs */}
            <SubagentFormDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSuccess={handleFormSuccess}
            />
            <SubagentFormDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                agent={selectedAgent || undefined}
                onSuccess={handleFormSuccess}
            />
        </div>
    );
}
