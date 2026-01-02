/**
 * MCP Client Manager
 * 
 * Manages connections to MCP servers with support for multiple transports.
 * Prioritizes local connections (stdio, local WebSocket) for prod stability.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPServerConfig, MCPTransport } from './config';

// ===========================
// Types
// ===========================

export interface MCPToolInfo {
    serverName: string;
    name: string;
    fullName: string; // serverName-toolName
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface MCPToolCallResult {
    success: boolean;
    content: Array<{ type: string; text?: string; data?: unknown }>;
    error?: string;
}

// ===========================
// MCP Client Manager
// ===========================

export class MCPClientManager {
    private clients: Map<string, Client> = new Map();
    private toolCache: Map<string, MCPToolInfo[]> = new Map();
    private connectionStatus: Map<string, 'connected' | 'disconnected' | 'error'> = new Map();

    /**
     * Connect to an MCP server
     */
    async connect(config: MCPServerConfig): Promise<boolean> {
        try {
            const transport = await this.createTransport(config.transport, config.name);
            if (!transport) {
                console.error(`[MCP] Unsupported transport type for ${config.name}`);
                this.connectionStatus.set(config.name, 'error');
                return false;
            }

            const client = new Client({
                name: `rainy-brain-${config.name}`,
                version: '1.0.0',
            }, {
                capabilities: {},
            });

            await client.connect(transport);
            this.clients.set(config.name, client);
            this.connectionStatus.set(config.name, 'connected');

            // Cache tools from this server
            await this.refreshTools(config.name);

            console.log(`[MCP] Connected to ${config.name} (${config.transport.type})`);
            return true;

        } catch (error) {
            console.error(`[MCP] Failed to connect to ${config.name}:`, error);
            this.connectionStatus.set(config.name, 'error');
            return false;
        }
    }

    /**
     * Create transport based on config
     */
    private async createTransport(transport: MCPTransport, _serverName: string) {
        switch (transport.type) {
            case 'stdio':
                return new StdioClientTransport({
                    command: transport.command,
                    args: transport.args,
                    env: transport.env,
                });

            case 'ws':
                // WebSocket transport - will use native WebSocket
                // Dynamic import to avoid bundling issues
                const { WebSocketClientTransport } = await import('@modelcontextprotocol/sdk/client/websocket.js');
                return new WebSocketClientTransport(new URL(transport.url));

            case 'sse':
                // SSE transport for HTTP-based servers
                const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');
                return new SSEClientTransport(new URL(transport.url));

            case 'streamable-http':
                // Streamable HTTP (not recommended for prod, kept for compatibility)
                console.warn(`[MCP] streamable-http transport is not recommended for production`);
                return null;

            default:
                return null;
        }
    }

    /**
     * Refresh tools from a connected server
     */
    async refreshTools(serverName: string): Promise<void> {
        const client = this.clients.get(serverName);
        if (!client) return;

        try {
            const response = await client.listTools();
            const tools: MCPToolInfo[] = response.tools.map(tool => ({
                serverName,
                name: tool.name,
                fullName: `${serverName}-${tool.name}`,
                description: tool.description || '',
                inputSchema: tool.inputSchema as Record<string, unknown>,
            }));
            this.toolCache.set(serverName, tools);
        } catch (error) {
            console.error(`[MCP] Failed to list tools from ${serverName}:`, error);
        }
    }

    /**
     * Call a tool on an MCP server
     */
    async callTool(
        serverName: string,
        toolName: string,
        args: Record<string, unknown>
    ): Promise<MCPToolCallResult> {
        const client = this.clients.get(serverName);
        if (!client) {
            return {
                success: false,
                content: [],
                error: `Server ${serverName} not connected`,
            };
        }

        try {
            const result = await client.callTool({
                name: toolName,
                arguments: args,
            });

            return {
                success: true,
                content: result.content as Array<{ type: string; text?: string; data?: unknown }>,
            };
        } catch (error) {
            return {
                success: false,
                content: [],
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Get all available tools (optionally filtered by server)
     */
    getAvailableTools(serverName?: string): MCPToolInfo[] {
        if (serverName) {
            return this.toolCache.get(serverName) || [];
        }
        return Array.from(this.toolCache.values()).flat();
    }

    /**
     * Get connected server names
     */
    getConnectedServers(): string[] {
        return Array.from(this.clients.keys());
    }

    /**
     * Get connection status
     */
    getStatus(serverName: string): 'connected' | 'disconnected' | 'error' | undefined {
        return this.connectionStatus.get(serverName);
    }

    /**
     * Disconnect from a server
     */
    async disconnect(serverName: string): Promise<void> {
        const client = this.clients.get(serverName);
        if (client) {
            try {
                await client.close();
            } catch (e) {
                // Ignore close errors
            }
            this.clients.delete(serverName);
            this.toolCache.delete(serverName);
            this.connectionStatus.set(serverName, 'disconnected');
        }
    }

    /**
     * Disconnect all servers
     */
    async disconnectAll(): Promise<void> {
        for (const serverName of this.clients.keys()) {
            await this.disconnect(serverName);
        }
    }
}

// Singleton instance
export const mcpManager = new MCPClientManager();
