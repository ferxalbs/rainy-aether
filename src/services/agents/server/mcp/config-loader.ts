/**
 * MCP Configuration Loader
 * 
 * Loads MCP server configurations using the STANDARD MCP format.
 * Compatible with Claude Desktop, Cursor, and other MCP clients.
 * 
 * Config file: .rainy/mcp.json (standard format)
 * 
 * Format:
 * {
 *   "mcpServers": {
 *     "server-name": {
 *       "command": "npx",
 *       "args": ["-y", "package-name", "--api-key", "..."],
 *       "env": {}
 *     }
 *   }
 * }
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPServerConfig, MCPTransport } from './config';

// ===========================
// Standard MCP Config Format
// ===========================

/**
 * Standard MCP configuration format
 * Compatible with Claude Desktop, Cursor, etc.
 */
export interface MCPConfig {
    mcpServers: Record<string, MCPServerEntry>;
}

/**
 * Standard MCP server entry
 */
export interface MCPServerEntry {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    // Extended fields for IDE
    enabled?: boolean;
    description?: string;
    /** If true, tool calls from this server don't require user approval */
    autoApprove?: boolean;
}

// ===========================
// Constants
// ===========================

const CONFIG_DIR = '.rainy';
const CONFIG_FILE = 'mcp.json'; // Standard name, no custom prefix

// ===========================
// Config Loader
// ===========================

let cachedWorkspace: string | null = null;
let cachedConfig: MCPConfig | null = null;

/**
 * Get MCP configuration path for a workspace
 */
export function getMCPConfigPath(workspace: string): string {
    return path.join(workspace, CONFIG_DIR, CONFIG_FILE);
}

/**
 * Check if workspace has MCP configuration
 */
export function hasMCPConfig(workspace: string): boolean {
    return fs.existsSync(getMCPConfigPath(workspace));
}

/**
 * Load MCP configuration from .rainy/mcp.json
 */
export function loadMCPConfig(workspace: string): MCPConfig | null {
    if (cachedWorkspace === workspace && cachedConfig) {
        return cachedConfig;
    }

    const configPath = getMCPConfigPath(workspace);

    if (!fs.existsSync(configPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as MCPConfig;

        if (!config.mcpServers) {
            console.warn('[MCP] Invalid config: missing mcpServers');
            return null;
        }

        cachedWorkspace = workspace;
        cachedConfig = config;

        const serverCount = Object.keys(config.mcpServers).length;
        console.log(`[MCP] Loaded ${serverCount} servers from ${configPath}`);
        return config;
    } catch (error) {
        console.error(`[MCP] Failed to load ${configPath}:`, error);
        return null;
    }
}

/**
 * Convert standard config to MCPServerConfig[]
 */
export function getProjectMCPConfigs(workspace: string): MCPServerConfig[] {
    const config = loadMCPConfig(workspace);
    if (!config) return [];

    return Object.entries(config.mcpServers)
        .filter(([, entry]) => entry.enabled !== false)
        .map(([name, entry]) => ({
            name,
            description: entry.description || `MCP Server: ${name}`,
            transport: {
                type: 'stdio' as const,
                command: entry.command,
                args: entry.args,
                env: entry.env,
            } as MCPTransport,
            enabled: entry.enabled !== false,
            priority: 'local' as const,
            category: 'custom' as const,
            autoApprove: entry.autoApprove ?? false, // Default: require approval
            trustLevel: 'untrusted' as const,        // External servers start untrusted
        }));
}

/**
 * Get server names from config
 */
export function getMCPServerNames(workspace: string): string[] {
    const config = loadMCPConfig(workspace);
    if (!config) return [];
    return Object.keys(config.mcpServers);
}

/**
 * Get specific server config
 */
export function getMCPServer(workspace: string, name: string): MCPServerEntry | null {
    const config = loadMCPConfig(workspace);
    if (!config) return null;
    return config.mcpServers[name] || null;
}

/**
 * Clear cached configuration
 */
export function clearConfigCache(): void {
    cachedWorkspace = null;
    cachedConfig = null;
}

/**
 * Watch configuration file for changes
 */
export function watchMCPConfig(workspace: string, onChange: () => void): () => void {
    const configPath = getMCPConfigPath(workspace);

    if (!fs.existsSync(configPath)) {
        return () => { };
    }

    try {
        const watcher = fs.watch(configPath, (eventType) => {
            if (eventType === 'change') {
                clearConfigCache();
                onChange();
            }
        });
        return () => watcher.close();
    } catch {
        return () => { };
    }
}

// ===========================
// Config Writer
// ===========================

/**
 * Create default MCP configuration
 */
export function createDefaultMCPConfig(workspace: string): string {
    const configDir = path.join(workspace, CONFIG_DIR);
    const configPath = getMCPConfigPath(workspace);

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const defaultConfig: MCPConfig = {
        mcpServers: {
            'context7': {
                command: 'npx',
                args: ['-y', '@upstash/context7-mcp'],
                env: {},
                description: 'Live documentation and code examples',
            },
        },
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log(`[MCP] Created config at ${configPath}`);

    clearConfigCache();
    return configPath;
}

/**
 * Add server to configuration
 */
export function addMCPServer(
    workspace: string,
    name: string,
    server: MCPServerEntry
): boolean {
    let config = loadMCPConfig(workspace);

    if (!config) {
        createDefaultMCPConfig(workspace);
        config = loadMCPConfig(workspace);
    }

    if (!config) return false;

    if (config.mcpServers[name]) {
        console.warn(`[MCP] Server ${name} already exists`);
        return false;
    }

    config.mcpServers[name] = server;

    const configPath = getMCPConfigPath(workspace);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    clearConfigCache();

    return true;
}

/**
 * Update server configuration
 */
export function updateMCPServer(
    workspace: string,
    name: string,
    updates: Partial<MCPServerEntry>
): boolean {
    const config = loadMCPConfig(workspace);
    if (!config || !config.mcpServers[name]) return false;

    config.mcpServers[name] = { ...config.mcpServers[name], ...updates };

    const configPath = getMCPConfigPath(workspace);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    clearConfigCache();

    return true;
}

/**
 * Remove server from configuration
 */
export function removeMCPServer(workspace: string, name: string): boolean {
    const config = loadMCPConfig(workspace);
    if (!config || !config.mcpServers[name]) return false;

    delete config.mcpServers[name];

    const configPath = getMCPConfigPath(workspace);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    clearConfigCache();

    return true;
}

/**
 * Toggle server enabled/disabled
 */
export function toggleMCPServer(workspace: string, name: string, enabled: boolean): boolean {
    return updateMCPServer(workspace, name, { enabled });
}

// ===========================
// Validation
// ===========================

export interface ConfigValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate MCP configuration
 */
export function validateMCPConfig(config: unknown): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== 'object') {
        return { valid: false, errors: ['Config must be an object'], warnings: [] };
    }

    const cfg = config as Record<string, unknown>;

    if (!cfg.mcpServers || typeof cfg.mcpServers !== 'object') {
        errors.push('Missing or invalid mcpServers object');
        return { valid: false, errors, warnings };
    }

    const servers = cfg.mcpServers as Record<string, unknown>;

    for (const [name, server] of Object.entries(servers)) {
        if (!server || typeof server !== 'object') {
            errors.push(`${name}: Invalid server config`);
            continue;
        }

        const s = server as Record<string, unknown>;

        if (typeof s.command !== 'string') {
            errors.push(`${name}: Missing command`);
        }

        if (s.args !== undefined && !Array.isArray(s.args)) {
            errors.push(`${name}: args must be an array`);
        }

        if (s.env !== undefined && typeof s.env !== 'object') {
            errors.push(`${name}: env must be an object`);
        }
    }

    if (Object.keys(servers).length > 10) {
        warnings.push('Many servers configured - may impact performance');
    }

    return { valid: errors.length === 0, errors, warnings };
}

// ===========================
// Backward Compatibility
// ===========================

// Re-export with old names for compatibility
export const addServerToConfig = addMCPServer;
export const removeServerFromConfig = removeMCPServer;
export const toggleServerEnabled = toggleMCPServer;
