/**
 * Local MCP Server
 * 
 * Exposes workspace tools via MCP protocol for local consumption.
 * This allows agents to use the same tools through MCP interface.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOL_DEFINITIONS } from '../tools/schema';
import { createConfiguredExecutor, createToolCall } from '../tools';

// ===========================
// Local MCP Server Factory
// ===========================

/**
 * Create a local MCP server that exposes workspace tools
 */
export function createLocalMCPServer(workspacePath?: string) {
    const server = new Server(
        {
            name: 'rainy-workspace',
            version: '1.0.0',
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: TOOL_DEFINITIONS.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: {
                    type: 'object' as const,
                    properties: Object.fromEntries(
                        Object.entries(tool.parameters.properties).map(([key, param]) => [
                            key,
                            {
                                type: param.type,
                                description: param.description,
                                ...(param.enum ? { enum: param.enum } : {}),
                                ...(param.default !== undefined ? { default: param.default } : {}),
                            },
                        ])
                    ),
                    required: tool.parameters.required,
                },
            })),
        };
    });

    // Execute tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        const executor = createConfiguredExecutor(workspacePath);
        const call = createToolCall(name, args as Record<string, unknown> || {});

        try {
            const result = await executor.execute(call);

            if (result.result?.success) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result.result.data, null, 2),
                        },
                    ],
                };
            } else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${result.result?.error || 'Unknown error'}`,
                        },
                    ],
                    isError: true,
                };
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Execution error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });

    return server;
}

// ===========================
// Standalone Server Entry
// ===========================

/**
 * Run local MCP server as standalone process
 * Used when spawned via stdio transport
 */
export async function runLocalServer() {
    const server = createLocalMCPServer(process.env.WORKSPACE_PATH);
    const transport = new StdioServerTransport();

    await server.connect(transport);
    console.error('[MCP Local] Server running via stdio');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runLocalServer().catch(console.error);
}
