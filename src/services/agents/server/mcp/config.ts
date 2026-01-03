/**
 * MCP Configuration
 * 
 * Defines MCP server configurations for local and external connections.
 * Priority: Local transports (stdio, local WS) over HTTPS for production stability.
 */

// ===========================
// Types
// ===========================

export type MCPTransport =
    | { type: 'stdio'; command: string; args?: string[]; env?: Record<string, string> }
    | { type: 'ws'; url: string }
    | { type: 'sse'; url: string; headers?: Record<string, string> }
    | { type: 'streamable-http'; url: string; headers?: Record<string, string> }
    | { type: 'internal' }; // Built-in tools, no external process

export interface MCPServerConfig {
    name: string;
    description: string;
    transport: MCPTransport;
    enabled: boolean;
    priority: 'local' | 'external';
    category: 'workspace' | 'documentation' | 'development' | 'cloud' | 'custom';
    /** If true, tool calls from this server don't require user approval */
    autoApprove?: boolean;
    /** Security classification for UI display */
    trustLevel?: 'trusted' | 'untrusted' | 'system';
}

// ===========================
// Local MCP Servers (Priority)
// ===========================

/**
 * Get MCP server configurations
 * Prioritizes local connections over HTTPS for production stability
 */
export function getMCPConfigs(): MCPServerConfig[] {
    const configs: MCPServerConfig[] = [];

    // --- Local Workspace Server (Always enabled, internal) ---
    // Uses built-in tools from the agent system, no MCP spawn needed
    configs.push({
        name: 'workspace',
        description: 'Local workspace tools: file operations, code search, git, terminal',
        transport: {
            type: 'internal', // Built-in, no external process
        },
        enabled: true,
        priority: 'local',
        category: 'workspace',
        autoApprove: true,       // Built-in tools are trusted
        trustLevel: 'system',    // System-level trust
    });

    // --- Context7 Documentation MCP (Local WS preferred) ---
    // Context7 provides up-to-date library documentation
    if (process.env.CONTEXT7_WS_URL) {
        configs.push({
            name: 'context7',
            description: 'Live documentation and code examples from Context7',
            transport: {
                type: 'ws',
                url: process.env.CONTEXT7_WS_URL,
            },
            enabled: true,
            priority: 'local',
            category: 'documentation',
        });
    }

    // --- Devin MCP (Local development tools) ---
    if (process.env.DEVIN_MCP_URL) {
        configs.push({
            name: 'devin',
            description: 'Devin-style coding assistance and project scaffolding',
            transport: {
                type: 'ws',
                url: process.env.DEVIN_MCP_URL,
            },
            enabled: true,
            priority: 'local',
            category: 'development',
        });
    }

    // --- Dart/Flutter MCP (Local for IDE features) ---
    if (process.env.DART_MCP_DTD_URI) {
        configs.push({
            name: 'dart',
            description: 'Dart Tooling Daemon for Flutter/Dart projects',
            transport: {
                type: 'ws',
                url: process.env.DART_MCP_DTD_URI,
            },
            enabled: true,
            priority: 'local',
            category: 'development',
        });
    }

    // --- Firebase MCP (Local preferred if available) ---
    if (process.env.FIREBASE_MCP_LOCAL) {
        configs.push({
            name: 'firebase',
            description: 'Firebase project management and deployment',
            transport: {
                type: 'ws',
                url: process.env.FIREBASE_MCP_LOCAL,
            },
            enabled: true,
            priority: 'local',
            category: 'cloud',
        });
    }

    return configs;
}

// ===========================
// Future: Smithery Integration (v0.1.10)
// ===========================

/**
 * Get Smithery MCP configs (to be enabled in v0.1.10)
 * Uses Smithery registry for external MCP servers
 */
export function getSmitheryConfigs(): MCPServerConfig[] {
    // Placeholder for Smithery integration
    // Will be implemented in v0.1.10
    return [];
}

// ===========================
// Helpers
// ===========================

export function getEnabledConfigs(): MCPServerConfig[] {
    return getMCPConfigs().filter(c => c.enabled);
}

export function getLocalConfigs(): MCPServerConfig[] {
    return getMCPConfigs().filter(c => c.priority === 'local');
}

export function getConfigByName(name: string): MCPServerConfig | undefined {
    return getMCPConfigs().find(c => c.name === name);
}
