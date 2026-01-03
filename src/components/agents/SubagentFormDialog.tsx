/**
 * Subagent Form Dialog
 * 
 * Modal dialog for creating and editing custom subagents.
 * Includes form validation, tool selection, and AI-powered suggestions.
 */

import { useState, useEffect } from "react";
import { Plus, X, Wand2, Loader2 } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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

const AVAILABLE_MODELS = [
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google' },
    { id: 'gemini-3 -pro', name: 'Gemini 3 Pro', provider: 'Google' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'grok-beta', name: 'Grok Beta', provider: 'xAI' },
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

// ===========================
// API Functions
// ===========================

async function createSubagent(config: Partial<SubagentConfig>): Promise<SubagentConfig> {
    const response = await fetch('http://localhost:3001/api/agentkit/subagents', {
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
    const response = await fetch(`http://localhost:3001/api/agentkit/subagents/${id}`, {
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
    const response = await fetch('http://localhost:3001/api/agentkit/subagents/suggest-tools', {
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

    // Form state
    const [formData, setFormData] = useState<Partial<SubagentConfig>>({
        name: agent?.name || '',
        description: agent?.description || '',
        enabled: agent?.enabled ?? true,
        scope: agent?.scope || 'user',
        model: agent?.model || 'gemini-3-flash',
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
    const [selectedTools, setSelectedTools] = useState<Set<string>>(
        new Set(Array.isArray(agent?.tools) ? agent.tools : [])
    );
    const [useAllTools, setUseAllTools] = useState(agent?.tools === 'all');

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
            setSelectedTools(new Set(Array.isArray(agent.tools) ? agent.tools : []));
            setUseAllTools(agent.tools === 'all');
        } else {
            // Reset to defaults
            setFormData({
                name: '',
                description: '',
                enabled: true,
                scope: 'user',
                model: 'gemini-3-flash',
                tools: [],
                systemPrompt: '',
                keywords: [],
                patterns: [],
                tags: [],
                priority: 50,
                temperature: 0.7,
                maxIterations: 10,
            });
            setSelectedTools(new Set());
            setUseAllTools(false);
        }
    }, [agent, open]);

    const handleSuggestTools = async () => {
        if (!formData.description) {
            alert('Please enter a description first');
            return;
        }

        setIsSuggesting(true);
        try {
            const result = await suggestTools(formData.description);
            const newTools = new Set([...selectedTools, ...result.suggested]);
            setSelectedTools(newTools);
            alert(`Added ${result.suggested.length} suggested tools!\n\n${result.reasoning.join('\n')}`);
        } catch (error) {
            console.error('Failed to suggest tools:', error);
            alert('Failed to get tool suggestions');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Generate ID if creating new
            const id = isEdit ? agent!.id : formData.name!.toLowerCase().replace(/\s+/g, '-');

            const config: Partial<SubagentConfig> = {
                ...formData,
                id,
                tools: useAllTools ? 'all' : Array.from(selectedTools),
            };

            if (isEdit) {
                await updateSubagent(agent!.id, config);
            } else {
                await createSubagent(config);
            }

            onSuccess();
        } catch (error) {
            console.error('Failed to save subagent:', error);
            alert(error instanceof Error ? error.message : 'Failed to save subagent');
        } finally {
            setIsLoading(false);
        }
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !formData.keywords?.includes(keywordInput.trim())) {
            setFormData({
                ...formData,
                keywords: [...(formData.keywords || []), keywordInput.trim()],
            });
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setFormData({
            ...formData,
            keywords: formData.keywords?.filter(k => k !== keyword) || [],
        });
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
            setFormData({
                ...formData,
                tags: [...(formData.tags || []), tagInput.trim()],
            });
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags?.filter(t => t !== tag) || [],
        });
    };

    const toggleTool = (tool: string) => {
        const newTools = new Set(selectedTools);
        if (newTools.has(tool)) {
            newTools.delete(tool);
        } else {
            newTools.add(tool);
        }
        setSelectedTools(newTools);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] p-0">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <DialogHeader className="px-6 pt-6 pb-4">
                        <DialogTitle>{isEdit ? 'Edit' : 'Create'} Custom Subagent</DialogTitle>
                        <DialogDescription>
                            {isEdit ? 'Update your custom subagent configuration' : 'Create a new specialized AI agent for specific tasks'}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1 px-6">
                        <div className="space-y-6 pb-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Basic Information</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Code Reviewer"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="scope">Scope</Label>
                                        <Select
                                            value={formData.scope}
                                            onValueChange={(value) => setFormData({ ...formData, scope: value as any })}
                                        >
                                            <SelectTrigger id="scope">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">User (Personal)</SelectItem>
                                                <SelectItem value="project">Project (Local)</SelectItem>
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
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="enabled" className="cursor-pointer">Enable Agent</Label>
                                        <p className="text-xs text-muted-foreground">Make this agent available for use</p>
                                    </div>
                                    <Switch
                                        id="enabled"
                                        checked={formData.enabled}
                                        onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Model & Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Model & Configuration</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="model">AI Model</Label>
                                    <Select
                                        value={formData.model}
                                        onValueChange={(value) => setFormData({ ...formData, model: value })}
                                    >
                                        <SelectTrigger id="model">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AVAILABLE_MODELS.map(model => (
                                                <SelectItem key={model.id} value={model.id}>
                                                    {model.name} ({model.provider})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="temperature">Temperature: {formData.temperature}</Label>
                                        <input
                                            id="temperature"
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="0.1"
                                            value={formData.temperature}
                                            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground">Lower = focused, Higher = creative</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="priority">Priority: {formData.priority}</Label>
                                        <input
                                            id="priority"
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground">Higher priority routes tasks first</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Tools */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium">Tools & Permissions</h3>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleSuggestTools}
                                        disabled={isSuggesting || !formData.description}
                                    >
                                        {isSuggesting ? (
                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                        ) : (
                                            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                                        )}
                                        AI Suggest
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="all-tools" className="cursor-pointer">Grant All Tools</Label>
                                        <p className="text-xs text-muted-foreground">Allow access to all available tools</p>
                                    </div>
                                    <Switch
                                        id="all-tools"
                                        checked={useAllTools}
                                        onCheckedChange={setUseAllTools}
                                    />
                                </div>

                                {!useAllTools && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {COMMON_TOOLS.map(tool => (
                                            <div
                                                key={tool.name}
                                                onClick={() => toggleTool(tool.name)}
                                                className={cn(
                                                    "flex items-start gap-2 p-2.5 rounded-md border cursor-pointer transition-colors",
                                                    selectedTools.has(tool.name)
                                                        ? "bg-primary/10 border-primary/50"
                                                        : "hover:bg-muted"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
                                                    selectedTools.has(tool.name) ? "bg-primary border-primary" : "border-border"
                                                )}>
                                                    {selectedTools.has(tool.name) && (
                                                        <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{tool.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{tool.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!useAllTools && selectedTools.size > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {selectedTools.size} tool{selectedTools.size !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>

                            <Separator />

                            {/* System Prompt */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">System Prompt *</h3>
                                <Textarea
                                    value={formData.systemPrompt}
                                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                                    placeholder="You are a specialized code reviewer focused on security and best practices. You analyze code for potential vulnerabilities..."
                                    rows={6}
                                    required
                                    className="font-mono text-xs"
                                />
                            </div>

                            <Separator />

                            {/* Keywords */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Keywords for Routing</h3>
                                <div className="flex gap-2">
                                    <Input
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                        placeholder="review, security, audit"
                                    />
                                    <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {formData.keywords && formData.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {formData.keywords.map(keyword => (
                                            <Badge key={keyword} variant="secondary" className="gap-1">
                                                {keyword}
                                                <X
                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                    onClick={() => removeKeyword(keyword)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Tags */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Tags (Optional)</h3>
                                <div className="flex gap-2">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="security, code-quality"
                                    />
                                    <Button type="button" variant="outline" size="icon" onClick={addTag}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {formData.tags && formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {formData.tags.map(tag => (
                                            <Badge key={tag} variant="outline" className="gap-1">
                                                #{tag}
                                                <X
                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                    onClick={() => removeTag(tag)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-6 py-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.name || !formData.description || !formData.systemPrompt}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {isEdit ? 'Update' : 'Create'} Subagent
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
