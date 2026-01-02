/**
 * MCP Manager Component
 * 
 * Manages MCP servers and displays their tools.
 * Similar design pattern to ExtensionMarketplace.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Power, PowerOff, ExternalLink,
    Wrench, AlertCircle, Loader2
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
}

// ===========================
// Component
// ===========================

const MCPManager: React.FC<MCPManagerProps> = ({ isOpen, onClose, workspace }) => {
    const [servers, setServers] = useState<MCPServer[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const serverUrl = 'http://localhost:3847';

    // Load servers
    const loadServers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = workspace ? `?workspace=${encodeURIComponent(workspace)}` : '';
            const res = await fetch(`${serverUrl}/api/agentkit/mcp/servers${params}`);
            const data = await res.json();

            // Format servers with tool counts (mock for now - would come from real MCP connections)
            const formattedServers: MCPServer[] = (data.servers || []).map((s: MCPServer) => ({
                ...s,
                status: s.enabled ? 'connected' : 'disconnected',
                tools: [], // Tools loaded when server selected
            }));

            setServers(formattedServers);
            if (formattedServers.length > 0 && !selectedServer) {
                setSelectedServer(formattedServers[0].name);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load servers');
        } finally {
            setLoading(false);
        }
    }, [workspace, selectedServer]);

    // Load tools for selected server (mock implementation)
    const loadServerTools = useCallback(async (serverName: string) => {
        // In a real implementation, this would connect to the MCP server and list tools
        // For now, return mock tools based on server name
        const mockTools: Record<string, MCPTool[]> = {
            'context7': [
                {
                    name: 'resolve-library-id',
                    description: 'Resolves a package/product name to a Context7-compatible library ID and returns matching libraries. You MUST call this function before \'query-docs\' to obtain a valid Context7-compatible library ID.',
                },
                {
                    name: 'query-docs',
                    description: 'Retrieves and queries up-to-date documentation and code examples from Context7 for any programming library or framework.',
                },
            ],
            'dart-mcp-server': Array.from({ length: 24 }, (_, i) => ({
                name: `dart_tool_${i + 1}`,
                description: `Dart tooling function ${i + 1} for Flutter development`,
            })),
            'firebase-mcp-server': Array.from({ length: 14 }, (_, i) => ({
                name: `firebase_${['auth', 'firestore', 'storage', 'functions', 'hosting', 'analytics', 'messaging', 'config', 'database', 'crashlytics', 'performance', 'app_check', 'extensions', 'remote_config'][i] || 'tool'}`,
                description: `Firebase ${['Authentication', 'Firestore', 'Cloud Storage', 'Cloud Functions', 'Hosting', 'Analytics', 'Cloud Messaging', 'Remote Config', 'Realtime Database', 'Crashlytics', 'Performance', 'App Check', 'Extensions', 'Remote Config'][i] || 'Tool'} operations`,
            })),
            'workspace': [
                { name: 'read_file', description: 'Read the contents of a file from the workspace' },
                { name: 'write_file', description: 'Write content to a file in the workspace' },
                { name: 'search_code', description: 'Search for code patterns across the workspace' },
                { name: 'run_command', description: 'Execute a shell command in the workspace' },
            ],
        };

        return mockTools[serverName] || [];
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadServers();
        }
    }, [isOpen, loadServers]);

    useEffect(() => {
        if (selectedServer) {
            loadServerTools(selectedServer).then(tools => {
                setServers(prev => prev.map(s =>
                    s.name === selectedServer ? { ...s, tools } : s
                ));
            });
        }
    }, [selectedServer, loadServerTools]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadServers();
        setRefreshing(false);
    };

    const handleToggleServer = async (serverName: string, enabled: boolean) => {
        try {
            await fetch(`${serverUrl}/api/agentkit/mcp/servers/${serverName}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled, workspace }),
            });
            setServers(prev => prev.map(s =>
                s.name === serverName ? { ...s, enabled, status: enabled ? 'connected' : 'disconnected' } : s
            ));
        } catch (err) {
            console.error('Failed to toggle server:', err);
        }
    };

    const openRawConfig = () => {
        // Open the config file in editor
        if (workspace) {
            window.open(`file://${workspace}/.rainy/mcp.json`, '_blank');
        }
    };

    const selectedServerData = servers.find(s => s.name === selectedServer);
    const totalTools = servers.reduce((sum, s) => sum + (s.tools?.length || 0), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-background/90 dark:bg-background/10 backdrop-blur-3xl backdrop-saturate-150 border-2 dark:border border-border dark:border-border/50 rounded-2xl shadow-2xl w-[90%] h-[88%] max-w-6xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border dark:border-border/30">
                    <h2 className="text-xl font-semibold">Manage MCP servers</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {totalTools} / 100 tools
                        </span>
                        <button
                            onClick={openRawConfig}
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                        >
                            View raw config <ExternalLink className="w-3.5 h-3.5" />
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
                    {/* Server Sidebar */}
                    <div className="w-64 border-r border-border dark:border-border/30 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="p-4 text-sm text-destructive">{error}</div>
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
                                            {server.tools?.length || 0}
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
                                        <button className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors">
                                            Configure
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">Enabled</span>
                                        <Switch
                                            checked={selectedServerData.enabled}
                                            onCheckedChange={(checked) => handleToggleServer(selectedServerData.name, checked)}
                                        />
                                    </div>
                                </div>

                                {/* Tools List */}
                                <div className="space-y-4">
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
                                                    <h4 className="font-medium">{tool.name}</h4>
                                                </div>
                                                <Switch defaultChecked />
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
                                            <p className="text-xs mt-1">Connect to this server to see available tools</p>
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
