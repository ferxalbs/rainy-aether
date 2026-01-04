/**
 * Subagent Manager Component
 * 
 * Professional interface for managing custom AI subagents.
 * Matches the MCP Manager design pattern.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Loader2, Plus,
    Trash2, CheckCircle2, Circle, Sparkles, Settings2, Zap
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Switch } from '../ui/switch';
import { SubagentFormDialog } from './SubagentFormDialog';
import { ScrollArea } from '../ui/scroll-area';
import { getIDEState } from '../../stores/ideStore';

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
    systemPrompt: string;
    keywords: string[];
    patterns: string[];
    tags: string[];
    priority: number;
    temperature: number;
    maxTokens?: number;
    maxIterations: number;
    usageCount: number;
    successRate?: number;
    createdAt: string;
    updatedAt: string;
}

interface SubagentManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const API_BASE = 'http://localhost:3847/api/agentkit/subagents';

const SubagentManager: React.FC<SubagentManagerProps> = ({ isOpen, onClose }) => {
    const [agents, setAgents] = useState<SubagentConfig[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingAgent, setEditingAgent] = useState<SubagentConfig | null>(null);

    // Get current workspace path (dynamic based on open project)
    const workspacePath = getIDEState().workspace?.path;

    // Load agents from API
    const loadAgents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(API_BASE);

            if (res.ok) {
                const data = await res.json();
                const formattedAgents: SubagentConfig[] = data.agents || [];
                setAgents(formattedAgents);

                if (formattedAgents.length > 0 && !selectedAgent) {
                    setSelectedAgent(formattedAgents[0].id);
                }
            } else {
                // Server returned error - probably no agents configured
                setAgents([]);
            }
        } catch {
            // Server not reachable - this is fine, just show empty state
            setAgents([]);
        } finally {
            setLoading(false);
        }
    }, [selectedAgent]);

    useEffect(() => {
        if (isOpen) {
            loadAgents();
        }
    }, [isOpen, loadAgents]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAgents();
        setRefreshing(false);
    };

    const handleToggleEnabled = async (agentId: string, enabled: boolean) => {
        // Update local state immediately
        setAgents(prev => prev.map(a =>
            a.id === agentId ? { ...a, enabled } : a
        ));

        try {
            await fetch(`${API_BASE}/${agentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled }),
            });
        } catch (err) {
            console.error('Failed to toggle agent:', err);
            // Revert on error
            await loadAgents();
        }
    };

    const handleDelete = async (agentId: string) => {
        if (!confirm('Delete this subagent? This cannot be undone.')) return;

        try {
            await fetch(`${API_BASE}/${agentId}`, {
                method: 'DELETE',
            });

            setAgents(prev => prev.filter(a => a.id !== agentId));
            if (selectedAgent === agentId) {
                setSelectedAgent(agents[0]?.id || null);
            }
        } catch (err) {
            console.error('Failed to delete agent:', err);
        }
    };

    const selectedAgentData = agents.find(a => a.id === selectedAgent);
    const totalAgents = agents.length;
    const enabledCount = agents.filter(a => a.enabled).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl w-[90%] h-[88%] max-w-6xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border dark:border-border/30">
                    <h2 className="text-xl font-semibold">Manage Custom Subagents</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {enabledCount}/{totalAgents} enabled
                        </span>
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            className="px-3 py-1.5 text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors bg-primary/10 hover:bg-primary/20 rounded-lg"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Subagent
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 hover:bg-background/20 hover:backdrop-blur-lg rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                            aria-label="Refresh"
                        >
                            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-background/20 hover:backdrop-blur-lg rounded-lg transition-all duration-200 hover:scale-105"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Agent Sidebar */}
                    <div className="w-64 border-r border-border dark:border-border/30 flex flex-col">
                        <ScrollArea className="flex-1">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : agents.length === 0 ? (
                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-primary" />
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        No custom subagents yet
                                    </p>
                                    <button
                                        onClick={() => setShowCreateDialog(true)}
                                        className="px-4 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                                    >
                                        Create your first
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/30">
                                    {agents.map(agent => (
                                        <button
                                            key={agent.id}
                                            onClick={() => setSelectedAgent(agent.id)}
                                            className={cn(
                                                "w-full p-3 text-left transition-colors",
                                                selectedAgent === agent.id
                                                    ? "bg-primary/10"
                                                    : "hover:bg-background/30"
                                            )}
                                        >
                                            <div className="flex items-start gap-2">
                                                {agent.enabled ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                ) : (
                                                    <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm truncate">{agent.name}</div>
                                                    <div className="text-xs text-muted-foreground truncate">{agent.description}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn(
                                                            "text-xs px-1.5 py-0.5 rounded",
                                                            agent.scope === 'project' ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                                                        )}>
                                                            {agent.scope}
                                                        </span>
                                                        {agent.usageCount > 0 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {agent.usageCount} uses
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Agent Details */}
                    <div className="flex-1 overflow-y-auto">
                        {selectedAgentData ? (
                            <div className="p-6 space-y-6">
                                {/* Agent Header */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold">{selectedAgentData.name}</h3>
                                        <p className="text-muted-foreground mt-1">{selectedAgentData.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={selectedAgentData.enabled}
                                            onCheckedChange={(enabled) => handleToggleEnabled(selectedAgentData.id, enabled)}
                                        />
                                        <button
                                            onClick={() => setEditingAgent(selectedAgentData)}
                                            className="p-2 hover:bg-background/30 rounded-lg transition-colors"
                                        >
                                            <Settings2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(selectedAgentData.id)}
                                            className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="p-4 bg-background/30 rounded-xl border border-border/30">
                                        <div className="text-2xl font-bold">{selectedAgentData.usageCount}</div>
                                        <div className="text-xs text-muted-foreground">Total Uses</div>
                                    </div>
                                    <div className="p-4 bg-background/30 rounded-xl border border-border/30">
                                        <div className="text-2xl font-bold">
                                            {selectedAgentData.successRate ? `${(selectedAgentData.successRate * 100).toFixed(0)}%` : 'N/A'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Success Rate</div>
                                    </div>
                                    <div className="p-4 bg-background/30 rounded-xl border border-border/30">
                                        <div className="text-2xl font-bold">{selectedAgentData.priority}</div>
                                        <div className="text-xs text-muted-foreground">Priority</div>
                                    </div>
                                    <div className="p-4 bg-background/30 rounded-xl border border-border/30">
                                        <div className="text-2xl font-bold">{selectedAgentData.temperature}</div>
                                        <div className="text-xs text-muted-foreground">Temperature</div>
                                    </div>
                                </div>

                                {/* Configuration */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">Configuration</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-background/30 rounded-xl border border-border/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Zap className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-medium">Model</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">{selectedAgentData.model}</div>
                                        </div>
                                        <div className="p-4 bg-background/30 rounded-xl border border-border/30">
                                            <div className="text-sm font-medium mb-2">Tools</div>
                                            <div className="text-sm text-muted-foreground">
                                                {selectedAgentData.tools === 'all'
                                                    ? 'All tools granted'
                                                    : `${(selectedAgentData.tools as string[]).length} tools selected`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Keywords */}
                                    {selectedAgentData.keywords.length > 0 && (
                                        <div className="p-4 bg-background/30 rounded-xl border border-border/30">
                                            <div className="text-sm font-medium mb-2">Routing Keywords</div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedAgentData.keywords.map(kw => (
                                                    <span key={kw} className="px-2 py-1 text-xs bg-background/50 rounded-md border border-border/30">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* System Prompt Preview */}
                                    {selectedAgentData.systemPrompt && (
                                        <div className="p-4 bg-background/30 rounded-xl border border-border/30">
                                            <div className="text-sm font-medium mb-2">System Prompt</div>
                                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                                                {selectedAgentData.systemPrompt.substring(0, 500)}
                                                {selectedAgentData.systemPrompt.length > 500 && '...'}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                                <p>Select an agent to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create/Edit Dialog */}
            <SubagentFormDialog
                open={showCreateDialog || editingAgent !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateDialog(false);
                        setEditingAgent(null);
                    }
                }}
                agent={editingAgent || undefined}
                onSuccess={() => {
                    setShowCreateDialog(false);
                    setEditingAgent(null);
                    loadAgents();
                }}
                workspace={workspacePath}
            />
        </div>
    );
};

export default SubagentManager;
