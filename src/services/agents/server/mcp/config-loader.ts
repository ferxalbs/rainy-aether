/**
 * MCP Configuration Loader
 * 
 * Loads MCP server configurations from:
 * 1. Project-level: .rainy/rainy-mcp.json (highest priority)
 * 2. Environment variables (fallback)
 * 3. Built-in defaults (lowest priority)
 * 
 * This follows the standard IDE pattern of per-project configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPServerConfig, MCPTransport } from './config';

// ===========================
// Types
// ===========================

/**
 * JSON schema for .rainy/rainy-mcp.json
 */
export interface RainyMCPConfig {
    $schema?: string;
    version: '1.0';
    servers: MCPServerEntry[];
    defaults?: {
        timeout?: number;
        retries?: number;
        retryDelay?: number;
    };
}

export interface MCPServerEntry {
    name: string;
    description?: string;
    enabled?: boolean;
    transport: MCPTransportConfig;
    category?: 'workspace' | 'documentation' | 'development' | 'cloud' | 'custom';
    timeout?: number;
    retries?: number;
}

export type MCPTransportConfig =
    | { type: 'stdio'; command: string; args?: string[]; env?: Record<string, string> }
    | { type: 'ws'; url: string }
    | { type: 'sse'; url: string; headers?: Record<string, string> }
    | { type: 'streamable-http'; url: string; headers?: Record<string, string> };

// ===========================
// Constants
// ===========================

const CONFIG_DIR = '.rainy';
const CONFIG_FILE = 'rainy-mcp.json';
const SCHEMA_URL = 'https://rainy-aether.dev/schemas/rainy-mcp.json';

// ===========================
// Config Loader
// ===========================

let cachedWorkspace: string | null = null;
let cachedConfig: RainyMCPConfig | null = null;

/**
 * Get project-level MCP configuration path
 */
export function getMCPConfigPath(workspace: string): string {
    return path.join(workspace, CONFIG_DIR, CONFIG_FILE);
}

/**
 * Check if project has MCP configuration
 */
export function hasMCPConfig(workspace: string): boolean {
    const configPath = getMCPConfigPath(workspace);
    return fs.existsSync(configPath);
}

/**
 * Load MCP configuration from .rainy/rainy-mcp.json
 */
export function loadMCPConfig(workspace: string): RainyMCPConfig | null {
    // Return cached if same workspace
    if (cachedWorkspace === workspace && cachedConfig) {
        return cachedConfig;
    }

    const configPath = getMCPConfigPath(workspace);

    if (!fs.existsSync(configPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as RainyMCPConfig;

        // Validate version
        if (config.version !== '1.0') {
            console.warn(`[MCP Config] Unsupported version: ${config.version}`);
            return null;
        }

        // Cache for performance
        cachedWorkspace = workspace;
        cachedConfig = config;

        console.log(`[MCP Config] Loaded ${config.servers.length} servers from ${configPath}`);
        return config;
    } catch (error) {
        console.error(`[MCP Config] Failed to load ${configPath}:`, error);
        return null;
    }
}

/**
 * Convert project config to MCPServerConfig[]
 */
export function getProjectMCPConfigs(workspace: string): MCPServerConfig[] {
    const config = loadMCPConfig(workspace);
    if (!config) return [];

    return config.servers
        .filter(s => s.enabled !== false)
        .map(s => ({
            name: s.name,
            description: s.description || `MCP Server: ${s.name}`,
            transport: s.transport as MCPTransport,
            enabled: s.enabled !== false,
            priority: 'local' as const,
            category: s.category || 'custom',
        }));
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
    const dir = path.dirname(configPath);

    // Create directory if not exists
    if (!fs.existsSync(dir)) {
        return () => { }; // Nothing to watch
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
 * Create default MCP configuration file
 */
export function createDefaultMCPConfig(workspace: string): string {
    const configDir = path.join(workspace, CONFIG_DIR);
    const configPath = getMCPConfigPath(workspace);

    // Create .rainy directory if needed
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const defaultConfig: RainyMCPConfig = {
        $schema: SCHEMA_URL,
        version: '1.0',
        servers: [
            {
                name: 'context7',
                description: 'Live documentation and code examples',
                enabled: true,
                transport: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['-y', '@context7/mcp-server'],
                },
                category: 'documentation',
            },
        ],
        defaults: {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
        },
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log(`[MCP Config] Created default config at ${configPath}`);

    clearConfigCache();
    return configPath;
}

/**
 * Add server to MCP configuration
 */
export function addServerToConfig(workspace: string, server: MCPServerEntry): boolean {
    let config = loadMCPConfig(workspace);

    if (!config) {
        // Create new config
        createDefaultMCPConfig(workspace);
        config = loadMCPConfig(workspace);
    }

    if (!config) return false;

    // Check for duplicate
    if (config.servers.some(s => s.name === server.name)) {
        console.warn(`[MCP Config] Server ${server.name} already exists`);
        return false;
    }

    config.servers.push(server);

    const configPath = getMCPConfigPath(workspace);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    clearConfigCache();

    return true;
}

/**
 * Remove server from MCP configuration
 */
export function removeServerFromConfig(workspace: string, serverName: string): boolean {
    const config = loadMCPConfig(workspace);
    if (!config) return false;

    const index = config.servers.findIndex(s => s.name === serverName);
    if (index === -1) return false;

    config.servers.splice(index, 1);

    const configPath = getMCPConfigPath(workspace);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    clearConfigCache();

    return true;
}

/**
 * Enable/disable server in configuration
 */
export function toggleServerEnabled(workspace: string, serverName: string, enabled: boolean): boolean {
    const config = loadMCPConfig(workspace);
    if (!config) return false;

    const server = config.servers.find(s => s.name === serverName);
    if (!server) return false;

    server.enabled = enabled;

    const configPath = getMCPConfigPath(workspace);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    clearConfigCache();

    return true;
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

    // Check version
    if (cfg.version !== '1.0') {
        errors.push(`Invalid version: ${cfg.version}. Expected "1.0"`);
    }

    // Check servers
    if (!Array.isArray(cfg.servers)) {
        errors.push('servers must be an array');
    } else {
        for (let i = 0; i < cfg.servers.length; i++) {
            const server = cfg.servers[i] as MCPServerEntry;

            if (!server.name || typeof server.name !== 'string') {
                errors.push(`Server ${i}: name is required`);
            }

            if (!server.transport || typeof server.transport !== 'object') {
                errors.push(`Server ${i}: transport is required`);
            } else {
                const transport = server.transport;
                const validTypes = ['stdio', 'ws', 'sse', 'streamable-http'];
                if (!validTypes.includes(transport.type)) {
                    errors.push(`Server ${i}: invalid transport type "${transport.type}"`);
                }

                if (transport.type === 'stdio' && !transport.command) {
                    errors.push(`Server ${i}: stdio transport requires command`);
                }

                if (['ws', 'sse', 'streamable-http'].includes(transport.type)) {
                    const urlTransport = transport as { url?: string };
                    if (!urlTransport.url) {
                        errors.push(`Server ${i}: ${transport.type} transport requires url`);
                    }
                }
            }
        }
    }

    // Warnings for best practices
    const serverCount = Array.isArray(cfg.servers) ? cfg.servers.length : 0;
    if (serverCount > 10) {
        warnings.push('Consider reducing server count for performance');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
