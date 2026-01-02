/**
 * MCP Manager Component
 * 
 * Manages MCP servers and displays their tools.
 * Similar design pattern to ExtensionMarketplace.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Power, PowerOff,
    Wrench, AlertCircle, Loader2, FileJson, FolderOpen
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Switch } from '../ui/switch';

// ===========================
// Types
// ===========================

interface MCPServer {
    name: string;
    enabled: boolean;
    transport: string;
    description: string;
    category: string;
    priority: string;
    status?: 'connected' | 'disconnected' | 'connecting' | 'error';
    tools?: MCPTool[];
    toolCount?: number;
}

interface MCPTool {
    name: string;
    description: string;
    inputSchema?: {
        type: string;
        properties?: Record<string, unknown>;
        required?: string[];
    };
}

interface MCPManagerProps {
    isOpen: boolean;
    onClose: () => void;
    workspace?: string;
    onOpenFile?: (path: string) => void;
}

// Built-in MCP tools (these are always available via the IDE)
const BUILTIN_TOOLS: Record<string, MCPTool[]> = {
    'workspace': [
        { name: 'read_file', description: 'Read the contents of a file from the workspace' },
        { name: 'write_file', description: 'Write content to a file in the workspace' },
        { name: 'create_file', description: 'Create a new file with content' },
        { name: 'delete_file', description: 'Delete a file from the workspace' },
        { name: 'list_dir', description: 'List contents of a directory' },
        { name: 'read_directory_tree', description: 'Get the full directory tree structure' },
        { name: 'search_code', description: 'Search for code patterns across the workspace' },
        { name: 'run_command', description: 'Execute a shell command in the workspace' },
        { name: 'get_project_context', description: 'Get comprehensive project information' },
        { name: 'fs_batch_read', description: 'Read multiple files in a single operation' },
        { name: 'edit_file_lines', description: 'Edit specific lines in a file' },
        { name: 'multi_edit', description: 'Apply multiple edits atomically' },
        { name: 'analyze_file', description: 'Analyze a file for structure and content' },
        { name: 'git_status', description: 'Get git repository status' },
        { name: 'git_diff', description: 'Get git diff for changes' },
        { name: 'git_commit', description: 'Commit changes to git' },
    ],
    'context7': [
        {
            name: 'resolve-library-id',
            description: 'Resolves a package/product name to a Context7-compatible library ID. You MUST call this before query-docs.'
        },
        {
            name: 'query-docs',
            description: 'Retrieves up-to-date documentation and code examples from Context7 for any programming library.'
        },
    ],
    'dart-mcp-server': [
        { name: 'analyze_files', description: 'Analyze Dart/Flutter files for errors' },
        { name: 'create_project', description: 'Create a new Dart or Flutter project' },
        { name: 'dart_fix', description: 'Run dart fix --apply' },
        { name: 'dart_format', description: 'Format Dart code' },
        { name: 'flutter_driver', description: 'Run Flutter driver commands' },
        { name: 'get_widget_tree', description: 'Get Flutter widget tree' },
        { name: 'hot_reload', description: 'Hot reload Flutter app' },
        { name: 'hot_restart', description: 'Hot restart Flutter app' },
        { name: 'launch_app', description: 'Launch Flutter application' },
        { name: 'list_devices', description: 'List available Flutter devices' },
        { name: 'pub', description: 'Run pub commands (get, add, upgrade)' },
        { name: 'pub_dev_search', description: 'Search pub.dev for packages' },
        { name: 'run_tests', description: 'Run Dart/Flutter tests' },
    ],
    'firebase-mcp-server': [
        { name: 'firebase_get_environment', description: 'Get Firebase environment configuration' },
        { name: 'firebase_get_project', description: 'Get active Firebase project info' },
        { name: 'firebase_list_projects', description: 'List Firebase projects' },
        { name: 'firebase_create_project', description: 'Create new Firebase project' },
        { name: 'firebase_list_apps', description: 'List Firebase apps' },
        { name: 'firebase_create_app', description: 'Create new Firebase app' },
        { name: 'firebase_get_sdk_config', description: 'Get Firebase SDK configuration' },
        { name: 'firebase_init', description: 'Initialize Firebase services' },
        { name: 'firebase_get_security_rules', description: 'Get security rules' },
        { name: 'firebase_login', description: 'Sign into Firebase' },
        { name: 'firebase_logout', description: 'Sign out of Firebase' },
    ],
};

// ===========================
// Component
// ===========================

const MCPManager: React.FC<MCPManagerProps> = ({ isOpen, onClose, workspace, onOpenFile }) => {
    const [servers, setServers] = useState<MCPServer[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [configExists, setConfigExists] = useState(false);

    const serverUrl = 'http://localhost:3847';

    // Load servers with built-in tool counts
    const loadServers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = workspace ? `?workspace=${encodeURIComponent(workspace)}` : '';
            const res = await fetch(`${serverUrl}/api/agentkit/mcp/servers${params}`);

            if (!res.ok) {
                throw new Error('Agent server not running. Start with: pnpm agent:dev');
            }

            const data = await res.json();
            setConfigExists(data.hasProjectConfig || false);

            // Format servers with tool counts from built-in definitions
            const formattedServers: MCPServer[] = (data.servers || []).map((s: MCPServer) => {
                const builtinTools = BUILTIN_TOOLS[s.name] || [];
                return {
                    ...s,
                    status: s.enabled ? 'connected' : 'disconnected',
                    tools: builtinTools,
                    toolCount: builtinTools.length,
                };
            });

            // If no servers from API, show built-in ones
            if (formattedServers.length === 0) {
                const defaultServers: MCPServer[] = [
                    {
                        name: 'workspace',
                        enabled: true,
                        transport: 'internal',
                        description: 'Built-in workspace tools',
                        category: 'workspace',
                        priority: 'local',
                        status: 'connected',
                        tools: BUILTIN_TOOLS['workspace'],
                        toolCount: BUILTIN_TOOLS['workspace'].length,
                    },
                ];
                setServers(defaultServers);
                setSelectedServer('workspace');
            } else {
                setServers(formattedServers);
                if (formattedServers.length > 0 && !selectedServer) {
                    setSelectedServer(formattedServers[0].name);
                }
            }
        } catch (err) {
            // Fallback to showing built-in workspace tools
            const defaultServers: MCPServer[] = [
                {
                    name: 'workspace',
                    enabled: true,
                    transport: 'internal',
                    description: 'Built-in workspace tools (agent server offline)',
                    category: 'workspace',
                    priority: 'local',
                    status: 'connected',
                    tools: BUILTIN_TOOLS['workspace'],
                    toolCount: BUILTIN_TOOLS['workspace'].length,
                },
            ];
            setServers(defaultServers);
            setSelectedServer('workspace');
            setError(err instanceof Error ? err.message : 'Failed to load servers');
        } finally {
            setLoading(false);
        }
    }, [workspace, selectedServer]);

    useEffect(() => {
        if (isOpen) {
            loadServers();
        }
    }, [isOpen, loadServers]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadServers();
        setRefreshing(false);
    };

    const handleToggleServer = async (serverName: string, enabled: boolean) => {
        // Update local state immediately for responsiveness
        setServers(prev => prev.map(s =>
            s.name === serverName ? { ...s, enabled, status: enabled ? 'connected' : 'disconnected' } : s
        ));

        try {
            await fetch(`${serverUrl}/api/agentkit/mcp/servers/${serverName}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled, workspace }),
            });
        } catch (err) {
            console.error('Failed to toggle server:', err);
        }
    };

    const openRawConfig = async () => {
        if (!workspace) return;

        const configPath = `${workspace}/.rainy/mcp.json`;

        // Use callback to open file in IDE editor
        if (onOpenFile) {
            onOpenFile(configPath);
            onClose(); // Close modal after opening file
            return;
        }

        // Fallback: try Tauri opener plugin
        try {
            const { openPath } = await import('@tauri-apps/plugin-opener');
            await openPath(configPath);
        } catch {
            // Last fallback: show the path
            alert(`Config file: ${configPath}`);
        }
    };

    const createConfig = async () => {
        if (!workspace) return;

        try {
            const res = await fetch(`${serverUrl}/api/agentkit/mcp/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace }),
            });

            if (res.ok) {
                setConfigExists(true);
                await loadServers();
            }
        } catch (err) {
            console.error('Failed to create config:', err);
        }
    };

    const openConfigFolder = async () => {
        if (!workspace) return;

        try {
            const { openPath } = await import('@tauri-apps/plugin-opener');
            await openPath(`${workspace}/.rainy`);
        } catch {
            // Fallback
        }
    };

    const selectedServerData = servers.find(s => s.name === selectedServer);
    const totalTools = servers.reduce((sum, s) => sum + (s.toolCount || s.tools?.length || 0), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl w-[90%] h-[88%] max-w-6xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border dark:border-border/30">
                    <h2 className="text-xl font-semibold">Manage MCP servers</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {totalTools} tools
                        </span>
                        {configExists ? (
                            <button
                                onClick={openRawConfig}
                                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                            >
                                <FileJson className="w-3.5 h-3.5" />
                                Edit config
                            </button>
                        ) : (
                            <button
                                onClick={createConfig}
                                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors"
                            >
                                <FileJson className="w-3.5 h-3.5" />
                                Create config
                            </button>
                        )}
                        <button
                            onClick={openConfigFolder}
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                            title="Open .rainy folder"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
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
                    {/* Server Sidebar */}
                    <div className="w-64 border-r border-border dark:border-border/30 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="py-2">
                                {servers.map(server => (
                                    <button
                                        key={server.name}
                                        onClick={() => setSelectedServer(server.name)}
                                        className={cn(
                                            "w-full px-4 py-3 flex items-center justify-between text-left transition-all",
                                            "hover:bg-background/20 hover:backdrop-blur-lg",
                                            selectedServer === server.name && "bg-background/30 border-l-2 border-primary"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {server.status === 'connected' ? (
                                                <Power className="w-3.5 h-3.5 text-green-500" />
                                            ) : server.status === 'connecting' ? (
                                                <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
                                            ) : server.status === 'error' ? (
                                                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                                            ) : (
                                                <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                            <span className="text-sm font-medium truncate">{server.name}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {server.toolCount || server.tools?.length || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Server Details */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedServerData ? (
                            <div>
                                {/* Server Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold">{selectedServerData.name}</h3>
                                        <span className="px-2 py-0.5 text-xs bg-muted/50 rounded-md text-muted-foreground">
                                            {selectedServerData.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">Enabled</span>
                                        <Switch
                                            checked={selectedServerData.enabled}
                                            onCheckedChange={(checked) => handleToggleServer(selectedServerData.name, checked)}
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                {selectedServerData.description && (
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {selectedServerData.description}
                                    </p>
                                )}

                                {/* Tools List */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Available Tools ({selectedServerData.tools?.length || 0})
                                    </h4>
                                    {selectedServerData.tools?.map((tool, index) => (
                                        <div
                                            key={tool.name}
                                            className="p-4 bg-background/5 backdrop-blur-xl border border-border/30 rounded-xl"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                        {index + 1}.
                                                    </span>
                                                    <h4 className="font-medium font-mono text-sm">{tool.name}</h4>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                                                {tool.description}
                                            </p>
                                        </div>
                                    ))}

                                    {(!selectedServerData.tools || selectedServerData.tools.length === 0) && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>No tools available</p>
                                            <p className="text-xs mt-1">This server doesn't expose any tools</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Select a server to view its tools
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MCPManager;
