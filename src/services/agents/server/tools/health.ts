import { TOOL_DEFINITIONS } from './schema';
import { allAgentKitTools } from './agentkit';
import { getToolHandlerNames } from './bridge';

export interface ToolHealthReport {
    healthy: boolean;
    counts: {
        schema: number;
        handlers: number;
        agentkit: number;
    };
    missing: {
        handlers: string[];
        agentkit: string[];
    };
    extra: {
        handlers: string[];
        agentkit: string[];
    };
}

export function getToolHealthReport(): ToolHealthReport {
    const schema = new Set<string>(TOOL_DEFINITIONS.map(t => t.name));
    const handlers = new Set<string>(getToolHandlerNames());
    const agentkit = new Set<string>(allAgentKitTools.map(t => t.name));

    const missingHandlers = [...schema].filter(name => !handlers.has(name)).sort();
    const missingAgentkit = [...schema].filter(name => !agentkit.has(name)).sort();
    const extraHandlers = [...handlers].filter(name => !schema.has(name)).sort();
    const extraAgentkit = [...agentkit].filter(name => !schema.has(name)).sort();

    return {
        healthy: missingHandlers.length === 0 && missingAgentkit.length === 0,
        counts: {
            schema: schema.size,
            handlers: handlers.size,
            agentkit: agentkit.size,
        },
        missing: {
            handlers: missingHandlers,
            agentkit: missingAgentkit,
        },
        extra: {
            handlers: extraHandlers,
            agentkit: extraAgentkit,
        },
    };
}
