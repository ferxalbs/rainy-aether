/**
 * Subagent Form Dialog
 * 
 * Modal dialog for creating and editing custom subagents.
 * Includes form validation, tool selection, and AI-powered suggestions.
 */

import { useState, useEffect } from "react";
import { Plus, X, Wand2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

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
}

interface SubagentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agent?: SubagentConfig;
    onSuccess: () => void;
}

/**
 * Models from src/services/agent/providers/index.ts
 * IDs must match exactly for backend validation
 */
const AVAILABLE_MODELS = [
    // Gemini Standard Models
    { id: 'gemini-flash-lite-latest', name: 'Gemini 2.5 Flash Lite', provider: 'Google', description: 'Fast and efficient' },
    { id: 'gemini-flash-latest', name: 'Gemini 3 Flash', provider: 'Google', description: 'Latest with 1M context' },
    // Gemini Thinking Models
    { id: 'gemini-flash-thinking-auto', name: 'Gemini 3 Flash (Thinking)', provider: 'Google', description: 'Dynamic thinking budget' },
    { id: 'gemini-3-pro-thinking-low', name: 'Gemini 3 Pro (Low)', provider: 'Google', description: 'Pro with low reasoning' },
    { id: 'gemini-3-pro-thinking-high', name: 'Gemini 3 Pro (High)', provider: 'Google', description: 'Pro with high reasoning' },
    // Groq Models
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Groq', description: 'Meta Llama on Groq' },
    { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct', provider: 'Groq', description: 'Kimi K2 on Groq' },
    // Cerebras Models
    { id: 'zai-glm-4.6', name: 'Zai GLM 4.6', provider: 'Cerebras', description: 'Cerebras Zai model' },
];

const COMMON_TOOLS = [
    { name: 'read_file', category: 'read', description: 'Read file contents' },
    { name: 'write_file', category: 'write', description: 'Write to files' },
    { name: 'edit_file', category: 'write', description: 'Edit existing files' },
    { name: 'search_code', category: 'read', description: 'Search in codebase' },
    { name: 'list_dir', category: 'read', description: 'List directory' },
    { name: 'run_command', category: 'execute', description: 'Execute commands' },
    { name: 'git_status', category: 'git', description: 'Git status' },
    { name: 'git_diff', category: 'git', description: 'Git diff' },
];

const API_BASE = 'http://localhost:3847/api/agentkit/subagents';

// ===========================
// API Functions
// ===========================

async function createSubagent(config: Partial<SubagentConfig>): Promise<SubagentConfig> {
    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors?.join(', ') || 'Failed to create subagent');
    }
    const data = await response.json();
    return data.agent;
}

async function updateSubagent(id: string, config: Partial<SubagentConfig>): Promise<SubagentConfig> {
    const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors?.join(', ') || 'Failed to update subagent');
    }
    const data = await response.json();
    return data.agent;
}

async function suggestTools(description: string): Promise<{ suggested: string[]; reasoning: string[] }> {
    const response = await fetch(`${API_BASE}/suggest-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
    });
    if (!response.ok) throw new Error('Failed to get suggestions');
    const data = await response.json();
    return { suggested: data.suggested || [], reasoning: data.reasoning || [] };
}

// ===========================
// Component
// ===========================

export function SubagentFormDialog({ open, onOpenChange, agent, onSuccess }: SubagentFormDialogProps) {
    const isEdit = !!agent;
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<SubagentConfig>>({
        name: agent?.name || '',
        description: agent?.description || '',
        enabled: agent?.enabled ?? true,
        scope: agent?.scope || 'user',
        model: agent?.model || 'gemini-flash-latest',
        tools: agent?.tools || [],
        systemPrompt: agent?.systemPrompt || '',
        keywords: agent?.keywords || [],
        patterns: agent?.patterns || [],
        tags: agent?.tags || [],
        priority: agent?.priority ?? 50,
        temperature: agent?.temperature ?? 0.7,
        maxIterations: agent?.maxIterations ?? 10,
    });

    const [keywordInput, setKeywordInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [grantAllTools, setGrantAllTools] = useState(formData.tools === 'all');

    // Reset form when agent changes
    useEffect(() => {
        if (agent) {
            setFormData({
                name: agent.name,
                description: agent.description,
                enabled: agent.enabled,
                scope: agent.scope,
                model: agent.model,
                tools: agent.tools,
                systemPrompt: agent.systemPrompt,
                keywords: agent.keywords,
                patterns: agent.patterns,
                tags: agent.tags,
                priority: agent.priority,
                temperature: agent.temperature,
                maxIterations: agent.maxIterations,
            });
            setGrantAllTools(agent.tools === 'all');
        } else {
            setFormData({
                name: '',
                description: '',
                enabled: true,
                scope: 'user',
                model: 'gemini-flash-latest',
                tools: [],
                systemPrompt: '',
                keywords: [],
                patterns: [],
                tags: [],
                priority: 50,
                temperature: 0.7,
                maxIterations: 10,
            });
            setGrantAllTools(false);
        }
        setError(null);
    }, [agent, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const id = formData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'custom-agent';

            const config = {
                ...formData,
                id: agent?.id || id,
                tools: grantAllTools ? 'all' : formData.tools,
            };

            if (isEdit && agent) {
                await updateSubagent(agent.id, config);
            } else {
                await createSubagent(config);
            }

            onSuccess();
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save subagent');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestTools = async () => {
        if (!formData.description) return;

        setIsSuggesting(true);
        try {
            const { suggested } = await suggestTools(formData.description);
            if (suggested.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    tools: [...new Set([...(Array.isArray(prev.tools) ? prev.tools : []), ...suggested])],
                }));
            }
        } catch (err) {
            console.error('Failed to suggest tools:', err);
        } finally {
            setIsSuggesting(false);
        }
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !formData.keywords?.includes(keywordInput.trim())) {
            setFormData(prev => ({
                ...prev,
                keywords: [...(prev.keywords || []), keywordInput.trim()],
            }));
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setFormData(prev => ({
            ...prev,
            keywords: prev.keywords?.filter(k => k !== keyword) || [],
        }));
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...(prev.tags || []), tagInput.trim()],
            }));
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags?.filter(t => t !== tag) || [],
        }));
    };

    const toggleTool = (toolName: string) => {
        if (grantAllTools) return;
        setFormData(prev => {
            const tools = Array.isArray(prev.tools) ? prev.tools : [];
            if (tools.includes(toolName)) {
                return { ...prev, tools: tools.filter(t => t !== toolName) };
            }
            return { ...prev, tools: [...tools, toolName] };
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
            <div className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl w-[90%] h-[88%] max-w-6xl flex flex-col overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-border dark:border-border/30">
                        <div>
                            <h2 className="text-xl font-semibold">{isEdit ? 'Edit' : 'Create'} Custom Subagent</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {isEdit ? 'Update your custom subagent configuration' : 'Create a new specialized AI agent for specific tasks'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="p-2 hover:bg-background/20 hover:backdrop-blur-lg rounded-lg transition-all duration-200 hover:scale-105"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Scrollable Content */}
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Code Reviewer"
                                            required
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="scope">Scope</Label>
                                        <Select
                                            value={formData.scope}
                                            onValueChange={(value: 'user' | 'project' | 'plugin') => setFormData({ ...formData, scope: value })}
                                        >
                                            <SelectTrigger id="scope" className="bg-background/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">User (Personal)</SelectItem>
                                                <SelectItem value="project">Project (Team)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description *</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Reviews code for security vulnerabilities and best practices"
                                        rows={2}
                                        required
                                        className="bg-background/50"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border/30">
                                    <div>
                                        <Label htmlFor="enabled">Enable Agent</Label>
                                        <p className="text-xs text-muted-foreground">Make this agent available for use</p>
                                    </div>
                                    <Switch
                                        id="enabled"
                                        checked={formData.enabled}
                                        onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                    />
                                </div>
                            </div>

                            <Separator className="bg-border/30" />

                            {/* Model & Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground">Model & Configuration</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="model">AI Model</Label>
                                    <Select
                                        value={formData.model}
                                        onValueChange={(value) => setFormData({ ...formData, model: value })}
                                    >
                                        <SelectTrigger id="model" className="bg-background/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AVAILABLE_MODELS.map(model => (
                                                <SelectItem key={model.id} value={model.id}>
                                                    <div className="flex flex-col">
                                                        <span>{model.name}</span>
                                                        <span className="text-xs text-muted-foreground">{model.description}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Models from your configured providers</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Temperature: {formData.temperature?.toFixed(1)}</Label>
                                        <Slider
                                            value={[formData.temperature ?? 0.7]}
                                            onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground">Lower = focused, Higher = creative</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Priority: {formData.priority}</Label>
                                        <Slider
                                            value={[formData.priority ?? 50]}
                                            onValueChange={([value]) => setFormData({ ...formData, priority: value })}
                                            min={0}
                                            max={100}
                                            step={1}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground">Higher priority routes tasks first</p>
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-border/30" />

                            {/* Tools & Permissions */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground">Tools & Permissions</h3>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSuggestTools}
                                        disabled={isSuggesting || !formData.description}
                                        className="text-xs"
                                    >
                                        {isSuggesting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                                        AI Suggest
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border/30">
                                    <div>
                                        <Label htmlFor="allTools">Grant All Tools</Label>
                                        <p className="text-xs text-muted-foreground">Allow access to all available tools</p>
                                    </div>
                                    <Switch
                                        id="allTools"
                                        checked={grantAllTools}
                                        onCheckedChange={setGrantAllTools}
                                    />
                                </div>

                                {!grantAllTools && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {COMMON_TOOLS.map(tool => {
                                            const isSelected = Array.isArray(formData.tools) && formData.tools.includes(tool.name);
                                            return (
                                                <button
                                                    key={tool.name}
                                                    type="button"
                                                    onClick={() => toggleTool(tool.name)}
                                                    className={cn(
                                                        "p-2 text-left rounded-lg border transition-all text-sm",
                                                        isSelected
                                                            ? "bg-primary/20 border-primary/40 text-primary"
                                                            : "bg-background/30 border-border/30 hover:border-border/50"
                                                    )}
                                                >
                                                    <div className="font-medium">{tool.name}</div>
                                                    <div className="text-xs text-muted-foreground">{tool.description}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <Separator className="bg-border/30" />

                            {/* System Prompt */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground">System Prompt</h3>
                                <Textarea
                                    value={formData.systemPrompt}
                                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                                    placeholder="You are a specialized AI agent that..."
                                    rows={4}
                                    className="bg-background/50 font-mono text-sm"
                                />
                            </div>

                            <Separator className="bg-border/30" />

                            {/* Keywords & Tags */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground">Routing Keywords</h3>
                                <div className="flex gap-2">
                                    <Input
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                        placeholder="Add keyword..."
                                        className="flex-1 bg-background/50"
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                {formData.keywords && formData.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.keywords.map(keyword => (
                                            <Badge
                                                key={keyword}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-destructive/20"
                                                onClick={() => removeKeyword(keyword)}
                                            >
                                                {keyword}
                                                <X className="w-3 h-3 ml-1" />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                                <div className="flex gap-2">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="Add tag..."
                                        className="flex-1 bg-background/50"
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addTag}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                {formData.tags && formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.tags.map(tag => (
                                            <Badge
                                                key={tag}
                                                variant="outline"
                                                className="cursor-pointer hover:bg-destructive/20"
                                                onClick={() => removeTag(tag)}
                                            >
                                                {tag}
                                                <X className="w-3 h-3 ml-1" />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 p-5 border-t border-border dark:border-border/30">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.name || !formData.description}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEdit ? 'Save Changes' : 'Create Subagent'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
