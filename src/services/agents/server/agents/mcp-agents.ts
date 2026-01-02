/**
 * MCP-Enhanced Agents
 * 
 * Agents with MCP server connections for external capabilities.
 * Supports Context7 for documentation and other MCP extensions.
 * 
 * Uses model IDs aligned with src/services/agent/providers
 */

import { createAgent, gemini } from '@inngest/agent-kit';
import { buildEnhancedPrompt } from './prompts';
import { plannerTools, coderTools, reviewerTools, docsTools } from '../tools/agentkit';
import { getMCPConfigs } from '../mcp/config';

// ===========================
// Types
// ===========================

export interface MCPAgentOptions {
    workspace?: string;
    enableMCP?: boolean;
    mcpServers?: string[]; // List of MCP server names to enable
}

// ===========================
// Model Configuration
// ===========================

// Aligned with src/services/agent/providers/index.ts
const MODELS = {
    default: 'gemini-3-flash-preview',
    fast: 'gemini-3-flash-preview',
    smart: 'gemini-3-pro-preview',
} as const;

// ===========================
// MCP Server Configuration Helpers
// ===========================

/**
 * Convert MCP configs to AgentKit mcpServers format
 */
function getMCPServersForAgent(serverNames?: string[]): Array<{
    name: string;
    transport: { type: string; url?: string; command?: string; args?: string[] };
}> {
    const configs = getMCPConfigs();
    const targetServers = serverNames
        ? configs.filter(c => serverNames.includes(c.name))
        : configs;

    return targetServers
        .filter(config => config.enabled)
        // Skip internal servers - their tools are built-in
        .filter(config => config.transport.type !== 'internal')
        .map(config => {
            const transport = config.transport;
            if (transport.type === 'stdio') {
                return {
                    name: config.name,
                    transport: {
                        type: 'stdio' as const,
                        command: transport.command,
                        args: transport.args,
                    },
                };
            }
            // ws, sse, streamable-http all have url
            if ('url' in transport) {
                return {
                    name: config.name,
                    transport: {
                        type: transport.type,
                        url: transport.url,
                    },
                };
            }
            // Fallback (shouldn't happen)
            return {
                name: config.name,
                transport: { type: transport.type } as { type: string },
            };
        });
}

// ===========================
// MCP-Enhanced Agent Factories
// ===========================

/**
 * Create a planner agent with MCP documentation support
 */
export function createMCPPlannerAgent(options: MCPAgentOptions = {}) {
    const { workspace, enableMCP = true, mcpServers = ['context7'] } = options;

    const mcpConfig = enableMCP ? getMCPServersForAgent(mcpServers) : [];

    return createAgent({
        name: 'mcp-planner',
        description: 'Analyzes tasks with live documentation access via MCP',
        system: buildEnhancedPrompt('planner', {
            workspace,
            additionalContext: enableMCP
                ? 'You have access to live documentation via Context7. Use query-docs to get up-to-date information.'
                : undefined,
        }),
        model: gemini({ model: MODELS.smart }), // Planner needs reasoning
        tools: plannerTools,
        mcpServers: mcpConfig as unknown as Parameters<typeof createAgent>[0]['mcpServers'],
    });
}

/**
 * Create a coder agent with MCP capabilities
 */
export function createMCPCoderAgent(options: MCPAgentOptions = {}) {
    const { workspace, enableMCP = true, mcpServers = ['context7'] } = options;

    const mcpConfig = enableMCP ? getMCPServersForAgent(mcpServers) : [];

    return createAgent({
        name: 'mcp-coder',
        description: 'Writes code with access to live documentation and external tools',
        system: buildEnhancedPrompt('coder', {
            workspace,
            additionalContext: enableMCP
                ? 'You can query live documentation using Context7 for accurate API references.'
                : undefined,
        }),
        model: gemini({ model: MODELS.default }),
        tools: coderTools,
        mcpServers: mcpConfig as unknown as Parameters<typeof createAgent>[0]['mcpServers'],
    });
}

/**
 * Create a documentation agent with Context7 MCP
 */
export function createMCPDocsAgent(options: MCPAgentOptions = {}) {
    const { workspace, enableMCP = true, mcpServers = ['context7'] } = options;

    const mcpConfig = enableMCP ? getMCPServersForAgent(mcpServers) : [];

    return createAgent({
        name: 'mcp-docs',
        description: 'Retrieves and explains documentation using Context7',
        system: `You are a documentation specialist with access to Context7.

## Your Role
- Query live documentation for any library or framework
- Provide accurate, up-to-date API references
- Explain usage patterns with real code examples

## Using Context7
1. First use 'resolve-library-id' to get the correct library ID
2. Then use 'query-docs' with specific questions

## Output Style
- Always cite the library version
- Include code examples when helpful
- Link to relevant documentation sections`,
        model: gemini({ model: MODELS.fast }),
        tools: docsTools,
        mcpServers: mcpConfig as unknown as Parameters<typeof createAgent>[0]['mcpServers'],
    });
}

/**
 * Create a reviewer agent with MCP capabilities
 */
export function createMCPReviewerAgent(options: MCPAgentOptions = {}) {
    const { workspace, enableMCP = true, mcpServers = ['context7'] } = options;

    const mcpConfig = enableMCP ? getMCPServersForAgent(mcpServers) : [];

    return createAgent({
        name: 'mcp-reviewer',
        description: 'Reviews code with access to latest best practices via MCP',
        system: buildEnhancedPrompt('reviewer', {
            workspace,
            additionalContext: enableMCP
                ? 'Query Context7 for latest best practices and security guidelines when reviewing.'
                : undefined,
        }),
        model: gemini({ model: MODELS.default }),
        tools: reviewerTools,
        mcpServers: mcpConfig as unknown as Parameters<typeof createAgent>[0]['mcpServers'],
    });
}

// ===========================
// MCP Agent Registry
// ===========================

export const mcpAgentFactories = {
    'mcp-planner': createMCPPlannerAgent,
    'mcp-coder': createMCPCoderAgent,
    'mcp-docs': createMCPDocsAgent,
    'mcp-reviewer': createMCPReviewerAgent,
} as const;

export type MCPAgentType = keyof typeof mcpAgentFactories;

/**
 * Create an MCP-enhanced agent by type
 */
export function createMCPAgent(type: MCPAgentType, options: MCPAgentOptions = {}) {
    const factory = mcpAgentFactories[type];
    return factory(options);
}

/**
 * Get all available MCP agent types
 */
export function getMCPAgentTypes(): MCPAgentType[] {
    return Object.keys(mcpAgentFactories) as MCPAgentType[];
}
