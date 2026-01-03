/**
 * MCP Manager Component
 * 
 * Manages MCP servers and displays their tools.
 * Connects to real MCP servers via the agent server API.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Power, PowerOff,
    Wrench, AlertCircle, Loader2, FileJson, FolderOpen, Plug, PlugZap
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
    autoApprove?: boolean;
    trustLevel?: 'trusted' | 'untrusted' | 'system';
    status?: 'connected' | 'disconnected' | 'connecting' | 'error';
    tools?: MCPTool[];
    toolCount?: number;
}

interface MCPTool {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
}

interface MCPManagerProps {
    isOpen: boolean;
    onClose: () => void;
    workspace?: string;
    onOpenFile?: (path: string) => void;
}

const MCPManager: React.FC<MCPManagerProps> = ({ isOpen, onClose, workspace, onOpenFile }) => {
    const [servers, setServers] = useState<MCPServer[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [configExists, setConfigExists] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);

    const serverUrl = 'http://localhost:3847';

    // Load servers from API
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

            // Format servers
            const formattedServers: MCPServer[] = (data.servers || []).map((s: MCPServer) => ({
                ...s,
                status: 'disconnected' as const,
                tools: [],
                toolCount: 0,
            }));

            if (formattedServers.length === 0) {
                setError('No MCP servers configured. Create a config file to add servers.');
            }

            setServers(formattedServers);
            if (formattedServers.length > 0 && !selectedServer) {
                setSelectedServer(formattedServers[0].name);
                // Auto-connect to first server if enabled
                if (formattedServers[0].enabled) {
                    connectToServer(formattedServers[0].name);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load servers');
            setServers([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace]);

    // Connect to an MCP server and fetch real tools
    const connectToServer = async (serverName: string) => {
        setConnecting(serverName);
        setServers(prev => prev.map(s =>
            s.name === serverName ? { ...s, status: 'connecting' } : s
        ));

        try {
            const params = workspace ? `?workspace=${encodeURIComponent(workspace)}` : '';
            const res = await fetch(
                `${serverUrl}/api/agentkit/mcp/servers/${serverName}/connect${params}`,
                { method: 'POST' }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to connect');
            }

            // Update server with real tools from MCP
            setServers(prev => prev.map(s =>
                s.name === serverName
                    ? {
                        ...s,
                        status: 'connected',
                        tools: data.tools || [],
                        toolCount: data.toolCount || data.tools?.length || 0,
                    }
                    : s
            ));
        } catch (err) {
            setServers(prev => prev.map(s =>
                s.name === serverName
                    ? { ...s, status: 'error', tools: [], toolCount: 0 }
                    : s
            ));
            console.error(`Failed to connect to ${serverName}:`, err);
        } finally {
            setConnecting(null);
        }
    };

    // Disconnect from an MCP server
    const disconnectFromServer = async (serverName: string) => {
        try {
            await fetch(
                `${serverUrl}/api/agentkit/mcp/servers/${serverName}/disconnect`,
                { method: 'POST' }
            );

            setServers(prev => prev.map(s =>
                s.name === serverName
                    ? { ...s, status: 'disconnected', tools: [], toolCount: 0 }
                    : s
            ));
        } catch (err) {
            console.error(`Failed to disconnect from ${serverName}:`, err);
        }
    };

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
        // Update local state immediately
        setServers(prev => prev.map(s =>
            s.name === serverName ? { ...s, enabled } : s
        ));

        try {
            await fetch(`${serverUrl}/api/agentkit/mcp/servers/${serverName}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled, workspace }),
            });

            // If enabling, connect; if disabling, disconnect
            if (enabled) {
                await connectToServer(serverName);
            } else {
                await disconnectFromServer(serverName);
            }
        } catch (err) {
            console.error('Failed to toggle server:', err);
        }
    };

    const handleToggleAutoApprove = async (serverName: string, autoApprove: boolean) => {
        // Update local state immediately
        setServers(prev => prev.map(s =>
            s.name === serverName ? { ...s, autoApprove } : s
        ));

        try {
            await fetch(`${serverUrl}/api/agentkit/mcp/servers/${serverName}/auto-approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoApprove, workspace }),
            });
        } catch (err) {
            console.error('Failed to toggle auto-approve:', err);
        }
    };

    const handleConnectClick = async (serverName: string) => {
        const server = servers.find(s => s.name === serverName);
        if (!server) return;

        if (server.status === 'connected') {
            await disconnectFromServer(serverName);
        } else {
            await connectToServer(serverName);
        }
    };

    const openRawConfig = async () => {
        if (!workspace) return;

        const configPath = `${workspace}/.rainy/mcp.json`;

        if (onOpenFile) {
            onOpenFile(configPath);
            onClose();
            return;
        }

        try {
            const { openPath } = await import('@tauri-apps/plugin-opener');
            await openPath(configPath);
        } catch {
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
    const connectedCount = servers.filter(s => s.status === 'connected').length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl w-[90%] h-[88%] max-w-6xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border dark:border-border/30">
                    <h2 className="text-xl font-semibold">Manage MCP servers</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {connectedCount}/{servers.length} connected • {totalTools} tools
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
                        ) : servers.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                                No servers configured
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
                                            {selectedServerData.transport}
                                        </span>
                                        <button
                                            onClick={() => handleConnectClick(selectedServerData.name)}
                                            disabled={connecting === selectedServerData.name}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors",
                                                selectedServerData.status === 'connected'
                                                    ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                                            )}
                                        >
                                            {connecting === selectedServerData.name ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : selectedServerData.status === 'connected' ? (
                                                <>
                                                    <PlugZap className="w-3 h-3" />
                                                    Connected
                                                </>
                                            ) : (
                                                <>
                                                    <Plug className="w-3 h-3" />
                                                    Connect
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">Enabled</span>
                                            <Switch
                                                checked={selectedServerData.enabled}
                                                onCheckedChange={(checked) => handleToggleServer(selectedServerData.name, checked)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                Auto-approve
                                                {selectedServerData.trustLevel === 'system' && (
                                                    <span className="ml-1 text-xs text-green-500">(system)</span>
                                                )}
                                            </span>
                                            <Switch
                                                checked={selectedServerData.autoApprove ?? false}
                                                onCheckedChange={(checked) => handleToggleAutoApprove(selectedServerData.name, checked)}
                                                disabled={selectedServerData.trustLevel === 'system'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {selectedServerData.description && (
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {selectedServerData.description}
                                    </p>
                                )}

                                {/* Connection Status */}
                                {selectedServerData.status !== 'connected' && (
                                    <div className="mb-6 p-4 bg-muted/20 rounded-xl border border-border/30 text-center">
                                        <Plug className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm text-muted-foreground">
                                            {selectedServerData.status === 'connecting'
                                                ? 'Connecting to server...'
                                                : selectedServerData.status === 'error'
                                                    ? 'Failed to connect. Check server configuration.'
                                                    : 'Click "Connect" to load tools from this server'}
                                        </p>
                                    </div>
                                )}

                                {/* Tools List */}
                                {selectedServerData.status === 'connected' && (
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
                                                    {tool.description || 'No description available'}
                                                </p>
                                            </div>
                                        ))}

                                        {(!selectedServerData.tools || selectedServerData.tools.length === 0) && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>No tools exposed by this server</p>
                                            </div>
                                        )}
                                    </div>
                                )}
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
