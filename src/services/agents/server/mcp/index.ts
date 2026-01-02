/**
 * MCP Module Exports
 * 
 * Model Context Protocol integration for Rainy Brain.
 * Supports local and external MCP servers with multiple transports.
 */

export { MCPClientManager, mcpManager } from './client';
export { createLocalMCPServer } from './local-server';
export { getMCPConfigs, type MCPTransport, type MCPServerConfig } from './config';
