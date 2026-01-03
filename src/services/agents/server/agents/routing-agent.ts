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
import { subagentRegistry } from '../registry/SubagentRegistry';
import type { SubagentConfig } from '../types/SubagentConfig';

// ===========================
// Types
// ===========================

export interface RoutingDecision {
    agent: AgentKitAgentType | string; // AgentKitAgentType or custom subagent ID
    confidence: number;
    reasoning: string;
    fallbackAgent?: AgentKitAgentType | string;
    suggestedPlan?: string[];
    isCustomAgent?: boolean; // True if routing to custom subagent
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
// Custom Subagent Integration
// ===========================

let cachedCustomAgents: SubagentConfig[] = [];
let lastLoadTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Load custom subagents from registry (with caching)
 */
async function loadCustomSubagents(): Promise<SubagentConfig[]> {
    const now = Date.now();
    if (cachedCustomAgents.length > 0 && now - lastLoadTime < CACHE_TTL_MS) {
        return cachedCustomAgents;
    }

    try {
        cachedCustomAgents = subagentRegistry.getEnabled();
        lastLoadTime = now;
        console.log(`[RoutingAgent] Loaded ${cachedCustomAgents.length} custom subagents`);
        return cachedCustomAgents;
    } catch (error) {
        console.error('[RoutingAgent] Failed to load custom subagents:', error);
        return [];
    }
}

/**
 * Match task against custom subagent patterns
 */
function matchCustomAgents(task: string): Array<{ agent: SubagentConfig; score: number; reasons: string[] }> {
    const lowerTask = task.toLowerCase();
    const matches: Array<{ agent: SubagentConfig; score: number; reasons: string[] }> = [];

    for (const agent of cachedCustomAgents) {
        let score = 0;
        const reasons: string[] = [];

        // Check keywords
        for (const keyword of agent.keywords) {
            if (lowerTask.includes(keyword.toLowerCase())) {
                score += 1 * (agent.priority / 100);
                reasons.push(`keyword: "${keyword}"`);
            }
        }

        // Check regex patterns
        for (const patternStr of agent.patterns) {
            try {
                const pattern = new RegExp(patternStr, 'i');
                if (pattern.test(task)) {
                    score += 2 * (agent.priority / 100);
                    reasons.push(`pattern match`);
                }
            } catch (error) {
                // Invalid regex, skip
                console.warn(`[RoutingAgent] Invalid pattern for ${agent.id}: ${patternStr}`);
            }
        }

        if (score > 0) {
            matches.push({ agent, score, reasons });
        }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
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
 * Includes custom subagents in matching
 */
export async function routeByHeuristics(task: string): Promise<RoutingDecision> {
    // Load custom subagents
    await loadCustomSubagents();

    // Check custom agents first (they may have higher priority)
    const customMatches = matchCustomAgents(task);
    if (customMatches.length > 0) {
        const best = customMatches[0];
        const maxPossibleScore = 10;
        const confidence = Math.min(best.score / maxPossibleScore, 1);

        // If confidence is high enough, use custom agent
        if (confidence >= 0.5) {
            return {
                agent: best.agent.id,
                confidence,
                reasoning: `Custom agent "${best.agent.name}": ${best.reasons.slice(0, 3).join(', ')}`,
                fallbackAgent: 'planner',
                isCustomAgent: true,
            };
        }
    }
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
        isCustomAgent: false,
    };
}

// ===========================
// LLM-Based Routing Agent
// ===========================

/**
 * Generate routing system prompt including custom agents
 */
function generateRoutingPrompt(customAgents: SubagentConfig[]): string {
    let prompt = `You are an intelligent task router for a coding assistant.

Your job is to analyze user tasks and decide which specialized agent should handle them.

## Built-in Agents

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
   - Outputs: Explanations, examples`;

    // Add custom agents if any
    if (customAgents.length > 0) {
        prompt += `\n\n## Custom Agents\n`;
        for (let i = 0; i < customAgents.length; i++) {
            const agent = customAgents[i];
            prompt += `\n${i + 6}. **${agent.id}** - ${agent.description}`;
            if (agent.keywords.length > 0) {
                prompt += `\n   - Keywords: ${agent.keywords.slice(0, 5).join(', ')}`;
            }
            prompt += `\n   - Priority: ${agent.priority}/100`;
        }
    }

    prompt += `

\n\n## Response Format\n\nRespond with a JSON object only:\n{\n  \"agent\": \"agent_name_or_id\",\n  \"confidence\": 0.0-1.0,\n  \"reasoning\": \"Brief explanation\",\n  \"suggestedPlan\": [\"step1\", \"step2\"] // Optional, for complex tasks\n}\n\n## Guidelines\n\n- For ambiguous tasks, prefer \"planner\" to analyze first\n- For simple direct requests, route directly to the appropriate agent\n- Consider custom agents if they match the task description well\n- Use custom agent IDs (kebab-case) when routing to custom agents\n- High confidence (>0.8) for clear, single-purpose tasks\n- Lower confidence for ambiguous or multi-step tasks`;

    return prompt;
}

/**
 * Create the routing agent using AgentKit with dynamic prompt
 */
export async function createRoutingAgent() {
    await loadCustomSubagents();
    const prompt = generateRoutingPrompt(cachedCustomAgents);

    return createAgent({
        name: 'routing-agent',
        description: 'Analyzes tasks and routes to the best specialized agent',
        system: prompt,
        model: gemini({ model: 'gemini-3-flash-preview' }),
        tools: [], // No tools needed, just analysis
    });
}

/**
 * Route using LLM analysis for complex cases
 * Includes custom subagents in decision
 */
export async function routeByLLM(context: RoutingContext): Promise<RoutingDecision> {
    const agent = await createRoutingAgent();

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
            const isBuiltIn = validAgents.includes(parsed.agent as AgentKitAgentType);
            const isCustom = cachedCustomAgents.some(a => a.id === parsed.agent);

            let finalAgent: AgentKitAgentType | string;
            let isCustomAgent = false;

            if (isBuiltIn) {
                finalAgent = parsed.agent as AgentKitAgentType;
            } else if (isCustom) {
                finalAgent = parsed.agent as string;
                isCustomAgent = true;
            } else {
                // Unknown agent, default to planner
                finalAgent = 'planner';
            }

            return {
                agent: finalAgent,
                confidence: parsed.confidence || 0.7,
                reasoning: parsed.reasoning || 'LLM routing decision',
                suggestedPlan: parsed.suggestedPlan,
                fallbackAgent: isCustomAgent ? 'planner' : (finalAgent === 'planner' ? 'coder' : 'planner'),
                isCustomAgent,
            };
        }
    } catch (error) {
        console.error('[RoutingAgent] LLM routing failed:', error);
    }

    // Fallback to heuristics
    return await routeByHeuristics(context.task);
}

// ===========================
// Hybrid Router
// ===========================

export interface HybridRouterConfig {
    llmThreshold: number; // Use LLM if heuristic confidence < this
    preferredAgent?: AgentKitAgentType | string; // Can be custom agent ID
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
        await loadCustomSubagents();
        const isCustom = cachedCustomAgents.some(a => a.id === context.preferredAgent);

        return {
            agent: context.preferredAgent,
            confidence: 1.0,
            reasoning: 'User preferred agent',
            isCustomAgent: isCustom,
        };
    }

    // Try heuristics first (fast path)
    const heuristicResult = await routeByHeuristics(context.task);

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
