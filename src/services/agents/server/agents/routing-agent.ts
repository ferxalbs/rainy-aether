/**
 * Routing Agent
 * 
 * LLM-based intelligent routing that combines:
 * - Pattern-based heuristics (fast path)
 * - AI-powered analysis (complex cases)
 * - Conversation context (history-aware)
 * - User preferences (learning)
 */

import { createAgent, gemini } from '@inngest/agent-kit';
import type { AgentKitAgentType } from './network';

// ===========================
// Types
// ===========================

export interface RoutingDecision {
    agent: AgentKitAgentType;
    confidence: number;
    reasoning: string;
    fallbackAgent?: AgentKitAgentType;
    suggestedPlan?: string[];
}

export interface RoutingContext {
    task: string;
    workspace?: string;
    currentFile?: string;
    recentAgents?: AgentKitAgentType[];
    conversationHistory?: string[];
    preferredAgent?: AgentKitAgentType;
}

export interface ConversationTurn {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    agentUsed?: AgentKitAgentType;
    toolsUsed?: string[];
}

// ===========================
// Routing Heuristics (Fast Path)
// ===========================

const ROUTING_PATTERNS: Record<AgentKitAgentType, {
    keywords: string[];
    patterns: RegExp[];
    weight: number;
}> = {
    planner: {
        keywords: ['plan', 'design', 'architect', 'how to', 'approach', 'strategy', 'analyze', 'breakdown', 'steps', 'roadmap'],
        patterns: [
            /how (should|can|do) (i|we)/i,
            /what('s| is) the best (way|approach)/i,
            /plan (for|to|the)/i,
            /break(down| this down)/i,
        ],
        weight: 1.0,
    },
    coder: {
        keywords: ['write', 'create', 'implement', 'add', 'code', 'fix', 'refactor', 'build', 'edit', 'modify', 'update', 'function', 'component'],
        patterns: [
            /create (a |an )?(new )?(file|component|function|class|module)/i,
            /implement (a |the )?/i,
            /add .+ to/i,
            /fix (the|this|a)/i,
            /write (a |the )?(code|function|class)/i,
        ],
        weight: 1.0,
    },
    reviewer: {
        keywords: ['review', 'check', 'audit', 'security', 'performance', 'improve', 'optimize', 'bugs', 'issues', 'quality'],
        patterns: [
            /review (this|the|my)/i,
            /check (for|this|the)/i,
            /find (bugs|issues|problems|errors)/i,
            /improve (the|this)/i,
        ],
        weight: 0.9,
    },
    terminal: {
        keywords: ['run', 'execute', 'test', 'build', 'deploy', 'install', 'git', 'npm', 'pnpm', 'cargo', 'command', 'shell', 'terminal'],
        patterns: [
            /run (the|a)?(\\s+)?test/i,
            /execute (the|this|a)?/i,
            /build (the|this)/i,
            /git (commit|push|pull|status|add)/i,
            /npm (install|run|build)/i,
        ],
        weight: 1.0,
    },
    docs: {
        keywords: ['explain', 'documentation', 'what is', 'how does', 'usage', 'example', 'help', 'understand', 'learn'],
        patterns: [
            /what (is|are|does)/i,
            /how does .+ work/i,
            /explain (this|the|how)/i,
            /show me (an )?example/i,
            /documentation (for|about)/i,
        ],
        weight: 0.8,
    },
};

/**
 * Fast heuristic routing using patterns and keywords
 */
export function routeByHeuristics(task: string): RoutingDecision {
    const lowerTask = task.toLowerCase();
    const scores: Map<AgentKitAgentType, { score: number; reasons: string[] }> = new Map();

    for (const [agentType, config] of Object.entries(ROUTING_PATTERNS)) {
        const agent = agentType as AgentKitAgentType;
        let score = 0;
        const reasons: string[] = [];

        // Check keywords
        for (const keyword of config.keywords) {
            if (lowerTask.includes(keyword)) {
                score += 1 * config.weight;
                reasons.push(`keyword: "${keyword}"`);
            }
        }

        // Check patterns
        for (const pattern of config.patterns) {
            if (pattern.test(task)) {
                score += 2 * config.weight;
                reasons.push(`pattern match`);
            }
        }

        scores.set(agent, { score, reasons });
    }

    // Find best match
    let bestAgent: AgentKitAgentType = 'planner';
    let bestScore = 0;
    let reasons: string[] = [];

    for (const [agent, data] of scores.entries()) {
        if (data.score > bestScore) {
            bestScore = data.score;
            bestAgent = agent;
            reasons = data.reasons;
        }
    }

    // Calculate confidence (0-1)
    const maxPossibleScore = 10;
    const confidence = Math.min(bestScore / maxPossibleScore, 1);

    return {
        agent: bestAgent,
        confidence,
        reasoning: reasons.length > 0
            ? `Matched: ${reasons.slice(0, 3).join(', ')}`
            : 'Default to planner for task analysis',
        fallbackAgent: bestAgent === 'planner' ? 'coder' : 'planner',
    };
}

// ===========================
// LLM-Based Routing Agent
// ===========================

const ROUTING_SYSTEM_PROMPT = `You are an intelligent task router for a coding assistant.

Your job is to analyze user tasks and decide which specialized agent should handle them.

## Available Agents

1. **planner** - For task analysis, planning, architecture design
   - Use when: User wants to plan, design, or understand how to approach something
   - Outputs: Step-by-step plans, architecture decisions

2. **coder** - For writing, editing, and refactoring code
   - Use when: User wants to create, modify, or fix code
   - Outputs: Code files, implementations

3. **reviewer** - For code review, security audit, optimization
   - Use when: User wants code checked for bugs, security, or performance
   - Outputs: Review comments, suggestions

4. **terminal** - For running commands, tests, builds
   - Use when: User wants to execute shell commands, run tests, git operations
   - Outputs: Command results, test outcomes

5. **docs** - For documentation lookup and explanation
   - Use when: User wants to understand APIs, libraries, or concepts
   - Outputs: Explanations, examples

## Response Format

Respond with a JSON object only:
{
  "agent": "agent_name",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "suggestedPlan": ["step1", "step2"] // Optional, for complex tasks
}

## Guidelines

- For ambiguous tasks, prefer "planner" to analyze first
- For simple direct requests, route directly to the appropriate agent
- Consider the conversation history if provided
- High confidence (>0.8) for clear, single-purpose tasks
- Lower confidence for ambiguous or multi-step tasks`;

/**
 * Create the routing agent using AgentKit
 */
export function createRoutingAgent() {
    return createAgent({
        name: 'routing-agent',
        description: 'Analyzes tasks and routes to the best specialized agent',
        system: ROUTING_SYSTEM_PROMPT,
        model: gemini({ model: 'gemini-3-flash-preview' }),
        tools: [], // No tools needed, just analysis
    });
}

/**
 * Route using LLM analysis for complex cases
 */
export async function routeByLLM(context: RoutingContext): Promise<RoutingDecision> {
    const agent = createRoutingAgent();

    // Build context message
    let prompt = `Task: ${context.task}`;

    if (context.currentFile) {
        prompt += `\nCurrent file: ${context.currentFile}`;
    }

    if (context.recentAgents && context.recentAgents.length > 0) {
        prompt += `\nRecent agents used: ${context.recentAgents.join(', ')}`;
    }

    if (context.conversationHistory && context.conversationHistory.length > 0) {
        prompt += `\nRecent conversation:\n${context.conversationHistory.slice(-3).join('\n')}`;
    }

    try {
        const result = await agent.run(prompt);

        // Extract response text
        let responseText = '';
        for (const msg of result.output) {
            if (msg.type === 'text') {
                const textMsg = msg as { type: 'text'; content: string | unknown[] };
                if (typeof textMsg.content === 'string') {
                    responseText += textMsg.content;
                }
            }
        }

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as {
                agent?: string;
                confidence?: number;
                reasoning?: string;
                suggestedPlan?: string[];
            };

            const validAgents: AgentKitAgentType[] = ['planner', 'coder', 'reviewer', 'terminal', 'docs'];
            const agent = validAgents.includes(parsed.agent as AgentKitAgentType)
                ? (parsed.agent as AgentKitAgentType)
                : 'planner';

            return {
                agent,
                confidence: parsed.confidence || 0.7,
                reasoning: parsed.reasoning || 'LLM routing decision',
                suggestedPlan: parsed.suggestedPlan,
                fallbackAgent: agent === 'planner' ? 'coder' : 'planner',
            };
        }
    } catch (error) {
        console.error('[RoutingAgent] LLM routing failed:', error);
    }

    // Fallback to heuristics
    return routeByHeuristics(context.task);
}

// ===========================
// Hybrid Router
// ===========================

export interface HybridRouterConfig {
    llmThreshold: number; // Use LLM if heuristic confidence < this
    preferredAgent?: AgentKitAgentType;
    useLLM: boolean;
}

const DEFAULT_CONFIG: HybridRouterConfig = {
    llmThreshold: 0.6,
    useLLM: true,
};

/**
 * Hybrid router that combines heuristics with LLM
 * - Uses fast heuristics first
 * - Falls back to LLM for ambiguous cases
 */
export async function hybridRoute(
    context: RoutingContext,
    config: Partial<HybridRouterConfig> = {}
): Promise<RoutingDecision> {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // If preferred agent specified, use it
    if (context.preferredAgent) {
        return {
            agent: context.preferredAgent,
            confidence: 1.0,
            reasoning: 'User preferred agent',
        };
    }

    // Try heuristics first (fast path)
    const heuristicResult = routeByHeuristics(context.task);

    // If confident enough, use heuristic result
    if (heuristicResult.confidence >= cfg.llmThreshold) {
        return {
            ...heuristicResult,
            reasoning: `[Heuristic] ${heuristicResult.reasoning}`,
        };
    }

    // Use LLM for complex/ambiguous cases
    if (cfg.useLLM) {
        const llmResult = await routeByLLM(context);
        return {
            ...llmResult,
            reasoning: `[LLM] ${llmResult.reasoning}`,
        };
    }

    // Fallback to heuristic result
    return heuristicResult;
}

// ===========================
// Exports
// ===========================

export { createRoutingAgent as default };
