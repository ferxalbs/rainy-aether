/**
 * Smart Router
 * 
 * Routes tasks to the appropriate agent based on:
 * - Task content analysis
 * - Keywords and patterns
 * - Explicit agent requests
 */

import { AgentType, createAgent, getAgentTypes } from './specialized';
import type { BaseAgent, AgentContext, AgentResult } from './base';

// ===========================
// Types
// ===========================

export interface RouteDecision {
    agent: AgentType;
    confidence: number;
    reason: string;
}

export interface NetworkResult extends AgentResult {
    agentsUsed: AgentType[];
    totalIterations: number;
}

// ===========================
// Keywords for routing
// ===========================

const ROUTE_PATTERNS: Record<AgentType, { keywords: string[]; patterns: RegExp[] }> = {
    planner: {
        keywords: ['plan', 'design', 'architect', 'how to', 'approach', 'strategy', 'analyze', 'breakdown'],
        patterns: [/how (should|can|do) (i|we)/i, /what('s| is) the best way/i, /plan for/i],
    },
    coder: {
        keywords: ['write', 'create', 'implement', 'add', 'code', 'fix', 'refactor', 'build', 'edit', 'modify', 'update'],
        patterns: [/create (a |an )?(\w+ )?(file|component|function|class)/i, /implement/i, /add .+ to/i],
    },
    reviewer: {
        keywords: ['review', 'check', 'audit', 'analyze', 'security', 'performance', 'improve', 'optimize'],
        patterns: [/review (this|the|my)/i, /check for/i, /find (bugs|issues|problems)/i],
    },
    terminal: {
        keywords: ['run', 'execute', 'test', 'build', 'deploy', 'install', 'git', 'npm', 'pnpm', 'cargo', 'command'],
        patterns: [/run (the|a)?(\s+)?test/i, /execute/i, /build (the|this)/i, /git \w+/i],
    },
    docs: {
        keywords: ['explain', 'documentation', 'what is', 'how does', 'usage', 'example', 'help'],
        patterns: [/what (is|are|does)/i, /how does .+ work/i, /explain/i, /show me (an )?example/i],
    },
};

// ===========================
// Router
// ===========================

export class SmartRouter {
    private agents: Map<AgentType, BaseAgent> = new Map();
    private apiKey: string | null = null;

    /**
     * Initialize router with API key
     */
    async initialize(apiKey: string): Promise<void> {
        this.apiKey = apiKey;

        // Pre-create agents
        for (const type of getAgentTypes()) {
            const agent = createAgent(type);
            await agent.initialize(apiKey);
            this.agents.set(type, agent);
        }
    }

    /**
     * Route a task to the best agent
     */
    route(task: string, preferredAgent?: AgentType): RouteDecision {
        // If agent explicitly specified
        if (preferredAgent && this.agents.has(preferredAgent)) {
            return {
                agent: preferredAgent,
                confidence: 1.0,
                reason: 'Explicitly specified',
            };
        }

        // Score each agent
        const scores: Array<{ agent: AgentType; score: number; reasons: string[] }> = [];

        for (const [type, patterns] of Object.entries(ROUTE_PATTERNS)) {
            const agentType = type as AgentType;
            let score = 0;
            const reasons: string[] = [];

            // Check keywords
            const lowerTask = task.toLowerCase();
            for (const keyword of patterns.keywords) {
                if (lowerTask.includes(keyword)) {
                    score += 1;
                    reasons.push(`keyword: "${keyword}"`);
                }
            }

            // Check patterns
            for (const pattern of patterns.patterns) {
                if (pattern.test(task)) {
                    score += 2;
                    reasons.push(`pattern: ${pattern.source}`);
                }
            }

            scores.push({ agent: agentType, score, reasons });
        }

        // Sort by score
        scores.sort((a, b) => b.score - a.score);

        const best = scores[0];
        const maxScore = Math.max(...scores.map(s => s.score), 1);

        // Default to coder if no clear winner
        if (best.score === 0) {
            return {
                agent: 'coder',
                confidence: 0.5,
                reason: 'Default: no specific patterns matched',
            };
        }

        return {
            agent: best.agent,
            confidence: best.score / maxScore,
            reason: best.reasons.join(', '),
        };
    }

    /**
     * Execute task with automatic routing and handoffs
     */
    async execute(context: AgentContext, preferredAgent?: AgentType): Promise<NetworkResult> {
        if (!this.apiKey) {
            throw new Error('Router not initialized');
        }

        const agentsUsed: AgentType[] = [];
        let totalIterations = 0;
        let currentContext = { ...context };
        let maxHandoffs = 3;

        while (maxHandoffs > 0) {
            // Route to agent
            const decision = this.route(currentContext.task, preferredAgent);
            const agent = this.agents.get(decision.agent);

            if (!agent) {
                throw new Error(`Agent ${decision.agent} not found`);
            }

            console.log(`[Router] Routing to ${decision.agent} (confidence: ${decision.confidence})`);
            agentsUsed.push(decision.agent);

            // Execute
            const result = await agent.execute(currentContext);
            totalIterations++;

            // Check for handoff
            if (result.handoffTo && getAgentTypes().includes(result.handoffTo as AgentType)) {
                console.log(`[Router] Handoff to ${result.handoffTo}: ${result.handoffContext}`);
                currentContext = {
                    ...currentContext,
                    task: result.handoffContext || currentContext.task,
                    previousAgent: decision.agent,
                };
                preferredAgent = result.handoffTo as AgentType;
                maxHandoffs--;
                continue;
            }

            // Done
            return {
                ...result,
                agentsUsed,
                totalIterations,
            };
        }

        return {
            success: false,
            output: 'Max handoffs exceeded',
            toolsUsed: [],
            filesModified: [],
            agentsUsed,
            totalIterations,
            error: 'Too many agent handoffs',
        };
    }

    /**
     * Get agent info
     */
    getAgentInfo(type: AgentType): { name: string; description: string; tools: string[] } | null {
        const agent = this.agents.get(type);
        return agent?.info || null;
    }

    /**
     * List all agents
     */
    listAgents(): Array<{ type: AgentType; name: string; description: string }> {
        return getAgentTypes().map(type => {
            const info = this.getAgentInfo(type);
            return {
                type,
                name: info?.name || type,
                description: info?.description || '',
            };
        });
    }
}

// Singleton
export const router = new SmartRouter();
