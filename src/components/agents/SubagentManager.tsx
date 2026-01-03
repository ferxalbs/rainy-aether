/**
 * Subagent Manager Component
 * 
 * Professional interface for managing custom AI subagents.
 * Matches the MCP Manager design pattern.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, AlertCircle, Loader2, Plus,
    Trash2, CheckCircle2, Circle, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Switch } from '../ui/switch';
import { SubagentFormDialog } from './SubagentFormDialog';

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

const SubagentManager: React.FC<SubagentManagerProps> = ({ isOpen, onClose }) => {
    const [agents, setAgents] = useState<SubagentConfig[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingAgent, setEditingAgent] = useState<SubagentConfig | null>(null);

    const serverUrl = 'http://localhost:3847';

    // Load agents from API
    const loadAgents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${serverUrl}/api/agentkit/subagents`);

            if (!res.ok) {
                throw new Error('Agent server not running. Start with: pnpm tauri dev');
            }

            const data = await res.json();
            const formattedAgents: SubagentConfig[] = data.agents || [];

            if (formattedAgents.length === 0) {
                setError('No custom subagents configured. Create one to get started.');
            }

            setAgents(formattedAgents);

            if (formattedAgents.length > 0 && !selectedAgent) {
                setSelectedAgent(formattedAgents[0].id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load agents');
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
            await fetch(`${serverUrl}/api/agentkit/subagents/${agentId}`, {
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
            await fetch(`${serverUrl}/api/agentkit/subagents/${agentId}`, {
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

                {/* Error banner */}
                {error && (
                    <div className="px-5 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Agent Sidebar */}
                    <div className="w-64 border-r border-border dark:border-border/30 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : agents.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                                No agents configured
                            </div>
                        ) : (
                            <div className="py-2">
                                {agents.map(agent => (
                                    <button
                                        key={agent.id}
                                        onClick={() => setSelectedAgent(agent.id)}
                                        className={cn(
                                            "w-full px-4 py-3 flex items-center justify-between text-left transition-all",
                                            "hover:bg-background/20 hover:backdrop-blur-lg",
                                            selectedAgent === agent.id && "bg-background/30 border-l-2 border-primary"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {agent.enabled ? (
                                                <Circle className="w-3 h-3 text-green-500 fill-green-500 shrink-0" />
                                            ) : (
                                                <Circle className="w-3 h-3 text-muted-foreground shrink-0" />
                                            )}
                                            <span className="text-sm font-medium truncate">{agent.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {agent.usageCount > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {agent.usageCount}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Agent Details */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedAgentData ? (
                            <div>
                                {/* Agent Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold">{selectedAgentData.name}</h3>
                                        <span className="px-2 py-0.5 text-xs bg-muted/50 rounded-md text-muted-foreground">
                                            {selectedAgentData.scope}
                                        </span>
                                        {selectedAgentData.priority > 70 && (
                                            <span className="px-2 py-0.5 text-xs bg-orange-500/10 text-orange-500 rounded-md">
                                                High Priority
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">Enabled</span>
                                            <Switch
                                                checked={selectedAgentData.enabled}
                                                onCheckedChange={(checked) => handleToggleEnabled(selectedAgentData.id, checked)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setEditingAgent(selectedAgentData)}
                                            className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all mr-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(selectedAgentData.id)}
                                            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                {selectedAgentData.description && (
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {selectedAgentData.description}
                                    </p>
                                )}

                                {/* Stats */}
                                {(selectedAgentData.usageCount > 0 || selectedAgentData.successRate !== undefined) && (
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        {selectedAgentData.usageCount > 0 && (
                                            <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                                <div className="text-2xl font-bold">{selectedAgentData.usageCount}</div>
                                                <div className="text-xs text-muted-foreground">Total Uses</div>
                                            </div>
                                        )}
                                        {selectedAgentData.successRate !== undefined && (
                                            <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                                <div className="text-2xl font-bold text-green-500">
                                                    {Math.round(selectedAgentData.successRate * 100)}%
                                                </div>
                                                <div className="text-xs text-muted-foreground">Success Rate</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Configuration */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Configuration
                                    </h4>

                                    {/* Model */}
                                    <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                        <div className="text-xs text-muted-foreground mb-1">AI Model</div>
                                        <div className="font-medium text-sm">{selectedAgentData.model}</div>
                                    </div>

                                    {/* Temperature & Priority */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-1">Temperature</div>
                                            <div className="font-medium text-sm">{selectedAgentData.temperature}</div>
                                        </div>
                                        <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-1">Priority</div>
                                            <div className="font-medium text-sm">{selectedAgentData.priority}</div>
                                        </div>
                                    </div>

                                    {/* Keywords */}
                                    {selectedAgentData.keywords.length > 0 && (
                                        <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-2">Routing Keywords</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedAgentData.keywords.map(keyword => (
                                                    <span
                                                        key={keyword}
                                                        className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
                                                    >
                                                        {keyword}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tools */}
                                    <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                        <div className="text-xs text-muted-foreground mb-2">
                                            Tools ({selectedAgentData.tools === 'all' ? 'All' : selectedAgentData.tools.length})
                                        </div>
                                        {selectedAgentData.tools === 'all' ? (
                                            <div className="text-sm text-green-500 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Access to all available tools
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedAgentData.tools.map(tool => (
                                                    <span
                                                        key={tool}
                                                        className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground rounded font-mono"
                                                    >
                                                        {tool}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* System Prompt */}
                                    <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                        <div className="text-xs text-muted-foreground mb-2">System Prompt</div>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs">
                                            {selectedAgentData.systemPrompt}
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {selectedAgentData.tags.length > 0 && (
                                        <div className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-2">Tags</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedAgentData.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground rounded"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
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

            {/* SubagentFormDialog for Create/Edit */}
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
                    loadAgents(); // Reload agents after successful create/edit
                }}
            />
        </div>
    );
};

export default SubagentManager;
