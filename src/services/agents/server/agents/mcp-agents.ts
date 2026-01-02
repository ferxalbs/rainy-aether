/**
 * MCP-Enhanced Agents
 * 
 * Agents with MCP server connections for external capabilities.
 * Supports Context7 for documentation and other MCP extensions.
 */

import { createAgent } from '@inngest/agent-kit';
import { buildEnhancedPrompt } from './prompts';
import { getDefaultModel, getFastModel, getSmartModel } from './models';
import { plannerTools, coderTools, reviewerTools, docsTools } from '../tools/agentkit';
import { getMCPConfigs } from '../mcp/config';
import type { MCPServerConfig } from '../mcp/config';

// ===========================
// Types
// ===========================

export interface MCPAgentOptions {
    workspace?: string;
    enableMCP?: boolean;
    mcpServers?: string[]; // List of MCP server names to enable
}

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
        .map(config => ({
            name: config.name,
            transport: config.transport.type === 'stdio'
                ? {
                    type: 'stdio' as const,
                    command: config.transport.command,
                    args: config.transport.args,
                }
                : {
                    type: config.transport.type,
                    url: config.transport.url,
                },
        }));
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
        model: getSmartModel(),
        tools: plannerTools,
        mcpServers: mcpConfig as any, // Cast due to AgentKit type definition
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
        model: getDefaultModel(),
        tools: coderTools,
        mcpServers: mcpConfig as any,
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
        model: getFastModel(),
        tools: docsTools,
        mcpServers: mcpConfig as any,
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
        model: getDefaultModel(),
        tools: reviewerTools,
        mcpServers: mcpConfig as any,
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
