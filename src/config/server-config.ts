/**
 * Server Configuration
 * 
 * Centralized configuration for the Agent Server.
 * Ensures consistency across all components.
 */

export const SERVER_CONFIG = {
    /** Server host */
    host: 'localhost',

    /** Server port (default: 3847) */
    port: process.env.AGENT_SERVER_PORT ? parseInt(process.env.AGENT_SERVER_PORT) : 3847,

    /** Get full base URL */
    get baseUrl(): string {
        return `http://${this.host}:${this.port}`;
    },

    /** API endpoints */
    endpoints: {
        agentkit: '/api/agentkit',
        subagents: '/api/agentkit/subagents',
        mcp: '/api/agentkit/mcp',
    },
} as const;

/**
 * Get full API endpoint URL
 */
export function getApiUrl(endpoint: keyof typeof SERVER_CONFIG.endpoints): string {
    return `${SERVER_CONFIG.baseUrl}${SERVER_CONFIG.endpoints[endpoint]}`;
}
